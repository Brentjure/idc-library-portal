import { computed, signal } from '@angular/core';
import { Loan, ReturnCondition, ReturnedBook } from '../../core/models/loan.model';
import { dueState } from '../../utils/dates';
import { Borrower } from '../desk/desk.service';

/**
 * State and rules of the Return drawer: whose books are listed, which ones were handed back,
 * and the condition of each. Plain signals with no HTTP or DOM, so it is easy to test.
 */
export class ReturnForm {
  readonly borrower = signal<Borrower | null>(null);
  readonly loans = signal<Loan[]>([]);
  /** Ticked books: transactionId → condition. */
  readonly selected = signal<Record<number, ReturnCondition>>({});

  readonly chosen = computed(() => this.loans().filter((loan) => this.selected()[loan.transactionId]));
  readonly allChosen = computed(() => this.loans().length > 0 && this.chosen().length === this.loans().length);
  readonly lateCount = computed(() => this.chosen().filter((loan) => dueState(loan.dueDate).late).length);
  readonly firstName = computed(() => this.borrower()?.name.split(' ')[0] ?? '');
  readonly canSave = computed(() => this.chosen().length > 0);

  setBorrower(borrower: Borrower | null): void {
    this.borrower.set(borrower);
    this.loans.set([]);
    this.selected.set({});
  }

  /** Shows the borrower's loans and optionally ticks one (e.g. the book that was searched for). */
  showLoans(loans: Loan[], tickTransactionId: number | null = null): void {
    this.loans.set(loans);
    const tick = loans.some((loan) => loan.transactionId === tickTransactionId);
    this.selected.set(tick ? { [tickTransactionId!]: 'GOOD' } : {});
  }

  conditionOf(loan: Loan): ReturnCondition | undefined {
    return this.selected()[loan.transactionId];
  }

  /** Ticking a book assumes it came back in good condition. */
  toggle(loan: Loan): void {
    this.selected.update((current) => {
      const next = { ...current };
      if (next[loan.transactionId]) {
        delete next[loan.transactionId];
      } else {
        next[loan.transactionId] = 'GOOD';
      }
      return next;
    });
  }

  setCondition(loan: Loan, condition: ReturnCondition): void {
    this.selected.update((current) => ({ ...current, [loan.transactionId]: condition }));
  }

  /** Ticks every book, or clears all when all are already ticked. */
  toggleAll(): void {
    if (this.allChosen()) {
      this.selected.set({});
      return;
    }
    const current = this.selected();
    this.selected.set(Object.fromEntries(this.loans().map((loan) => [loan.transactionId, current[loan.transactionId] ?? 'GOOD'])));
  }

  toRequest(): ReturnedBook[] {
    return this.chosen().map((loan) => ({ transactionId: loan.transactionId, condition: this.selected()[loan.transactionId] }));
  }

  reset(): void {
    this.setBorrower(null);
  }
}
