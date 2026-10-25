import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { countStep } from '../../utils/motion';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icons';

const COUNT_MS = 700;

/**
 * A headline number with a label, e.g. "Borrowed Now · 6 · Books out".
 * `highlight` gives it the soft gold background; `alert` shows the number in red when above zero.
 * The number counts up when it first loads (unless `countUp` is off) and pulses when it changes later. Both are
 * skipped with reduced motion.
 */
@Component({
  selector: 'app-kpi-card',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kpi-card.component.html',
  host: {
    class: 'card flex flex-col gap-2.5 px-4 py-3.5',
    '[class.bg-linear-140]': 'highlight()',
    '[class.from-gold-soft]': 'highlight()',
    '[class.to-surface]': 'highlight()',
  },
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly icon = input.required<IconName>();
  /** Undefined while loading. */
  readonly value = input<number | undefined>(undefined);
  readonly caption = input('');
  readonly highlight = input(false);
  readonly alert = input(false);
  /** Count up from 0 when the number first arrives. Off: show it straight away (later changes still pulse). */
  readonly countUp = input(true);

  /** What is on screen right now; trails `value` while counting. */
  protected readonly shown = signal<number | undefined>(undefined);
  protected readonly bumping = signal(false);

  private frame = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
    effect(() => {
      const target = this.value();
      untracked(() => this.animateTo(target));
    });
  }

  protected bumpDone(): void {
    this.bumping.set(false);
  }

  private animateTo(target: number | undefined): void {
    cancelAnimationFrame(this.frame);
    const from = this.shown();
    if (target === undefined || from === target || reducedMotion() || (from === undefined && !this.countUp())) {
      this.shown.set(target);
      return;
    }
    if (from !== undefined) {
      // A later change (e.g. after a desk save): restart the pulse.
      this.bumping.set(false);
      requestAnimationFrame(() => this.bumping.set(true));
    }
    const start = performance.now(), origin = from ?? 0;
    const step = (now: number) => {
      const t = (now - start) / COUNT_MS;
      this.shown.set(countStep(origin, target, t));
      if (t < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }
}

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
