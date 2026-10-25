import { Loan } from '../../core/models/loan.model';
import { ExtendForm } from './extend.form';

const TODAY = new Date(2026, 9, 25); // Sun 25 Oct 2026

function loan(transactionId: number, dueDate: string, extensionsLeft = 2): Loan {
  return {
    transactionId, memberId: 1, memberName: 'Faith Wambui', memberPhone: null, titleId: 1, title: 'Book',
    author: 'A', categoryName: null, copyId: transactionId, bookCode: `BK-${transactionId}`,
    borrowedAt: '2026-09-27T10:00:00', dueDate, originalDueDate: dueDate, returnedAt: null, returnCondition: null,
    status: 'ON_LOAN', daysLate: 0, renewedCount: 2 - extensionsLeft, extensionsLeft, lastRemindedAt: null,
    renewable: extensionsLeft > 0,
  };
}

function form(): ExtendForm {
  const f = new ExtendForm(() => TODAY);
  f.setBorrower({ memberId: 1, name: 'Faith Wambui', phone: null });
  return f;
}

describe('ExtendForm', () => {
  it('counts an overdue book from today', () => {
    const f = form();
    const overdue = loan(1, '2026-10-11');
    f.showLoans([overdue], 1);

    expect(f.isOverdue(overdue)).toBe(true);
    expect(f.newDueDate(overdue)).toBe('2026-11-08');
  });

  it('counts a book not yet due from its due date', () => {
    const f = form();
    const soon = loan(1, '2026-10-28');
    f.weeks.set(3);

    expect(f.newDueDate(soon)).toBe('2026-11-18');
  });

  it('ticks the book it was opened for, unless it has no extensions left', () => {
    const f = form();
    f.showLoans([loan(1, '2026-10-11'), loan(2, '2026-10-11', 0)], 2);
    expect(f.chosen()).toEqual([]);

    f.showLoans([loan(1, '2026-10-11'), loan(2, '2026-10-11', 0)], 1);
    expect(f.chosen().map((l) => l.transactionId)).toEqual([1]);
  });

  it("can't tick a book that was already extended twice", () => {
    const f = form();
    const usedUp = loan(2, '2026-10-11', 0);
    f.showLoans([usedUp]);
    f.toggle(usedUp);

    expect(f.canSave()).toBe(false);
  });

  it('builds the request and the footer summary for several books', () => {
    const f = form();
    const a = loan(1, '2026-10-11');
    const b = loan(2, '2026-11-01');
    f.showLoans([a, b], 1);
    f.toggle(b);
    f.weeks.set(1);
    f.note.set('  asked by phone ');

    expect(f.toRequest()).toEqual({ transactionIds: [1, 2], weeks: 1, note: 'asked by phone' });
    expect(f.dueBack()).toBe('2026-11-08');
    expect(f.overdueCount()).toBe(1);
  });

  it('sends no note when it is blank, and starts again from two weeks', () => {
    const f = form();
    f.showLoans([loan(1, '2026-10-30')], 1);
    f.weeks.set(3);
    f.note.set('   ');
    expect(f.toRequest().note).toBeNull();

    f.reset();
    expect(f.weeks()).toBe(2);
    expect(f.canSave()).toBe(false);
  });
});
