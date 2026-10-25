import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { AlertComponent } from '../../components/alert/alert.component';
import { BookLineComponent } from '../../components/book-line/book-line.component';
import { ChoiceChipsComponent, ChoiceOption } from '../../components/choice-chips/choice-chips.component';
import { DrawerComponent } from '../../components/drawer/drawer.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { StepComponent } from '../../components/step/step.component';
import { SummaryTileComponent } from '../../components/summary-tile/summary-tile.component';
import { ToastService } from '../../components/toast/toast.service';
import { TypeaheadComponent } from '../../components/typeahead/typeahead.component';
import { errorMessage } from '../../core/api/api-client.service';
import { LoansApi } from '../../core/api/loans.api';
import { AuthService } from '../../core/auth/auth.service';
import { Loan } from '../../core/models/loan.model';
import { Member } from '../../core/models/member.model';
import { dueState, formatMedium, today } from '../../utils/dates';
import { formatPhone, plural } from '../../utils/format';
import { Borrower, DeskService, ReturnPrefill } from '../desk/desk.service';
import { MemberPickerComponent } from '../desk/member-picker/member-picker.component';
import { SummaryStore } from '../desk/summary.store';
import { LoanChecklistComponent } from './loan-checklist/loan-checklist.component';
import { ReturnForm } from './return.form';

type FindBy = 'member' | 'book';

const FIND_BY_OPTIONS: ChoiceOption<FindBy>[] = [
  { value: 'member', label: 'By member' },
  { value: 'book', label: 'By book' },
];

/**
 * Return books: find who is returning (by member, or by a book's title or code), tick the books
 * handed back with their condition, save. The rules live in ReturnForm.
 */
