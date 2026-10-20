import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

const KIND_CLASSES = {
  error: 'bg-bad-bg text-bad font-semibold text-[13px]',
  warn: 'bg-warn-bg text-warn font-medium text-[12.5px]',
  success: 'bg-good-bg text-good font-medium text-[12.5px]',
} as const;

/**
 * A coloured message box. Errors are announced to screen readers.
 *
 *   <app-alert kind="warn">Has 1 overdue book.</app-alert>
 */
@Component({
  selector: 'app-alert',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (kind() === 'warn') {
      <app-icon name="alert" [size]="16" />
    }
    <span><ng-content /></span>
  `,
  host: {
    '[class]': 'classes()',
    '[attr.role]': "kind() === 'error' ? 'alert' : 'note'",
  },
})
export class AlertComponent {
  readonly kind = input<keyof typeof KIND_CLASSES>('error');

  protected readonly classes = computed(
    () => `flex items-start gap-2 rounded-[10px] px-3 py-2.5 ${KIND_CLASSES[this.kind()]}`,
  );
}
