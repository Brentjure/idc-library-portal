/** The signed-in staff user, as returned by /auth/login and /auth/me. */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

/** Permission keys the desk screens check. The server checks them again on every call. */
export type Permission =
  | 'books.view'
  | 'books.edit'
  | 'books.delete'
  | 'loans.view'
  | 'loans.renew'
  | 'loans.remind'
  | 'loans.borrow'
  | 'loans.return'
  | 'donations.record'
  | 'members.view'
  | 'members.manage'
  | 'members.list'
  | 'members.edit'
  | 'members.delete'
  | 'MANAGE_USERS'
  | 'VIEW_REPORTS'
  | 'reports.export';
