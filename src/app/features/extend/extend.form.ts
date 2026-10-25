import { computed, signal } from '@angular/core';
import { ExtendLoans, Loan } from '../../core/models/loan.model';
import { addDays, isoDate, parseDate, today } from '../../utils/dates';
import { DEFAULT_EXTENSION_WEEKS } from '../desk/desk-rules';
import { Borrower } from '../desk/desk.service';

/**
 * State and rules of the Extend drawer: whose books are listed, which ones get more time, and how much.
 * An overdue book gets the time from today; any other book from its current due date (the server does the same).
 */
export class ExtendForm {
  readonly borrower = signal<Borrower | null>(null);
  readonly loans = signal<Loan[]>([]);
  readonly selected = signal<ReadonlySet<number>>(new Set());
  readonly weeks = signal(DEFAULT_EXTENSION_WEEKS);
  readonly note = signal('');

  constructor(private readonly now: () => Date = today) {}

  readonly chosen = computed(() => this.loans().filter((loan) => this.selected().has(loan.transactionId)));
  readonly canSave = computed(() => this.chosen().length > 0);
  readonly firstName = computed(() => this.borrower()?.name.split(' ')[0] ?? '');
  /** The latest new due date among the ticked books, for the footer. */
  readonly dueBack = computed(() => {
    const dates = this.chosen().map((loan) => this.newDueDate(loan)).sort();
    return dates.length ? dates[dates.length - 1] : null;
  });
  readonly overdueCount = computed(() => this.chosen().filter((loan) => this.isOverdue(loan)).length);

  setBorrower(borrower: Borrower | null): void {
    this.borrower.set(borrower);
    this.loans.set([]);
    this.selected.set(new Set());
    this.note.set('');
    this.weeks.set(DEFAULT_EXTENSION_WEEKS);
  }

  /** Shows the borrower's loans and ticks one (the book the drawer was opened for), when it can be extended. */
  showLoans(loans: Loan[], tickTransactionId: number | null = null): void {
    this.loans.set(loans);
    const tick = loans.find((loan) => loan.transactionId === tickTransactionId);
    this.selected.set(tick && this.canExtend(tick) ? new Set([tick.transactionId]) : new Set());
  }

  canExtend(loan: Loan): boolean {
    return loan.returnedAt === null && loan.extensionsLeft > 0;
  }

  isOverdue(loan: Loan): boolean {
    return parseDate(loan.dueDate) < this.now();
  }

  /** yyyy-MM-dd the book will be due once extended by the chosen weeks. */
  newDueDate(loan: Loan): string {
    const due = parseDate(loan.dueDate);
    const from = due < this.now() ? this.now() : due;
    return isoDate(addDays(from, this.weeks() * 7));
  }

  toggle(loan: Loan): void {
    if (!this.canExtend(loan)) return;
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(loan.transactionId)) {
        next.delete(loan.transactionId);
      } else {
        next.add(loan.transactionId);
      }
      return next;
    });
  }

  toRequest(): ExtendLoans {
    const note = this.note().trim();
    return { transactionIds: this.chosen().map((loan) => loan.transactionId), weeks: this.weeks(), note: note || null };
  }

  reset(): void {
    this.setBorrower(null);
  }
}
