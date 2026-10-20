import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The summary at the bottom of a drawer: a small calendar-style tile, a bold title and a line of text.
 *
 *   <app-summary-tile label="Oct" value="24" caption="Sat" title="2 books for Grace">
 *     Due back Sat 24 Oct
 *   </app-summary-tile>
 */
@Component({
  selector: 'app-summary-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './summary-tile.component.html',
  styleUrl: './summary-tile.component.css',
  host: { class: 'flex min-w-0 items-center gap-3 text-xs text-ink-3' },
})
export class SummaryTileComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly caption = input('');
  readonly title = input.required<string>();
}
