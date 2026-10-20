/**
 * Date helpers for the desk. Desk dates are local calendar days, so never use toISOString() for them:
 * it converts to UTC and can shift the day.
 */

/** Today at midnight, local time. */
export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** "2026-10-24": the format the API expects. */
export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Reads "2026-10-24" (or the date part of a timestamp) as a local date. */
export function parseDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function asDate(value: Date | string): Date {
  return typeof value === 'string' ? parseDate(value) : value;
}

/** "Sat 24 Oct" */
export function formatShort(value: Date | string): string {
  return asDate(value).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "24 Oct" */
export function formatDayMonth(value: Date | string): string {
  return asDate(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** "9 Oct 2026" */
export function formatDate(value: Date | string): string {
  return asDate(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "Sat 10 Oct 2026" */
export function formatMedium(value: Date): string {
  return value.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** "Saturday, 10 October 2026" */
export function formatLong(value: Date): string {
  return value.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** "14:05" from an ISO timestamp. */
export function formatTime(timestamp: string): string {
  return timestamp.slice(11, 16);
}

export interface DueState {
  text: string;
  pillClass: 'pill-ok' | 'pill-loan' | 'pill-bad';
  late: boolean;
}

/** How the desk describes a due date: "Due in 3 days", "Due today" or "2 days late". */
export function dueState(dueDate: string): DueState {
  const days = daysBetween(today(), parseDate(dueDate));
  if (days < 0) {
    const late = -days;
    return { text: `${late} day${late === 1 ? '' : 's'} late`, pillClass: 'pill-bad', late: true };
  }
  if (days === 0) {
    return { text: 'Due today', pillClass: 'pill-loan', late: false };
  }
  return { text: `Due in ${days} day${days === 1 ? '' : 's'}`, pillClass: 'pill-ok', late: false };
}

/** "Good morning" / "Good afternoon" / "Good evening" */
export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** For "last sign-in": "Today 14:05", "Yesterday", "3 days ago", then "9 Oct 2026". */
export function formatSince(timestamp: string, now: Date = new Date()): string {
  const days = daysBetween(parseDate(timestamp), new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  if (days <= 0) return `Today ${formatTime(timestamp)}`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(timestamp);
}
