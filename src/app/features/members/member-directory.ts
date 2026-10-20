import { DirectoryMember } from '../../core/models/member.model';

export type MemberFilter = 'active' | 'overdue' | 'inactive' | 'all';
export type MemberSort = 'name' | 'onLoan' | 'recent';

export interface MemberQuery {
  query: string;
  /** A group name, or null for all. Members with no group are under NO_GROUP. */
  group: string | null;
  filter: MemberFilter;
}

/** The chip for members who haven't been given a group. */
export const NO_GROUP = 'No group';

export interface MemberStats {
  members: number;
  active: number;
  withBooks: number;
  withOverdue: number;
  joinedLast30Days: number;
}

export function memberStats(members: readonly DirectoryMember[], today: Date): MemberStats {
  const since = new Date(today);
  since.setDate(since.getDate() - 30);
  return {
    members: members.length,
    active: members.filter((m) => m.active).length,
    withBooks: members.filter((m) => m.onLoanCount > 0).length,
    withOverdue: members.filter((m) => m.overdueCount > 0).length,
    joinedLast30Days: members.filter((m) => m.joinedAt && new Date(m.joinedAt) >= since).length,
  };
}

/** Name ignoring case, or phone by its digits ("0712 448" finds 254712448210). */
export function matchesMember(member: DirectoryMember, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (member.fullName.toLowerCase().includes(q)) return true;
  const digits = q.replace(/\D/g, '').replace(/^(254|0)/, '');
  return digits.length >= 3 && !!member.phone && member.phone.includes(digits);
}

export function groupOf(member: DirectoryMember): string {
  return member.group?.trim() || NO_GROUP;
}

export function filterMembers(members: readonly DirectoryMember[], q: MemberQuery): DirectoryMember[] {
  return members.filter(
    (m) =>
      (q.group === null || groupOf(m) === q.group) &&
      (q.filter === 'all' ||
        (q.filter === 'active' && m.active) ||
        (q.filter === 'inactive' && !m.active) ||
        (q.filter === 'overdue' && m.overdueCount > 0)) &&
      matchesMember(m, q.query),
  );
}

const BY_NAME = (a: DirectoryMember, b: DirectoryMember) => a.fullName.localeCompare(b.fullName);

const COMPARE: Record<MemberSort, (a: DirectoryMember, b: DirectoryMember) => number> = {
  name: BY_NAME,
  onLoan: (a, b) => b.overdueCount - a.overdueCount || b.onLoanCount - a.onLoanCount,
  recent: (a, b) => (b.joinedAt ?? '').localeCompare(a.joinedAt ?? ''),
};

/** A sorted copy; ties fall back to the name. */
export function sortMembers(members: readonly DirectoryMember[], sort: MemberSort): DirectoryMember[] {
  return [...members].sort((a, b) => COMPARE[sort](a, b) || BY_NAME(a, b));
}

/** Group chips with how many members each has, "No group" last. */
export function groupCounts(members: readonly DirectoryMember[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const m of members) {
    counts.set(groupOf(m), (counts.get(groupOf(m)) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (a.name === NO_GROUP ? 1 : b.name === NO_GROUP ? -1 : a.name.localeCompare(b.name)));
}
