import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { ChoiceChipsComponent, ChoiceOption } from '../../../components/choice-chips/choice-chips.component';
import { IconComponent } from '../../../components/icon/icon.component';
import { MemberLineComponent } from '../../../components/member-line/member-line.component';
import { errorMessage } from '../../../core/api/api-client.service';
import { LoansApi } from '../../../core/api/loans.api';
import { AuthService } from '../../../core/auth/auth.service';
import { Loan } from '../../../core/models/loan.model';
import { formatDayMonth, formatLong, formatTime, isoDate, today } from '../../../utils/dates';
import { formatPhone, plural } from '../../../utils/format';
import { freshKeys } from '../../../utils/motion';
import { DeskService } from '../../desk/desk.service';

type StatusFilter = 'all' | 'loan' | 'returned';

const FILTERS: ChoiceOption<StatusFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'loan', label: 'On loan' },
  { value: 'returned', label: 'Returned' },
];

/** Today's loans: counts, a filter, and a table with a Return button per book still out. */
@Component({
  selector: 'app-borrowed-today',
  imports: [ChoiceChipsComponent, IconComponent, MemberLineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './borrowed-today.component.html',
  host: { class: 'card px-[22px] py-5', 'aria-labelledby': 'today-heading', role: 'region' },
})
export class BorrowedTodayComponent {
  protected readonly auth = inject(AuthService);
  protected readonly desk = inject(DeskService);
  private readonly loansApi = inject(LoansApi);

  /** Books returned today, from any day's loans. */
  readonly checkedInToday = input(0);

  protected readonly loans = signal<Loan[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly filter = signal<StatusFilter>('all');
  protected readonly search = signal('');
  /** Rows lent or returned since the last load; they flash once so the librarian sees the save land. */
  protected readonly fresh = signal<ReadonlySet<string>>(new Set());
  private seen: Set<string> | null = null;

  protected readonly filters = FILTERS;
  protected readonly todayLabel = formatLong(today());

  protected readonly onLoanCount = computed(() => this.loans().filter((loan) => !loan.returnedAt).length);
  protected readonly returnedCount = computed(() => this.loans().filter((loan) => loan.returnedAt).length);
  protected readonly rows = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.loans().filter((loan) => {
      if (this.filter() === 'loan' && loan.returnedAt) return false;
      if (this.filter() === 'returned' && !loan.returnedAt) return false;
      return !query || [loan.memberName, loan.title, loan.author, loan.bookCode].some((text) => text?.toLowerCase().includes(query));
    });
  });

  protected readonly formatTime = formatTime;
  protected readonly formatDayMonth = formatDayMonth;
  protected readonly formatPhone = formatPhone;
  protected readonly plural = plural;

  constructor() {
    // Reload after every save at the desk.
    effect(() => {
      this.desk.changes();
      untracked(() => void this.load());
    });
  }

  /** Changes when a loan is lent or returned, so either flashes the row. */
  protected rowKey(loan: Loan): string {
    return `${loan.transactionId}:${loan.returnedAt ? 'back' : 'out'}`;
  }

  protected status(loan: Loan): { text: string; pillClass: string } {
    if (loan.returnedAt) return { text: 'Returned', pillClass: 'pill-ok' };
    if (loan.status === 'OVERDUE') return { text: 'Overdue', pillClass: 'pill-bad' };
    return { text: 'On loan', pillClass: 'pill-loan' };
  }

  protected returnBook(loan: Loan): void {
    this.desk.openReturn({
      memberId: loan.memberId,
      memberName: loan.memberName,
      memberPhone: loan.memberPhone,
      transactionId: loan.transactionId,
    });
  }

  protected changeFilter(filter: StatusFilter | null): void {
    if (filter) this.filter.set(filter);
  }

  protected typed(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  private async load(): Promise<void> {
    if (!this.auth.can('loans.view')) {
      this.loading.set(false);
      return;
    }
    try {
      const loans = await this.loansApi.find({ borrowedOn: isoDate(today()), limit: 200 });
      const keys = loans.map((loan) => this.rowKey(loan));
      this.fresh.set(freshKeys(this.seen, keys));
      this.seen = new Set(keys);
      // Forget them after the flash, so filtering later doesn't replay it.
      if (this.fresh().size) setTimeout(() => this.fresh.set(new Set()), 2600);
      this.loans.set(loans);
      this.error.set('');
    } catch (err) {
      this.error.set(errorMessage(err, "Couldn't load today's loans."));
    } finally {
      this.loading.set(false);
    }
  }
}
