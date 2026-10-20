import { Loan } from '../../core/models/loan.model';
import { defaultSort, loanState, remindedLabel, reminderMessage, tabFromSlug } from './loan-register';

const TODAY = new Date(2026, 9, 17); // Sat 17 Oct 2026

function loan(overrides: Partial<Loan>): Loan {
  return {
    transactionId: 1,
    memberId: 1,
    memberName: 'Grace Wanjiku Mensah',
    memberPhone: '254712448210',
    titleId: 5,
    title: 'Mere Christianity',
    author: 'C. S. Lewis',
    categoryName: 'Classics',
    copyId: 9,
    bookCode: 'BK-000101',
    borrowedAt: '2026-10-01T10:00:00',
    dueDate: '2026-10-25',
    returnedAt: null,
    returnCondition: null,
    status: 'ON_LOAN',
    daysLate: 0,
    renewedCount: 0,
    lastRemindedAt: null,
    renewable: true,
    ...overrides,
  };
}

describe('loans register', () => {
  it('describes books still out by how close they are to their due date', () => {
    expect(loanState(loan({ dueDate: '2026-10-25' }), TODAY)).toMatchObject({ text: 'On loan', pill: 'pill-gold', late: false });
    expect(loanState(loan({ dueDate: '2026-10-20' }), TODAY)).toMatchObject({ text: 'Due in 3 days', pill: 'pill-loan' });
    expect(loanState(loan({ dueDate: '2026-10-18' }), TODAY).text).toBe('Due in 1 day');
    expect(loanState(loan({ dueDate: '2026-10-17' }), TODAY).text).toBe('Due today');
    expect(loanState(loan({ dueDate: '2026-10-14' }), TODAY)).toMatchObject({ text: '3 days late', pill: 'pill-bad', late: true });
  });

  it('says whether a returned book came back on time', () => {
    expect(loanState(loan({ dueDate: '2026-10-15', returnedAt: '2026-10-15T17:00:00' }), TODAY)).toMatchObject({
      text: 'Returned',
      note: 'On time',
      noteBad: false,
    });
    expect(loanState(loan({ dueDate: '2026-10-10', returnedAt: '2026-10-12T09:00:00' }), TODAY)).toMatchObject({
      note: '2 days late',
      noteBad: true,
    });
  });

  it('writes a polite reminder with the first name, title and how late it is', () => {
    expect(reminderMessage(loan({ dueDate: '2026-10-14' }), TODAY)).toBe(
      'Hello Grace, this is IDC JKUAT Library. “Mere Christianity” was due back on Wed 14 Oct (3 days ago). ' +
        'Please bring it on your next visit. Thank you and God bless.',
    );
  });

  it('says when the last reminder went out', () => {
    expect(remindedLabel(loan({}), TODAY)).toBe('');
    expect(remindedLabel(loan({ lastRemindedAt: '2026-10-17T08:00:00' }), TODAY)).toBe('Reminded today');
    expect(remindedLabel(loan({ lastRemindedAt: '2026-10-16T08:00:00' }), TODAY)).toBe('Reminded yesterday');
    expect(remindedLabel(loan({ lastRemindedAt: '2026-10-13T08:00:00' }), TODAY)).toBe('Reminded 4 days ago');
  });

  it('reads the tab from the link and picks its natural order', () => {
    expect(tabFromSlug('overdue')).toBe('OVERDUE');
    expect(tabFromSlug('returned')).toBe('RETURNED');
    expect(tabFromSlug(null)).toBe('ACTIVE');
    expect(tabFromSlug('nonsense')).toBe('ACTIVE');
    expect(defaultSort('ACTIVE')).toBe('DUE');
    expect(defaultSort('RETURNED')).toBe('RECENT');
  });
});
