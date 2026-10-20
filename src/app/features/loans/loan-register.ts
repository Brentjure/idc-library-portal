import { Loan, RegisterPeriod, RegisterSort, RegisterTab } from '../../core/models/loan.model';
import { daysBetween, formatShort, parseDate } from '../../utils/dates';
import { plural } from '../../utils/format';

export interface TabDef {
  value: RegisterTab;
  label: string;
  /** In the URL: /loans?tab=overdue */
  slug: string;
}

export const TABS: TabDef[] = [
  { value: 'ACTIVE', label: 'On loan', slug: 'on-loan' },
  { value: 'OVERDUE', label: 'Overdue', slug: 'overdue' },
  { value: 'RETURNED', label: 'Returned', slug: 'returned' },
  { value: 'ALL', label: 'All', slug: 'all' },
];

export const PERIODS: { value: RegisterPeriod; label: string }[] = [
  { value: 'ANY', label: 'Any time' },
  { value: 'TODAY', label: 'Today' },
  { value: 'WEEK', label: 'Last 7 days' },
  { value: 'MONTH', label: 'Last 30 days' },
];

export const SORTS: { value: RegisterSort; label: string }[] = [
  { value: 'DUE', label: 'Due date' },
  { value: 'RECENT', label: 'Recently borrowed' },
  { value: 'NAME', label: 'Member A–Z' },
];

/** Returned books read best newest first; books still out by due date. */
export function defaultSort(tab: RegisterTab): RegisterSort {
  return tab === 'RETURNED' || tab === 'ALL' ? 'RECENT' : 'DUE';
}

/** "?tab=overdue" → OVERDUE. Anything unknown opens "On loan". */
export function tabFromSlug(slug: string | null): RegisterTab {
  return TABS.find((t) => t.slug === slug)?.value ?? 'ACTIVE';
}

export interface LoanState {
  /** Pill text: "On loan", "Due in 2 days", "3 days late", "Returned". */
  text: string;
  pill: 'pill-ok' | 'pill-loan' | 'pill-bad' | 'pill-gold';
  /** Small line under the pill: "On time" / "2 days late" for returns. */
  note: string;
  noteBad: boolean;
  late: boolean;
}

/** How one row reads, as of today. */
export function loanState(loan: Loan, today: Date): LoanState {
  const due = parseDate(loan.dueDate);
  if (loan.returnedAt) {
    const late = daysBetween(due, parseDate(loan.returnedAt));
    return late > 0
      ? { text: 'Returned', pill: 'pill-ok', note: `${plural(late, 'day')} late`, noteBad: true, late: false }
      : { text: 'Returned', pill: 'pill-ok', note: 'On time', noteBad: false, late: false };
  }
  const days = daysBetween(today, due);
  if (days < 0) return { text: `${plural(-days, 'day')} late`, pill: 'pill-bad', note: '', noteBad: false, late: true };
  if (days === 0) return { text: 'Due today', pill: 'pill-loan', note: '', noteBad: false, late: false };
  if (days <= 3) return { text: `Due in ${plural(days, 'day')}`, pill: 'pill-loan', note: '', noteBad: false, late: false };
  return { text: 'On loan', pill: 'pill-gold', note: '', noteBad: false, late: false };
}

/** "Reminded today", "Reminded yesterday", "Reminded 4 days ago". Empty when never reminded. */
export function remindedLabel(loan: Loan, today: Date): string {
  if (!loan.lastRemindedAt) return '';
  const ago = daysBetween(parseDate(loan.lastRemindedAt), today);
  if (ago <= 0) return 'Reminded today';
  if (ago === 1) return 'Reminded yesterday';
  return `Reminded ${ago} days ago`;
}

/** The polite SMS / WhatsApp text staff copy for an overdue book. */
export function reminderMessage(loan: Loan, today: Date): string {
  const firstName = loan.memberName.trim().split(/\s+/)[0];
  const late = Math.max(1, daysBetween(parseDate(loan.dueDate), today));
  return (
    `Hello ${firstName}, this is IDC JKUAT Library. “${loan.title}” was due back on ${formatShort(loan.dueDate)} ` +
    `(${plural(late, 'day')} ago). Please bring it on your next visit. Thank you and God bless.`
  );
}
