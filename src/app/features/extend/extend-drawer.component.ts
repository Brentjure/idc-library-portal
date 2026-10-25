import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { AlertComponent } from '../../components/alert/alert.component';
import { BookLineComponent } from '../../components/book-line/book-line.component';
import { ChoiceChipsComponent } from '../../components/choice-chips/choice-chips.component';
import { DrawerComponent } from '../../components/drawer/drawer.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { MemberLineComponent } from '../../components/member-line/member-line.component';
import { StepComponent } from '../../components/step/step.component';
import { SummaryTileComponent } from '../../components/summary-tile/summary-tile.component';
import { ToastService } from '../../components/toast/toast.service';
import { errorMessage } from '../../core/api/api-client.service';
import { LoansApi } from '../../core/api/loans.api';
import { dueState, formatMedium, formatShort, today } from '../../utils/dates';
import { formatPhone, plural } from '../../utils/format';
import { EXTENSION_WEEKS } from '../desk/desk-rules';
import { DeskService, ReturnPrefill } from '../desk/desk.service';
import { ExtendForm } from './extend.form';

/**
 * Extend loans: a member asks for more time, also when a book is already overdue. Tick their books, choose
 * +1, +2 or +3 weeks, save. Opened from a loan (Loans page, Return drawer, a member's details). Rules in ExtendForm.
 */
@Component({
  selector: 'app-extend-drawer',
  imports: [
    DrawerComponent, StepComponent, BookLineComponent, MemberLineComponent, ChoiceChipsComponent, AlertComponent,
    EmptyStateComponent, SummaryTileComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './extend-drawer.component.html',
  styleUrl: './extend-drawer.component.css',
})
export class ExtendDrawerComponent {
  protected readonly desk = inject(DeskService);
  private readonly loansApi = inject(LoansApi);
  private readonly toast = inject(ToastService);

  protected readonly form = new ExtendForm();
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly weekOptions = EXTENSION_WEEKS;
  protected readonly todayLabel = formatMedium(today());
  /** Ignores slow answers when the drawer was reopened for someone else. */
  private latestLoad = 0;

  protected readonly isOpen = computed(() => this.desk.open() === 'extend');
  protected readonly listHint = computed(() => {
    if (this.loading()) return 'Looking up their loans…';
    const count = this.form.loans().length;
    return count ? 'Tick each book that needs more time' : 'Nothing on loan';
  });

  protected readonly dueState = dueState;
  protected readonly formatShort = formatShort;
  protected readonly formatPhone = formatPhone;
  protected readonly plural = plural;

  constructor() {
    effect(() => {
      if (!this.isOpen()) return;
      const prefill = this.desk.extendPrefill();
      if (prefill) untracked(() => this.applyPrefill(prefill));
    });
  }

  protected setNote(event: Event): void {
    this.form.note.set((event.target as HTMLTextAreaElement).value);
  }

  protected cancel(): void {
    this.form.reset();
    this.error.set('');
    this.desk.close();
  }

  protected async save(): Promise<void> {
    const borrower = this.form.borrower();
    if (!borrower || !this.form.canSave() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const extended = await this.loansApi.extend(this.form.toRequest());
      this.desk.saved();
      const latest = extended.map((loan) => loan.dueDate).sort().at(-1)!;
      this.toast.show(
        extended.length === 1
          ? `Extended “${extended[0].title}” for ${this.form.firstName()}. Now due back ${formatShort(latest)}.`
          : `Extended ${plural(extended.length, 'book')} for ${this.form.firstName()}. Due back by ${formatShort(latest)}.`,
      );
      this.form.reset();
      this.desk.close();
    } catch (err) {
      this.error.set(errorMessage(err, 'Could not extend. Please try again.'));
    } finally {
      this.saving.set(false);
    }
  }

  private applyPrefill(prefill: ReturnPrefill): void {
    this.desk.extendPrefill.set(null);
    this.error.set('');
    this.form.setBorrower({ memberId: prefill.memberId, name: prefill.memberName, phone: prefill.memberPhone });
    void this.loadLoans(prefill);
  }

  private async loadLoans(prefill: ReturnPrefill): Promise<void> {
    const loadId = ++this.latestLoad;
    this.loading.set(true);
    try {
      let loans = prefill.memberId
        ? await this.loansApi.find({ status: 'ACTIVE', memberId: prefill.memberId, limit: 50 })
        : await this.loansApi.find({ status: 'ACTIVE', q: prefill.memberName, limit: 50 });
      // Old online request without a member record: only the loan it was opened from.
      if (!prefill.memberId) loans = loans.filter((loan) => loan.transactionId === prefill.transactionId);
      if (loadId === this.latestLoad) this.form.showLoans(loans, prefill.transactionId);
    } catch (err) {
      if (loadId === this.latestLoad) this.error.set(errorMessage(err, 'Could not load their loans.'));
    } finally {
      if (loadId === this.latestLoad) this.loading.set(false);
    }
  }
}
