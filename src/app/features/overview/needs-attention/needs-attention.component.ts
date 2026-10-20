import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../../../components/icon/icon.component';
import { plural } from '../../../utils/format';

/** Side column of the overview: things to follow up, and a few desk tips. */
@Component({
  selector: 'app-needs-attention',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './needs-attention.component.html',
  host: { class: 'flex flex-col gap-[18px]', 'aria-label': 'Needs attention' },
})
export class NeedsAttentionComponent {
  readonly overdue = input(0);
  readonly unlabelled = input(0);

  protected readonly plural = plural;
}
