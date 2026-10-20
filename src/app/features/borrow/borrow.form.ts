import { WritableSignal, computed, signal } from '@angular/core';
import { Book } from '../../core/models/book.model';
import { NewLoan } from '../../core/models/loan.model';
import { Member } from '../../core/models/member.model';
import { addDays, daysBetween, isoDate, today } from '../../utils/dates';
import { DEFAULT_LOAN_DAYS, LOAN_PERIOD_DAYS, MAX_BOOKS_PER_MEMBER } from '../desk/desk-rules';

/** What one slot of the 5-book limit shows: already on loan, being added now, or free. */
export type Slot = 'on-loan' | 'adding' | 'free';

/**
 * State and rules of the Borrow drawer: who is borrowing, which books, and until when.
 * Plain signals with no HTTP or DOM, so it is easy to test.
 */
export class BorrowForm {
  /** The borrowing day. Tests pass a fixed date. */
  readonly startDate: Date;
  readonly member = signal<Member | null>(null);
  readonly books = signal<Book[]>([]);
  /** A book to add as soon as the member is chosen, e.g. "Borrow this book" on the Books page. */
  readonly pendingBook = signal<Book | null>(null);
  /** 7, 14 or 21; null when a custom date was picked. */
  readonly periodDays = signal<number | null>(DEFAULT_LOAN_DAYS);
  readonly dueDate: WritableSignal<Date>;

  /** How many more books this member may take today. */
  readonly booksLeft = computed(() => {
    const member = this.member();
    return member ? MAX_BOOKS_PER_MEMBER - member.onLoanCount - this.books().length : 0;
  });

  readonly slots = computed<Slot[]>(() => {
    const onLoan = this.member()?.onLoanCount ?? 0;
    const adding = this.books().length;
    return Array.from({ length: MAX_BOOKS_PER_MEMBER }, (_, i) =>
      !this.member() ? 'free' : i < onLoan ? 'on-loan' : i < onLoan + adding ? 'adding' : 'free',
    );
  });

  readonly canSave = computed(() => !!this.member() && this.books().length > 0);

  constructor(startDate: Date = today()) {
    this.startDate = startDate;
    this.dueDate = signal(addDays(startDate, DEFAULT_LOAN_DAYS));
  }

  /** Changing the member empties the list, because limits depend on who is borrowing. */
  setMember(member: Member | null): void {
    this.member.set(member);
    this.books.set([]);
    const pending = this.pendingBook();
    if (member && pending) {
      this.addBook(pending);
      this.pendingBook.set(null);
    }
  }

  /** Start a loan with this book: it joins the list once the member is picked. */
  startWith(book: Book): void {
    this.reset();
    this.pendingBook.set(book);
  }

  isAdded(book: Book): boolean {
    return this.books().some((b) => b.id === book.id);
  }

  /** A book can be added when a copy is on the shelf, it isn't in the list yet, and the limit allows it. */
  canAdd(book: Book): boolean {
    return book.availableCopies > 0 && !this.isAdded(book) && this.booksLeft() > 0;
  }

  addBook(book: Book): void {
    if (this.canAdd(book)) {
      this.books.update((list) => [...list, book]);
    }
  }

  removeBook(book: Book): void {
    this.books.update((list) => list.filter((b) => b.id !== book.id));
  }

  choosePeriod(days: number): void {
    this.periodDays.set(days);
    this.dueDate.set(addDays(this.startDate, days));
  }

  /** A date from the date picker. Selects the matching period chip if there is one. */
  chooseDueDate(date: Date): void {
    this.dueDate.set(date);
    const days = daysBetween(this.startDate, date);
    this.periodDays.set((LOAN_PERIOD_DAYS as readonly number[]).includes(days) ? days : null);
  }

  toRequest(): NewLoan {
    const member = this.member();
    if (!member) {
      throw new Error('Pick a member first');
    }
    return { memberId: member.id, titleIds: this.books().map((b) => b.id), dueDate: isoDate(this.dueDate()) };
  }

  reset(): void {
    this.pendingBook.set(null);
    this.setMember(null);
    this.choosePeriod(DEFAULT_LOAN_DAYS);
  }
}
