import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarItem {
  label: string;
  value: number;
  /** A smaller second line, e.g. the author. */
  hint?: string;
}

/**
 * A ranked list with one horizontal bar per row and its value at the tip. One series, so no legend: the card's
 * heading says what is measured.
 *
 *   <app-bar-list label="Loans by category" [items]="items" unit="loans" />
 */
@Component({
  selector: 'app-bar-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length) {
      <ol class="m-0 flex list-none flex-col gap-2.5 p-0" [attr.aria-label]="label()">
        @for (item of rows(); track $index) {
          <li class="grid grid-cols-[minmax(0,1fr)_minmax(90px,1.4fr)] items-center gap-3 text-[13px] max-[480px]:grid-cols-1 max-[480px]:gap-1">
            <span class="min-w-0">
              <b class="block truncate font-semibold">{{ item.label }}</b>
              @if (item.hint) {
                <small class="block truncate text-[11.5px] text-ink-3">{{ item.hint }}</small>
              }
            </span>
            <span class="flex items-center gap-2">
              <span class="h-3 rounded-r-[4px]" [style.width.%]="item.width" [style.background]="color()" aria-hidden="true"></span>
              <span class="text-ink-2 tabular-nums">{{ item.value }}<span class="sr-only"> {{ unit() }}</span></span>
            </span>
          </li>
        }
      </ol>
    } @else {
      <p class="m-0 text-[13px] text-ink-3">{{ emptyText() }}</p>
    }
  `,
  host: { class: 'block' },
})
export class BarListComponent {
  readonly label = input.required<string>();
  readonly items = input.required<BarItem[]>();
  /** Read after each value by screen readers, e.g. "loans". */
  readonly unit = input('');
  readonly color = input('var(--color-chart-1)');
  readonly emptyText = input('Nothing in this period.');

  protected readonly rows = computed(() => {
    const max = Math.max(1, ...this.items().map((i) => i.value));
    // Leave room for the value at the tip of the longest bar.
    return this.items().map((i) => ({ ...i, width: Math.max(2, (i.value / max) * 82) }));
  });
}
