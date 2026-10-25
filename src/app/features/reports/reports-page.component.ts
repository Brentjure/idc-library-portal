import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { AlertComponent } from '../../components/alert/alert.component';
import { BarItem, BarListComponent } from '../../components/bar-list/bar-list.component';
import { ChartSeries, ColumnChartComponent, ColumnGroup } from '../../components/column-chart/column-chart.component';
import { IconComponent } from '../../components/icon/icon.component';
import { ToastService } from '../../components/toast/toast.service';
import { errorMessage } from '../../core/api/api-client.service';
import { ReportsApi } from '../../core/api/reports.api';
import { AuthService } from '../../core/auth/auth.service';
import { Report, ReportExport } from '../../core/models/report.model';
import { formatDate, formatDayMonth, isoDate, parseDate, today } from '../../utils/dates';
import { plural } from '../../utils/format';
import { DateRange, PRESETS, PeriodPreset, change, percent, presetRange } from './report-period';

const SERIES: ChartSeries[] = [
  { name: 'Loans', color: 'var(--color-chart-1)' },
  { name: 'Returns', color: 'var(--color-chart-2)' },
];

/**
 * Reports & Analytics for a chosen period, compared with the period just before: borrowing activity,
 * popular and unused books, donations and growth, and the most active borrowers. CSV downloads need reports.export.
 */
@Component({
  selector: 'app-reports-page',
  imports: [AlertComponent, BarListComponent, ColumnChartComponent, IconComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reports-page.component.html',
  host: { class: 'flex flex-col gap-[18px]' },
})
export class ReportsPageComponent {
  protected readonly auth = inject(AuthService);
  private readonly reportsApi = inject(ReportsApi);
  private readonly toast = inject(ToastService);

  protected readonly presets = PRESETS;
  protected readonly series = SERIES;
  protected readonly today = isoDate(today());

  protected readonly preset = signal<PeriodPreset>('this-month');
  protected readonly range = signal<DateRange>(presetRange('this-month', today()));
  protected readonly report = signal<Report | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly downloading = signal<ReportExport | null>(null);

  protected readonly canExport = computed(() => this.auth.can('reports.export'));
  protected readonly periodText = computed(() => {
    const r = this.report();
    if (!r) return '';
    return `${formatDate(r.period.from)} – ${formatDate(r.period.to)}, compared with ${formatDate(r.period.previousFrom)} – ${formatDate(r.period.previousTo)}`;
  });

  protected readonly tiles = computed(() => {
    const r = this.report();
    if (!r) return [];
    const a = r.activity;
    const p = r.previous;
    return [
      { label: 'Loans', value: String(a.loans), change: change(a.loans, p.loans) },
      { label: 'Returns', value: String(a.returns), change: change(a.returns, p.returns) },
      {
        label: 'Back on time',
        value: percent(a.onTimeReturns, a.returns),
        change: {
          text: (a.returns ? `${a.onTimeReturns} of ${a.returns} returns` : 'no returns yet') +
            (a.extensions ? ` · ${plural(a.extensions, 'extension')}` : ''),
          direction: 'same' as const,
        },
      },
      { label: 'Active borrowers', value: String(a.activeBorrowers), change: change(a.activeBorrowers, p.activeBorrowers) },
      { label: 'New members', value: String(a.newMembers), change: change(a.newMembers, p.newMembers) },
      {
        label: 'Books added',
        value: String(a.copiesDonated + a.copiesPurchased),
        change: { text: `${a.copiesDonated} donated · ${a.copiesPurchased} bought`, direction: 'same' as const },
      },
    ];
  });

  protected readonly groups = computed((): ColumnGroup[] => {
    const r = this.report();
    if (!r) return [];
    return r.timeline.map((p) => {
      const day = parseDate(p.start);
      const label =
        r.timelineUnit === 'MONTH' ? day.toLocaleDateString('en-GB', { month: 'short' }) : formatDayMonth(p.start);
      const title =
        r.timelineUnit === 'MONTH'
          ? day.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
          : r.timelineUnit === 'WEEK'
            ? `Week of ${formatDayMonth(p.start)}`
            : formatDate(p.start);
      return { label, title, values: [p.loans, p.returns] };
    });
  });
  protected readonly unitWord = computed(() => ({ DAY: 'day', WEEK: 'week', MONTH: 'month' })[this.report()?.timelineUnit ?? 'DAY']);

  protected readonly categories = computed((): BarItem[] =>
    (this.report()?.byCategory ?? []).map((c) => ({ label: c.category, value: c.loans })),
  );
  protected readonly popular = computed((): BarItem[] =>
    (this.report()?.popular ?? []).map((t) => ({ label: t.title, hint: t.author, value: t.loans })),
  );
  protected readonly unused = computed(() =>
    (this.report()?.unused.titles ?? []).map((t) => ({
      ...t,
      last: t.lastBorrowedAt ? `Last borrowed ${formatDate(t.lastBorrowedAt)}` : 'Never borrowed',
    })),
  );
  protected readonly donations = computed(() =>
    (this.report()?.donations ?? []).map((d) => ({ ...d, when: formatDate(d.receivedAt) })),
  );
  protected readonly donors = computed((): BarItem[] =>
    (this.report()?.topDonors ?? []).map((d) => ({ label: d.donor, hint: plural(d.donations, 'donation'), value: d.copies })),
  );
  protected readonly borrowers = computed((): BarItem[] =>
    (this.report()?.topBorrowers ?? []).map((b) => ({ label: b.name, hint: b.group ?? undefined, value: b.loans })),
  );

  protected readonly plural = plural;

  constructor() {
    effect(() => {
      const range = this.range();
      untracked(() => void this.load(range));
    });
  }

  protected choosePreset(preset: PeriodPreset): void {
    this.preset.set(preset);
    if (preset !== 'custom') this.range.set(presetRange(preset, today()));
  }

  protected setDate(which: 'from' | 'to', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;
    this.preset.set('custom');
    this.range.update((r) => ({ ...r, [which]: value }));
  }

  protected async download(name: ReportExport): Promise<void> {
    if (this.downloading()) return;
    const { from, to } = this.range();
    this.downloading.set(name);
    try {
      const blob = await this.reportsApi.csv(name, from, to);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `idc-library-${name}-${from}-to-${to}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      this.toast.show(errorMessage(err, 'Couldn’t download the report. Please try again.'));
    } finally {
      this.downloading.set(null);
    }
  }

  protected async load(range: DateRange = this.range()): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const report = await this.reportsApi.report(range.from, range.to);
      // Ignore the answer if another period was picked meanwhile.
      if (this.range() === range) this.report.set(report);
    } catch (err) {
      if (this.range() === range) this.error.set(errorMessage(err, 'Couldn’t load the reports. Please try again.'));
    } finally {
      if (this.range() === range) this.loading.set(false);
    }
  }
}
