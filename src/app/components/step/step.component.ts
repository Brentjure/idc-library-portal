import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A numbered step inside a drawer. The number turns into a gold tick when `done`,
 * and a line joins it to the next step.
 *
 *   <app-step [n]="1" heading="Member" subtitle="Search by name or phone" [done]="!!member()">
 *     <button stepAside>Select all</button>   ← optional, shown at the right of the heading
 *     …step content…
 *   </app-step>
 */
@Component({
  selector: 'app-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './step.component.html',
  host: {
    class:
      'relative flex flex-col gap-2.5 pl-10 before:absolute before:top-[30px] before:-bottom-[18px] before:left-3 before:w-0.5 before:rounded-sm before:bg-line last:before:hidden',
    '[class.before:bg-gold]': 'done()',
  },
})
export class StepComponent {
  readonly n = input.required<number>();
  readonly heading = input.required<string>();
  readonly subtitle = input('');
  readonly done = input(false);
}
