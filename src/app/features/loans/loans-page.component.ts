import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { AlertComponent } from '../../components/alert/alert.component';
import { IconComponent } from '../../components/icon/icon.component';
import { MemberLineComponent } from '../../components/member-line/member-line.component';
import { ToastService } from '../../components/toast/toast.service';
import { errorMessage } from '../../core/api/api-client.service';
import { LoansApi } from '../../core/api/loans.api';
import { AuthService } from '../../core/auth/auth.service';
import { Loan, LoanSummary, RegisterPeriod, RegisterSort, RegisterTab } from '../../core/models/loan.model';
import { formatDayMonth, formatShort, today } from '../../utils/dates';
import { formatPhone, plural } from '../../utils/format';
import { DeskService } from '../desk/desk.service';
import { PERIODS, SORTS, TABS, defaultSort, loanState, remindedLabel, reminderMessage, tabFromSlug } from './loan-register';

const PAGE_SIZE = 25;
const SEARCH_DELAY_MS = 300;

/** A reminder that couldn't go to the clipboard, shown in a box to copy by hand. */
interface ManualReminder {
  text: string;
  to: string;
}

/**
 * Every loan: totals, tabs (On loan, Overdue, Returned, All), search, filters and sort, 25 rows at a time.
 * Rows can be returned (opens the return drawer), renewed once, or get a copied overdue reminder.
 */
