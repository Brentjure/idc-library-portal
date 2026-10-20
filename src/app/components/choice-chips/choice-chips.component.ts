import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface ChoiceOption<T> {
  value: T;
  label: string;
  /** A second, smaller line (used by the 'cards' look, e.g. the actual due date). */
  hint?: string;
  /** Shown in red when selected, e.g. "Damaged". */
  danger?: boolean;
}

/**
 * Pick one option from a few. One component, three looks:
 * - 'segmented': a switch, e.g. Donation / Church purchase
 * - 'cards': equal boxes in a row, e.g. 1 / 2 / 3 weeks
 * - 'pills': small rounded chips, e.g. Good / Worn / Damaged
 *
 *   <app-choice-chips label="Condition" look="pills" [options]="conditions" [(value)]="condition" />
 */
@Component({
  selector: 'app-choice-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './choice-chips.component.html',
})
export class ChoiceChipsComponent<T> {
  readonly options = input.required<readonly ChoiceOption<T>[]>();
  /** Read out by screen readers for the whole group. */
  readonly label = input.required<string>();
  readonly look = input<'segmented' | 'cards' | 'pills'>('segmented');

  /** The selected value (two-way). Null when nothing matches, e.g. a custom due date. */
  readonly value = model<T | null>(null);

  protected buttonClass(option: ChoiceOption<T>): string {
    const selected = option.value === this.value();
    switch (this.look()) {
      case 'cards':
        return selected ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface';
      case 'pills':
        if (!selected) return 'border-line bg-surface';
        return option.danger ? 'border-bad bg-bad text-surface' : 'border-ink bg-ink text-surface';
      default:
        return '';
    }
  }
}
