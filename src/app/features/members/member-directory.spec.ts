import { DirectoryMember } from '../../core/models/member.model';
import { filterMembers, groupCounts, memberStats, sortMembers } from './member-directory';

const TODAY = new Date(2026, 9, 17);

function member(overrides: Partial<DirectoryMember>): DirectoryMember {
  return {
    id: 1,
    fullName: 'Grace Mensah',
    phone: '254712448210',
    group: 'Choir',
    onLoanCount: 0,
    overdueCount: 0,
    active: true,
    timesBorrowed: 4,
    donations: 0,
    joinedAt: '2026-09-01T10:00:00',
    ...overrides,
  };
}

const GRACE = member({ onLoanCount: 2, overdueCount: 1 });
const SAMUEL = member({ id: 2, fullName: 'Samuel Okoro', phone: '254722000111', group: 'Youth', onLoanCount: 3, joinedAt: '2026-10-10T10:00:00' });
const ANNE = member({ id: 3, fullName: 'Anne Wairimu', phone: null, group: null, active: false, joinedAt: '2026-05-01T10:00:00' });
const ALL = [GRACE, SAMUEL, ANNE];

describe('members directory', () => {
  it('adds up the summary strip', () => {
    expect(memberStats(ALL, TODAY)).toEqual({ members: 3, active: 2, withBooks: 2, withOverdue: 1, joinedLast30Days: 1 });
  });

  it('finds members by name or by phone digits, however the number is written', () => {
    const find = (query: string) => filterMembers(ALL, { query, group: null, filter: 'all' }).map((m) => m.id);
    expect(find('samuel')).toEqual([2]);
    expect(find('0712 448')).toEqual([1]);
    expect(find('+254 722')).toEqual([2]);
    expect(find('07')).toEqual([]);
  });

  it('filters by group and by status', () => {
    expect(filterMembers(ALL, { query: '', group: 'Youth', filter: 'all' }).map((m) => m.id)).toEqual([2]);
    expect(filterMembers(ALL, { query: '', group: 'No group', filter: 'all' }).map((m) => m.id)).toEqual([3]);
    expect(filterMembers(ALL, { query: '', group: null, filter: 'active' }).map((m) => m.id)).toEqual([1, 2]);
    expect(filterMembers(ALL, { query: '', group: null, filter: 'inactive' }).map((m) => m.id)).toEqual([3]);
    expect(filterMembers(ALL, { query: '', group: null, filter: 'overdue' }).map((m) => m.id)).toEqual([1]);
  });

  it('sorts by name, overdue then books out, or newest', () => {
    expect(sortMembers(ALL, 'name').map((m) => m.id)).toEqual([3, 1, 2]);
    expect(sortMembers(ALL, 'onLoan').map((m) => m.id)).toEqual([1, 2, 3]);
    expect(sortMembers(ALL, 'recent').map((m) => m.id)).toEqual([2, 1, 3]);
  });

  it('counts members per group with "No group" last', () => {
    expect(groupCounts(ALL)).toEqual([
      { name: 'Choir', count: 1 },
      { name: 'Youth', count: 1 },
      { name: 'No group', count: 1 },
    ]);
  });
});
