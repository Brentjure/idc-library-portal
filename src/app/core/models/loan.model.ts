export type LoanStatus = 'ON_LOAN' | 'OVERDUE' | 'RETURNED';

/** Condition of a copy when it comes back. DAMAGED copies stay off the shelf. */
export type ReturnCondition = 'GOOD' | 'WORN' | 'DAMAGED';

/** One physical copy in a member's hands, from hand-over until it is returned. */
export interface Loan {
  transactionId: number;
  memberId: number | null;
  memberName: string;
  memberPhone: string | null;
  titleId: number;
  title: string;
  author: string;
  categoryName: string | null;
  copyId: number;
  bookCode: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  returnCondition: ReturnCondition | null;
  status: LoanStatus;
  daysLate: number;
  renewedCount: number;
  /** When staff last sent an overdue reminder for this book. */
  lastRemindedAt: string | null;
  /** Still out, not overdue, and renewals left. */
  renewable: boolean;
}

export type RegisterTab = 'ACTIVE' | 'OVERDUE' | 'RETURNED' | 'ALL';
export type RegisterPeriod = 'ANY' | 'TODAY' | 'WEEK' | 'MONTH';
/** Empty picks the natural order for the tab. */
export type RegisterSort = 'DUE' | 'RECENT' | 'NAME';

export interface RegisterQuery {
  status: RegisterTab;
  /** Member name or phone, book title or copy code. */
  q?: string;
  borrowed?: RegisterPeriod;
  sort?: RegisterSort;
  offset?: number;
  limit?: number;
}

/** One page of the loans register (GET /loans/register). */
export interface LoanPage {
  items: Loan[];
  /** Matching loans across all pages. */
  total: number;
  offset: number;
}

/** The numbers above the register and its tab counts (GET /loans/summary). */
export interface LoanSummary {
  onLoan: number;
  overdue: number;
  dueSoon: number;
  returnedLast30Days: number;
  averageLoanDays: number | null;
  returned: number;
  total: number;
}

export interface LoanQuery {
  status?: 'ACTIVE' | 'OVERDUE' | 'RETURNED' | 'ALL';
  memberId?: number;
  /** Member name or phone, book title or copy code. */
  q?: string;
  /** yyyy-MM-dd: only loans handed over that day. */
  borrowedOn?: string;
  limit?: number;
}

export interface NewLoan {
  memberId: number;
  titleIds: number[];
  dueDate: string;
}

export interface ReturnedBook {
  transactionId: number;
  condition: ReturnCondition;
}
