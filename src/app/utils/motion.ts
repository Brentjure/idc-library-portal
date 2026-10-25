/** Fast start, gentle stop. `t` runs from 0 to 1. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

/** The whole number shown at progress `t` (0–1) while counting from `from` to `to`. */
export function countStep(from: number, to: number, t: number): number {
  return Math.round(from + (to - from) * easeOutCubic(t));
}

/** Keys for rows that are new or changed since `seen`. Nothing is new on the first load (`seen` is null). */
export function freshKeys(seen: ReadonlySet<string> | null, current: readonly string[]): Set<string> {
  if (!seen) return new Set();
  return new Set(current.filter((key) => !seen.has(key)));
}