@Component({
  selector: 'app-return-drawer',
  imports: [
    DrawerComponent, StepComponent, TypeaheadComponent, BookLineComponent, ChoiceChipsComponent, AlertComponent,
    EmptyStateComponent, SummaryTileComponent, MemberPickerComponent, LoanChecklistComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './return-drawer.component.html',
})
export class ReturnDrawerComponent {
  protected readonly desk = inject(DeskService);
  protected readonly auth = inject(AuthService);
  protected readonly summary = inject(SummaryStore);
  private readonly loansApi = inject(LoansApi);
  private readonly toast = inject(ToastService);

  protected readonly form = new ReturnForm();
  protected readonly findBy = signal<FindBy>('member');
  protected readonly pickedMember = signal<Member | null>(null);
  protected readonly bookSearchText = signal('');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly findByOptions = FIND_BY_OPTIONS;
  protected readonly todayLabel = formatMedium(today());

  private readonly memberPicker = viewChild(MemberPickerComponent);
  private readonly bookField = viewChild<TypeaheadComponent<Loan>>('bookField');
  /** Ignores slow answers when the librarian has already moved on to someone else. */
  private latestLoad = 0;

  protected readonly isOpen = computed(() => this.desk.open() === 'return');
  protected readonly listHint = computed(() => {
    if (!this.form.borrower() || this.loading()) return 'Tick each book handed back';
    const count = this.form.loans().length;
    return count ? `${plural(count, 'book')} on loan · tick the ones handed back` : 'Nothing on loan';
  });

  protected readonly searchLoans = (query: string) => this.loansApi.find({ status: 'ACTIVE', q: query, limit: 8 });
  protected readonly dueState = dueState;
  protected readonly formatPhone = formatPhone;
  protected readonly plural = plural;

  constructor() {
    effect(() => {
      if (!this.isOpen()) return;
      const prefill = this.desk.returnPrefill();
      untracked(() => {
        if (prefill) {
          this.applyPrefill(prefill);
        } else if (!this.form.borrower()) {
          setTimeout(() => this.focusSearch(), 230);
        }
      });
    });
  }

  protected changeFindBy(mode: FindBy | null): void {
    if (!mode || mode === this.findBy()) return;
    this.findBy.set(mode);
    this.clearSearch();
    setTimeout(() => this.focusSearch());
  }

  protected onMemberPicked(member: Member | null): void {
    this.pickedMember.set(member);
    if (!member) {
      this.form.reset();
      return;
    }
    this.form.setBorrower({ memberId: member.id, name: member.fullName, phone: member.phone });
    void this.loadLoans(member.id);
  }

  protected onLoanPicked(loan: Loan): void {
    this.bookSearchText.set(`${loan.title} · ${loan.bookCode}`);
    this.showBorrowerOf(loan);
  }

  /** The member wants more time rather than handing the books back: switch to the Extend drawer. */
  protected extendInstead(): void {
    const borrower = this.form.borrower();
    if (!borrower) return;
    const loan = this.form.chosen()[0] ?? this.form.loans()[0];
    this.clearSearch();
    this.desk.openExtend({
      memberId: borrower.memberId,
      memberName: borrower.name,
      memberPhone: borrower.phone,
      transactionId: loan.transactionId,
    });
  }

  protected cancel(): void {
    this.clearSearch();
    this.desk.close();
  }

  /** Saves the return. `next` keeps the drawer open for the next member. */
  protected async save(next: boolean): Promise<void> {
    const borrower = this.form.borrower();
    if (!borrower || !this.form.canSave()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const returned = await this.loansApi.receive(this.form.toRequest());
      const damaged = returned.filter((loan) => loan.returnCondition === 'DAMAGED').length;
      this.desk.saved();
      this.clearSearch();
      this.toast.show(
        `Checked in ${plural(returned.length, 'book')} from ${borrower.name}.` +
          (damaged ? ` ${damaged} marked damaged and kept off the shelf.` : '') +
          (next ? ' Ready for the next member.' : ''),
      );
      if (next) {
        setTimeout(() => this.focusSearch());
      } else {
        this.desk.close();
      }
    } catch (err) {
      this.error.set(errorMessage(err, 'Could not save. Please try again.'));
    } finally {
      this.saving.set(false);
    }
  }

  /** Opened from a "Return" button on a loan: show that member's loans with this one ticked. */
  private applyPrefill(prefill: ReturnPrefill): void {
    this.desk.returnPrefill.set(null);
    this.clearSearch();
    this.findBy.set('book');
    this.showBorrowerOf({
      transactionId: prefill.transactionId,
      memberId: prefill.memberId,
      memberName: prefill.memberName,
      memberPhone: prefill.memberPhone,
    });
  }

  private showBorrowerOf(loan: Pick<Loan, 'transactionId' | 'memberId' | 'memberName' | 'memberPhone'>): void {
    const borrower: Borrower = { memberId: loan.memberId, name: loan.memberName, phone: loan.memberPhone };
    this.form.setBorrower(borrower);
    if (loan.memberId) {
      void this.loadLoans(loan.memberId, loan.transactionId);
    } else {
      // Old online request without a member record: find just this loan.
      void this.loadLoans(null, loan.transactionId, loan.memberName);
    }
  }

  private async loadLoans(memberId: number | null, tick: number | null = null, name = ''): Promise<void> {
    const loadId = ++this.latestLoad;
    this.loading.set(true);
    this.error.set('');
    try {
      let loans = memberId
        ? await this.loansApi.find({ status: 'ACTIVE', memberId, limit: 50 })
        : await this.loansApi.find({ status: 'ACTIVE', q: name, limit: 50 });
      if (!memberId) loans = loans.filter((loan) => loan.transactionId === tick);
      if (loadId === this.latestLoad) this.form.showLoans(loans, tick);
    } catch (err) {
      if (loadId === this.latestLoad) this.error.set(errorMessage(err, 'Could not load their loans.'));
    } finally {
      if (loadId === this.latestLoad) this.loading.set(false);
    }
  }

  private clearSearch(): void {
    this.memberPicker()?.reset();
    this.pickedMember.set(null);
    this.bookSearchText.set('');
    this.form.reset();
    this.error.set('');
  }

  private focusSearch(): void {
    if (this.findBy() === 'member') {
      this.memberPicker()?.focus();
    } else {
      this.bookField()?.focus();
    }
  }
}
