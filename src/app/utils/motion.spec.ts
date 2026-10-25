import { countStep, easeOutCubic, freshKeys } from './motion';

describe('motion', () => {
  it('eases from 0 to 1 and clamps outside that range', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });

  it('counts in whole numbers, up or down', () => {
    expect(countStep(0, 214, 0)).toBe(0);
    expect(countStep(0, 214, 1)).toBe(214);
    expect(countStep(0, 214, 0.5)).toBe(187);
    expect(countStep(23, 20, 1)).toBe(20);
    expect(countStep(23, 20, 0.5)).toBe(20);
  });

  it('marks nothing as new on the first load', () => {
    expect(freshKeys(null, ['1:out', '2:out']).size).toBe(0);
  });

  it('finds rows that are new or changed since the last load', () => {
    const seen = new Set(['1:out', '2:out']);
    expect([...freshKeys(seen, ['1:out', '2:back', '3:out'])]).toEqual(['2:back', '3:out']);
  });
});
