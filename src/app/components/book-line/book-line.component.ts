import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { coverColor } from '../../utils/format';

/**
 * One book on one line: a coloured spine, the title and a smaller line under it.
 * Extra content goes under the subtitle ([bookLineBelow]) or at the right end (default slot).
 *
 *   <app-book-line [title]="b.title" [subtitle]="b.author">
 *     <span class="text-good">2 on shelf</span>
 *   </app-book-line>
 */
@Component({
  selector: 'app-book-line',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-line.component.html',
  host: { class: 'flex w-full min-w-0 items-center gap-2.5' },
})
export class BookLineComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');

  protected readonly color = computed(() => coverColor(this.title()));
}
