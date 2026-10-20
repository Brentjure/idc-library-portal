import { Loan } from './loan.model';

/** A church member who borrows or donates books. Members don't sign in. */
export interface Member {
  id: number;
  fullName: string;
  /** Digits only, e.g. 254712448210. Use formatPhone() to display. */
  phone: string | null;
  group: string | null;
  onLoanCount: number;
  overdueCount: number;
}

/** One row of the Members page (GET /members/directory). */
export interface DirectoryMember extends Member {
  active: boolean;
  /** Loans ever, returned or not. */
  timesBorrowed: number;
  /** Donations given (each may hold several books). */
  donations: number;
  joinedAt: string | null;
}

export interface MemberDonation {
  id: number;
  receivedAt: string;
  copies: number;
  /** Each title once. */
  titles: string[];
}

/** A member with what they have now and did before (GET /members/{id}/detail). */
export interface MemberDetail {
  member: DirectoryMember;
  currentLoans: Loan[];
  /** The latest returns, newest first (at most 10). */
  recentLoans: Loan[];
  donations: MemberDonation[];
  /** Borrowed, reserved or donated before: can be deactivated but not deleted. */
  hasHistory: boolean;
}

/** Corrections from the Members page. An empty phone or group clears it. */
export interface MemberUpdate {
  fullName: string;
  phone: string | null;
  group: string | null;
}

/** DELETED: gone for good. DEACTIVATED: history kept, can be reactivated. */
export interface MemberRemoval {
  outcome: 'DELETED' | 'DEACTIVATED';
}

export interface NewMember {
  fullName: string;
  phone?: string;
  group?: string;
}
