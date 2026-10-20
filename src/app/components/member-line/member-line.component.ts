import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { initials } from '../../utils/format';

/**
 * A person on one line: initials avatar, name, and a smaller line under it.
 * Anything placed inside appears at the right end.
 *
 *   <app-member-line [name]="m.fullName" [subtitle]="phone">2 on loan</app-member-line>
 */
@Component({
  selector: 'app-member-line',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './member-line.component.html',
  host: { class: 'flex w-full min-w-0 items-center gap-2.5' },
})
export class MemberLineComponent {
  readonly name = input.required<string>();
  readonly subtitle = input('');

  protected readonly initials = computed(() => initials(this.name()));
}
