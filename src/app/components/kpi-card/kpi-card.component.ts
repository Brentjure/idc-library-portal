import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icons';

/**
 * A headline number with a label, e.g. "Borrowed Now · 6 · Books out".
 * `highlight` gives it the soft gold background; `alert` shows the number in red when above zero.
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
}
