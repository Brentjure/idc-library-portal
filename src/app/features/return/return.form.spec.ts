import { Loan } from '../../core/models/loan.model';
import { addDays, isoDate, today } from '../../utils/dates';
import { ReturnForm } from './return.form';

function loan(transactionId: number, dueInDays: number): Loan {
  const dueDate = isoDate(addDays(today(), dueInDays));
  return {
    transactionId, memberId: 1, memberName: 'Grace Mensah', memberPhone: null, titleId: 1, title: 'Book',
    author: 'A', categoryName: null, copyId: transactionId, bookCode: `BK-${transactionId}`,
    borrowedAt: '2026-10-01T10:00:00', dueDate, originalDueDate: dueDate, returnedAt: null,
    returnCondition: null, status: 'ON_LOAN', daysLate: 0, renewedCount: 0, extensionsLeft: 2, lastRemindedAt: null, renewable: true,
  };
}

describe('ReturnForm', () => {
  it('ticks the searched-for book when showing loans', () => {
    const form = new ReturnForm();
    form.showLoans([loan(1, 3), loan(2, 3)], 2);
    expect(form.chosen().map((l) => l.transactionId)).toEqual([2]);
  });

  it('defaults a ticked book to Good and lets the condition change', () => {
    const form = new ReturnForm();
    const late = loan(1, -2);
    form.showLoans([late, loan(2, 5)]);
    form.toggle(late);
    form.setCondition(late, 'DAMAGED');
    expect(form.toRequest()).toEqual([{ transactionId: 1, condition: 'DAMAGED' }]);
    expect(form.lateCount()).toBe(1);
  });

  it('selects all, keeping conditions already chosen, then clears all', () => {
    const form = new ReturnForm();
    const first = loan(1, 1);
    form.showLoans([first, loan(2, 1)]);
    form.toggle(first);
    form.setCondition(first, 'WORN');
    form.toggleAll();
    expect(form.toRequest()).toEqual([
      { transactionId: 1, condition: 'WORN' },
      { transactionId: 2, condition: 'GOOD' },
    ]);
    form.toggleAll();
    expect(form.canSave()).toBe(false);
  });

  it('starts over when the borrower changes', () => {
    const form = new ReturnForm();
    form.showLoans([loan(1, 1)], 1);
    form.setBorrower({ memberId: 2, name: 'Samuel Okoro', phone: null });
    expect(form.loans()).toEqual([]);
    expect(form.firstName()).toBe('Samuel');
  });
});
