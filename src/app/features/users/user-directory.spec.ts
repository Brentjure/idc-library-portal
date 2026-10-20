import { StaffUser } from '../../core/models/user.model';
import { filterUsers, invitationMessage, userStats, userStatus } from './user-directory';

function user(overrides: Partial<StaffUser>): StaffUser {
  return {
    id: 1,
    name: 'Brent Jure',
    email: 'brent@idc.org',
    phone: '0718 303 158',
    status: 'ACTIVE',
    inviteExpiresAt: null,
    inviteExpired: false,
    lastLoginAt: '2026-10-17T08:00:00',
    roleId: 1,
    roleName: 'ADMIN',
    createdAt: '2026-10-01T09:00:00',
    ...overrides,
  };
}

const BRENT = user({});
const GRACE = user({ id: 2, name: 'Grace Mensah', email: 'grace@idc.org', phone: null, status: 'INVITED', inviteExpiresAt: '2026-10-24T10:00:00', roleId: 2, roleName: 'LIBRARIAN' });
const RUTH = user({ id: 3, name: 'Ruth Wanjiru', email: 'ruth@idc.org', phone: null, status: 'INVITED', inviteExpired: true, roleId: 2 });
const SAM = user({ id: 4, name: 'Samuel Okoro', email: 'sam@idc.org', phone: '0722 913 004', status: 'DISABLED', roleId: 2 });
const ALL = [SAM, GRACE, BRENT, RUTH];

describe('users directory', () => {
  it('describes each status', () => {
    expect(userStatus(BRENT)).toEqual({ label: 'Active', pill: 'pill-ok', note: '' });
    expect(userStatus(GRACE)).toEqual({ label: 'Invited', pill: 'pill-gold', note: 'Link works until Sat 24 Oct' });
    expect(userStatus(RUTH)).toEqual({ label: 'Invite expired', pill: 'pill-loan', note: 'Send a new link' });
    expect(userStatus(SAM).label).toBe('Disabled');
  });

  it('adds up the summary strip', () => {
    expect(userStats(ALL, 2)).toEqual({ users: 4, active: 1, invited: 2, disabled: 1, roles: 2 });
  });

  it('searches name, email and phone digits, and sorts by name', () => {
    const find = (query: string) => filterUsers(ALL, { query, roleId: null, status: 'all' }).map((u) => u.id);
    expect(find('')).toEqual([1, 2, 3, 4]);
    expect(find('grace@')).toEqual([2]);
    expect(find('303158')).toEqual([1]);
  });

  it('filters by role and status, with expired invitations counted as invited', () => {
    expect(filterUsers(ALL, { query: '', roleId: 2, status: 'all' }).map((u) => u.id)).toEqual([2, 3, 4]);
    expect(filterUsers(ALL, { query: '', roleId: null, status: 'INVITED' }).map((u) => u.id)).toEqual([2, 3]);
    expect(filterUsers(ALL, { query: '', roleId: null, status: 'DISABLED' }).map((u) => u.id)).toEqual([4]);
  });

  it('writes the invitation message for WhatsApp or SMS', () => {
    expect(invitationMessage('Grace Mensah', 'https://lib.example.org/setup/abc', '2026-10-24T10:00:00', 'Administrator')).toBe(
      'Hello Grace, you have been added to the IDC JKUAT Library portal as an Administrator. ' +
        'Open this link to choose your password and sign in: https://lib.example.org/setup/abc (it works until 24 Oct 2026).',
    );
    expect(invitationMessage('Ruth', 'x', '2026-10-24T10:00:00', 'Librarian')).toContain('as a Librarian.');
  });
});
