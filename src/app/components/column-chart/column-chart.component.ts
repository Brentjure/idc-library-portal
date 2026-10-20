import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { compactNumber, niceTicks } from '../../utils/chart';

export interface ChartSeries {
  name: string;
  /** A CSS colour, e.g. var(--color-chart-1). Never used for text. */
  color: string;
}

export interface ColumnGroup {
  /** Under the axis, e.g. "12 Oct". Shown on some groups only when there are many. */
  label: string;
  /** In the tooltip and table, e.g. "Week of 12 Oct". */
  title: string;
  /** One value per series, in series order. */
  values: number[];
}

/** Bars per group are capped at this width; the rest of the slot is air. */
const MAX_BAR_PX = 24;

/**
 * Grouped columns over time: one column per series in each group, a shared 0-based axis, a legend for two or
 * more series, a tooltip on hover or focus, and a table view so nothing depends on colour alone.
 *
 *   <app-column-chart label="Loans and returns per week" [series]="series" [groups]="groups" />
 */
@Component({
  selector: 'app-column-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './column-chart.component.html',
  // Scrolling moves the bars without a mouseleave, so drop the tooltip.
  host: { class: 'block', '(window:scroll)': 'active.set(null)' },
})
export class ColumnChartComponent {
  /** What the chart shows; read by screen readers and used as the table caption. */
  readonly label = input.required<string>();
  readonly series = input.required<ChartSeries[]>();
  readonly groups = input.required<ColumnGroup[]>();
  /** Plot height in px. */
  readonly height = input(180);

  protected readonly showTable = signal(false);
  protected readonly active = signal<number | null>(null);

  protected readonly ticks = computed(() => niceTicks(Math.max(0, ...this.groups().flatMap((g) => g.values))));
  protected readonly top = computed(() => this.ticks()[this.ticks().length - 1] || 1);
  protected readonly tickLabels = computed(() => [...this.ticks()].reverse().map(compactNumber));
  /** With many groups, label about eight of them so the labels don't collide. */
  protected readonly labelEvery = computed(() => Math.max(1, Math.ceil(this.groups().length / 8)));
  protected readonly barWidth = MAX_BAR_PX;
  protected readonly empty = computed(() => this.groups().every((g) => g.values.every((v) => v === 0)));

  protected heightOf(value: number): number {
    return (value / this.top()) * 100;
  }
}
