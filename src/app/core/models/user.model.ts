/** ACTIVE can sign in; INVITED hasn't set up their account yet; DISABLED can't sign in. */
export type StaffStatus = 'ACTIVE' | 'INVITED' | 'DISABLED';

/** Someone who signs in to the portal (GET /users/directory). */
export interface StaffUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: StaffStatus;
  inviteExpiresAt: string | null;
  /** INVITED and the link no longer works. */
  inviteExpired: boolean;
  lastLoginAt: string | null;
  roleId: number | null;
  /** e.g. ADMIN, LIBRARIAN. Use roleLabel() to display. */
  roleName: string | null;
  createdAt: string | null;
  /** Set while sign-in is locked after too many wrong passwords. */
  lockedUntil: string | null;
}

export interface NewStaffUser {
  name: string;
  email: string;
  phone: string | null;
  roleId: number;
}

export interface StaffUserUpdate extends NewStaffUser {
  /** False disables the account. Ignored while INVITED. */
  canSignIn: boolean;
}

/** A fresh invitation link. It can't be shown again later: sending a new one replaces it. */
export interface InvitationLink {
  user: StaffUser;
  link: string;
  expiresAt: string;
}

/** A role to pick, from GET /roles. */
export interface RoleOption {
  id: number;
  name: string;
  description: string | null;
  /** Administrator: holds every permission, listed or not. */
  system: boolean;
  permissions: { id: number; name: string }[];
}

/** What the Set up your account page shows (GET /auth/invitations/{token}). */
export interface InvitationInfo {
  name: string;
  email: string;
  phone: string | null;
  roleName: string | null;
  inviterName: string | null;
  expiresAt: string;
}

export interface AcceptInvitation {
  name: string;
  phone: string | null;
  password: string;
}
