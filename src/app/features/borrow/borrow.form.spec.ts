import { Book } from '../../core/models/book.model';
import { Member } from '../../core/models/member.model';
import { BorrowForm } from './borrow.form';

const START = new Date(2026, 9, 10); // Sat 10 Oct 2026

function member(onLoanCount = 0): Member {
  return { id: 1, fullName: 'Grace Mensah', phone: '254712448210', group: null, onLoanCount, overdueCount: 0 };
}

function book(id: number, availableCopies = 1): Book {
  return {
    id, categoryId: 1, categoryName: null, title: `Book ${id}`, author: 'A', isbn: null, publisher: null,
    publicationYear: null, description: null, coverImage: null, totalCopies: 2, availableCopies,
  };
}

describe('BorrowForm', () => {
  it('starts with a 2-week loan', () => {
    const form = new BorrowForm(START);
    expect(form.periodDays()).toBe(14);
    expect(form.canSave()).toBe(false);
  });

  it('counts the 5-book limit from books already on loan', () => {
    const form = new BorrowForm(START);
    form.setMember(member(3));
    form.addBook(book(1));
    expect(form.booksLeft()).toBe(1);
    expect(form.slots()).toEqual(['on-loan', 'on-loan', 'on-loan', 'adding', 'free']);

    form.addBook(book(2));
    expect(form.booksLeft()).toBe(0);
    expect(form.canAdd(book(3))).toBe(false);
  });

  it('refuses books with no copy on the shelf and duplicates', () => {
    const form = new BorrowForm(START);
    form.setMember(member());
    form.addBook(book(1, 0));
    form.addBook(book(2));
    form.addBook(book(2));
    expect(form.books().map((b) => b.id)).toEqual([2]);
  });

  it('empties the list when the member changes', () => {
    const form = new BorrowForm(START);
    form.setMember(member());
    form.addBook(book(1));
    form.setMember({ ...member(), id: 2 });
    expect(form.books()).toEqual([]);
  });

  it('adds a book chosen on the Books page once the member is picked', () => {
    const form = new BorrowForm(START);
    form.startWith(book(7));
    expect(form.books()).toEqual([]);

    form.setMember(member());

    expect(form.books().map((b) => b.id)).toEqual([7]);
    expect(form.pendingBook()).toBeNull();
  });

  it('drops the waiting book when the member is at their limit', () => {
    const form = new BorrowForm(START);
    form.startWith(book(7));

    form.setMember(member(5));

    expect(form.books()).toEqual([]);
    expect(form.pendingBook()).toBeNull();
  });

  it('forgets the waiting book on reset', () => {
    const form = new BorrowForm(START);
    form.startWith(book(7));
    form.reset();
    form.setMember(member());
    expect(form.books()).toEqual([]);
  });

  it('keeps the period chip in step with the due date', () => {
    const form = new BorrowForm(START);
    form.choosePeriod(21);
    expect(form.dueDate()).toEqual(new Date(2026, 9, 31));
    form.chooseDueDate(new Date(2026, 9, 17));
    expect(form.periodDays()).toBe(7);
    form.chooseDueDate(new Date(2026, 9, 20));
    expect(form.periodDays()).toBeNull();
  });

  it('builds the request for the API', () => {
    const form = new BorrowForm(START);
    form.setMember(member());
    form.addBook(book(4));
    form.addBook(book(9));
    form.choosePeriod(7);
    expect(form.toRequest()).toEqual({ memberId: 1, titleIds: [4, 9], dueDate: '2026-10-17' });
  });
});
