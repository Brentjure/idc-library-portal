import { change, percent, presetRange } from './report-period';

const TODAY = new Date(2026, 9, 18); // Sun 18 Oct 2026

describe('report period', () => {
  it('turns presets into dates up to today', () => {
    expect(presetRange('this-month', TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-18' });
    expect(presetRange('last-month', TODAY)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(presetRange('last-3-months', TODAY)).toEqual({ from: '2026-08-01', to: '2026-10-18' });
    expect(presetRange('this-year', TODAY)).toEqual({ from: '2026-01-01', to: '2026-10-18' });
  });

  it('handles January for last month', () => {
    expect(presetRange('last-month', new Date(2027, 0, 10))).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });

  it('describes the change from the previous period', () => {
    expect(change(12, 8)).toEqual({ text: 'up 4', direction: 'up' });
    expect(change(3, 5)).toEqual({ text: 'down 2', direction: 'down' });
    expect(change(4, 4)).toEqual({ text: 'same as before', direction: 'same' });
    expect(change(9, 0)).toEqual({ text: 'up 9, none before', direction: 'up' });
  });

  it('shows a share as a whole percentage', () => {
    expect(percent(8, 9)).toBe('89%');
    expect(percent(0, 0)).toBe('–');
  });
});
