import { StaffStatus, StaffUser } from '../../core/models/user.model';
import { formatDate, formatShort } from '../../utils/dates';

export type StatusFilter = 'all' | StaffStatus;

export interface UserQuery {
  query: string;
  roleId: number | null;
  status: StatusFilter;
}

export interface UserStatusView {
  label: 'Active' | 'Invited' | 'Invite expired' | 'Disabled';
  pill: 'pill-ok' | 'pill-gold' | 'pill-loan' | 'pill-bad';
  /** Small line under the pill. */
  note: string;
}

export function userStatus(user: StaffUser): UserStatusView {
  switch (user.status) {
    case 'INVITED':
      return user.inviteExpired
        ? { label: 'Invite expired', pill: 'pill-loan', note: 'Send a new link' }
        : { label: 'Invited', pill: 'pill-gold', note: user.inviteExpiresAt ? `Link works until ${formatShort(user.inviteExpiresAt)}` : '' };
    case 'DISABLED':
      return { label: 'Disabled', pill: 'pill-bad', note: 'Can’t sign in' };
    default:
      return { label: 'Active', pill: 'pill-ok', note: '' };
  }
}

export function userStats(users: readonly StaffUser[], roles: number) {
  return {
    users: users.length,
    active: users.filter((u) => u.status === 'ACTIVE').length,
    invited: users.filter((u) => u.status === 'INVITED').length,
    disabled: users.filter((u) => u.status === 'DISABLED').length,
    roles,
  };
}

/** Name or email ignoring case, or phone by its digits. */
export function matchesUser(user: StaffUser, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)) return true;
  const digits = q.replace(/\D/g, '');
  return digits.length >= 3 && !!user.phone && user.phone.replace(/\D/g, '').includes(digits);
}

/** Filtered, then by name. Status filter INVITED includes expired invitations. */
export function filterUsers(users: readonly StaffUser[], q: UserQuery): StaffUser[] {
  return users
    .filter(
      (u) =>
        (q.roleId === null || u.roleId === q.roleId) &&
        (q.status === 'all' || u.status === q.status) &&
        matchesUser(u, q.query),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The WhatsApp / SMS text that goes with an invitation link. */
export function invitationMessage(name: string, link: string, expiresAt: string, role: string): string {
  const firstName = name.trim().split(/\s+/)[0];
  return (
    `Hello ${firstName}, you have been added to the IDC JKUAT Library portal as ${article(role)} ${role}. ` +
    `Open this link to choose your password and sign in: ${link} ` +
    `(it works until ${formatDate(expiresAt)}).`
  );
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}
