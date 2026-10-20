import { addDays, isoDate } from '../../utils/dates';

export type PeriodPreset = 'this-month' | 'last-month' | 'last-3-months' | 'this-year' | 'custom';

export const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-3-months', label: 'Last 3 months' },
  { value: 'this-year', label: 'This year' },
  { value: 'custom', label: 'Custom' },
];

/** Both ends inclusive, yyyy-MM-dd. */
export interface DateRange {
  from: string;
  to: string;
}

/** The dates a preset covers, up to today. */
export function presetRange(preset: Exclude<PeriodPreset, 'custom'>, today: Date): DateRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (preset) {
    case 'this-month':
      return { from: isoDate(new Date(y, m, 1)), to: isoDate(today) };
    case 'last-month':
      return { from: isoDate(new Date(y, m - 1, 1)), to: isoDate(addDays(new Date(y, m, 1), -1)) };
    case 'last-3-months':
      return { from: isoDate(new Date(y, m - 2, 1)), to: isoDate(today) };
    case 'this-year':
      return { from: isoDate(new Date(y, 0, 1)), to: isoDate(today) };
  }
}

export interface Change {
  /** "up 4", "down 2", "same as before", "new" */
  text: string;
  direction: 'up' | 'down' | 'same';
}

/** How a number moved compared with the previous period. */
export function change(current: number, previous: number): Change {
  if (current === previous) return { text: 'same as before', direction: 'same' };
  if (previous === 0) return { text: `up ${current}, none before`, direction: 'up' };
  const diff = current - previous;
  return diff > 0 ? { text: `up ${diff}`, direction: 'up' } : { text: `down ${-diff}`, direction: 'down' };
}

/** "92%" of returns on time, or "–" when nothing came back. */
export function percent(part: number, whole: number): string {
  return whole ? `${Math.round((part / whole) * 100)}%` : '–';
}