@Component({
  selector: 'app-loans-page',
  imports: [AlertComponent, IconComponent, MemberLineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loans-page.component.html',
  styleUrl: './loans-page.component.css',
  host: { class: 'flex flex-col gap-[18px]' },
})
export class LoansPageComponent {
  protected readonly auth = inject(AuthService);
  protected readonly desk = inject(DeskService);
  private readonly loansApi = inject(LoansApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs = TABS;
  protected readonly periods = PERIODS;
  protected readonly sorts = SORTS;

  /** The tab comes from the link (?tab=overdue), so "Overdue Reminders" in the menu opens it. */
  protected readonly tab = toSignal(this.route.queryParamMap.pipe(map((params) => tabFromSlug(params.get('tab')))), {
    initialValue: 'ACTIVE' as RegisterTab,
  });
  protected readonly searchText = signal('');
  /** The search actually sent, a moment after typing stops. */
  private readonly search = signal('');
  protected readonly period = signal<RegisterPeriod>('ANY');
  protected readonly sort = signal<RegisterSort>('DUE');

  protected readonly loans = signal<Loan[]>([]);
  protected readonly total = signal(0);
  protected readonly summary = signal<LoanSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal('');
  /** The row whose Renew or Copy reminder is running. */
  protected readonly busyId = signal<number | null>(null);
  protected readonly manualReminder = signal<ManualReminder | null>(null);

  protected readonly today = today();
  protected readonly rows = computed(() =>
    this.loans().map((loan) => ({
      loan,
      state: loanState(loan, this.today),
      reminded: remindedLabel(loan, this.today),
      phone: loan.memberPhone ? formatPhone(loan.memberPhone) : 'No phone saved',
      borrowed: formatDayMonth(loan.borrowedAt),
      due: formatDayMonth(loan.dueDate),
      returned: loan.returnedAt ? formatDayMonth(loan.returnedAt) : '',
    })),
  );
  protected readonly tabCounts = computed((): Record<RegisterTab, number | null> => {
    const s = this.summary();
    return { ACTIVE: s?.onLoan ?? null, OVERDUE: s?.overdue ?? null, RETURNED: s?.returned ?? null, ALL: s?.total ?? null };
  });
  protected readonly hasMore = computed(() => this.loans().length < this.total());
  protected readonly isFiltered = computed(() => !!this.search() || this.period() !== 'ANY');
  protected readonly emptyText = computed(() => {
    if (this.tab() === 'OVERDUE' && !this.isFiltered()) {
      return 'Nothing is overdue. Every book is back or still within its loan period.';
    }
    return this.isFiltered() ? 'No loans match. Try another name, or widen the date range.' : 'No loans here yet.';
  });

  private readonly reminderBox = viewChild<ElementRef<HTMLTextAreaElement>>('reminderText');
  private searchTimer?: ReturnType<typeof setTimeout>;
  /** Answers to an older search are dropped when a newer one has been sent. */
  private ticket = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));

    // Each tab opens in its natural order.
    effect(() => {
      const tab = this.tab();
      untracked(() => this.sort.set(defaultSort(tab)));
    });
    // Reload the first page whenever the tab or a filter changes.
    effect(() => {
      this.tab();
      this.search();
      this.period();
      this.sort();
      untracked(() => void this.load());
    });
    // And the numbers, now and after any desk drawer saves (a loan or return changes them).
    effect(() => {
      this.desk.changes();
      untracked(() => {
        void this.loadSummary();
        if (this.desk.changes() > 0) void this.load();
      });
    });
  }

  protected selectTab(tab: RegisterTab): void {
    const slug = TABS.find((t) => t.value === tab)?.slug;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: slug === 'on-loan' ? null : slug }, replaceUrl: true });
  }

  protected typeSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.search.set(value.trim()), SEARCH_DELAY_MS);
  }

  protected selectPeriod(event: Event): void {
    this.period.set((event.target as HTMLSelectElement).value as RegisterPeriod);
  }

  protected selectSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as RegisterSort);
  }

  protected clearFilters(): void {
    clearTimeout(this.searchTimer);
    this.searchText.set('');
    this.search.set('');
    this.period.set('ANY');
  }

  protected returnBook(loan: Loan): void {
    this.desk.openReturn({
      memberId: loan.memberId,
      memberName: loan.memberName,
      memberPhone: loan.memberPhone,
      transactionId: loan.transactionId,
    });
  }

  protected async renew(loan: Loan): Promise<void> {
    if (this.busyId() !== null) return;
    this.busyId.set(loan.transactionId);
    try {
      const renewed = await this.loansApi.renew(loan.transactionId);
      this.replace(renewed);
      this.toast.show(`Renewed “${renewed.title}” for ${firstName(renewed)}. Now due back ${formatShort(renewed.dueDate)}.`);
      void this.loadSummary();
    } catch (err) {
      this.toast.show(errorMessage(err, 'Couldn’t renew this book. Please try again.'));
    } finally {
      this.busyId.set(null);
    }
  }

  /** Copies the reminder text, then records that it was sent. Without clipboard access, shows it to copy by hand. */
  protected async remind(loan: Loan): Promise<void> {
    if (this.busyId() !== null) return;
    this.busyId.set(loan.transactionId);
    const text = reminderMessage(loan, this.today);
    const phone = loan.memberPhone ? formatPhone(loan.memberPhone) : '';
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      this.manualReminder.set({ text, to: `To ${loan.memberName}${phone ? ` · ${phone}` : ''}` });
      setTimeout(() => this.reminderBox()?.nativeElement.select());
    }
    try {
      this.replace(await this.loansApi.markReminded(loan.transactionId));
      if (copied) {
        this.toast.show(`Reminder for ${firstName(loan)} copied. Paste it into an SMS or WhatsApp${phone ? ` to ${phone}` : ''}.`);
      }
    } catch (err) {
      this.toast.show(errorMessage(err, 'The reminder was copied, but couldn’t be recorded.'));
    } finally {
      this.busyId.set(null);
    }
  }

  protected async showMore(): Promise<void> {
    if (this.loadingMore()) return;
    this.loadingMore.set(true);
    const ticket = this.ticket;
    try {
      const page = await this.loansApi.register(this.query(this.loans().length));
      if (ticket !== this.ticket) return;
      // Skip any row already shown, in case loans shifted between pages.
      const shown = new Set(this.loans().map((l) => l.transactionId));
      this.loans.update((list) => [...list, ...page.items.filter((l) => !shown.has(l.transactionId))]);
      this.total.set(page.total);
    } catch (err) {
      this.toast.show(errorMessage(err, 'Couldn’t load more loans. Please try again.'));
    } finally {
      this.loadingMore.set(false);
    }
  }

  protected async load(): Promise<void> {
    const ticket = ++this.ticket;
    this.loading.set(true);
    this.error.set('');
    try {
      const page = await this.loansApi.register(this.query(0));
      if (ticket !== this.ticket) return;
      this.loans.set(page.items);
      this.total.set(page.total);
    } catch (err) {
      if (ticket === this.ticket) this.error.set(errorMessage(err, 'Couldn’t load the loans. Please try again.'));
    } finally {
      if (ticket === this.ticket) this.loading.set(false);
    }
  }

  private async loadSummary(): Promise<void> {
    try {
      this.summary.set(await this.loansApi.summary());
    } catch {
      // The table still works; the numbers show dashes.
    }
  }

  private query(offset: number) {
    return {
      status: this.tab(),
      q: this.search() || undefined,
      borrowed: this.period(),
      sort: this.sort(),
      offset,
      limit: PAGE_SIZE,
    };
  }

  private replace(updated: Loan): void {
    this.loans.update((list) => list.map((l) => (l.transactionId === updated.transactionId ? updated : l)));
  }

  protected readonly plural = plural;
}

function firstName(loan: Loan): string {
  return loan.memberName.trim().split(/\s+/)[0];
}
