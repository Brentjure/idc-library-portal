import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icons';

/**
 * Dashed placeholder for an empty list.
 *
 *   <app-empty-state icon="book">Pick the member first, then add their books.</app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (icon(); as name) {
      <app-icon [name]="name" [size]="34" [stroke]="1.6" class="text-gold-deep opacity-80" />
    }
    <ng-content />
  `,
  host: {
    class:
      'flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed border-line bg-surface-2 p-[18px] text-center text-[12.5px] text-ink-3',
  },
})
export class EmptyStateComponent {
  readonly icon = input<IconName | null>(null);
}
