/**
 * Clean axis ticks from 0 up to at least `max`: steps of 1, 2 or 5 times a power of ten, about four of them.
 * niceTicks(7) → [0, 2, 4, 6, 8]; niceTicks(0) → [0, 1].
 */
export function niceTicks(max: number, target = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const rough = max / target;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power;
  const wholeStep = Math.max(1, Math.round(step));
  const top = Math.ceil(max / wholeStep) * wholeStep;
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += wholeStep) ticks.push(t);
  return ticks;
}

/** 950 → "950", 1200 → "1.2K", 15000 → "15K". */
export function compactNumber(value: number): string {
  if (value < 1000) return String(value);
  const k = value / 1000;
  return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}K`;
}
