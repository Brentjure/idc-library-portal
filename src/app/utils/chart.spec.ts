import { compactNumber, niceTicks } from './chart';

describe('chart helpers', () => {
  it('makes clean whole-number ticks that reach the largest value', () => {
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(9)).toEqual([0, 5, 10]);
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
    expect(niceTicks(1)).toEqual([0, 1]);
    expect(niceTicks(43)).toEqual([0, 20, 40, 60]);
    expect(niceTicks(0)).toEqual([0, 1]);
  });

  it('shortens big numbers', () => {
    expect(compactNumber(950)).toBe('950');
    expect(compactNumber(1200)).toBe('1.2K');
    expect(compactNumber(15000)).toBe('15K');
  });
});
