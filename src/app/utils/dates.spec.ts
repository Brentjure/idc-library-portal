import { addDays, dueState, formatDate, formatSince, greeting, isoDate, parseDate, today } from './dates';

describe('dates', () => {
  it('says how long ago someone signed in', () => {
    const now = new Date(2026, 9, 17, 16, 0);
    expect(formatSince('2026-10-17T08:05:00', now)).toBe('Today 08:05');
    expect(formatSince('2026-10-16T22:00:00', now)).toBe('Yesterday');
    expect(formatSince('2026-10-14T09:00:00', now)).toBe('3 days ago');
    expect(formatSince('2026-10-01T09:00:00', now)).toBe('1 Oct 2026');
  });

  it('writes a date with the year, from a date or a timestamp', () => {
    expect(formatDate(new Date(2026, 9, 9))).toBe('9 Oct 2026');
    expect(formatDate('2026-10-09T18:30:00')).toBe('9 Oct 2026');
  });

  it('formats and parses local calendar days without shifting to UTC', () => {
    expect(isoDate(new Date(2026, 9, 24))).toBe('2026-10-24');
    expect(parseDate('2026-10-24T18:33:00').getDate()).toBe(24);
  });

  it('describes due dates the way the desk reads them', () => {
    expect(dueState(isoDate(today()))).toEqual({ text: 'Due today', pillClass: 'pill-loan', late: false });
    expect(dueState(isoDate(addDays(today(), 1))).text).toBe('Due in 1 day');
    expect(dueState(isoDate(addDays(today(), 3))).text).toBe('Due in 3 days');
    expect(dueState(isoDate(addDays(today(), -2)))).toEqual({ text: '2 days late', pillClass: 'pill-bad', late: true });
  });

  it('greets by time of day', () => {
    expect(greeting(new Date(2026, 0, 1, 9))).toBe('Good morning');
    expect(greeting(new Date(2026, 0, 1, 14))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 0, 1, 19))).toBe('Good evening');
  });
});
