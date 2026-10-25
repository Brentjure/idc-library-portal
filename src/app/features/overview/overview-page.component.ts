import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card.component';
import { SummaryStore } from '../desk/summary.store';
import { plural } from '../../utils/format';
import { BorrowedTodayComponent } from './borrowed-today/borrowed-today.component';
import { NeedsAttentionComponent } from './needs-attention/needs-attention.component';

/** The home page: four headline numbers, today's loans, and what needs attention. */
@Component({
  selector: 'app-overview-page',
  imports: [KpiCardComponent, BorrowedTodayComponent, NeedsAttentionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overview-page.component.html',
  host: { class: 'flex flex-col gap-[18px]' },
})
export class OverviewPageComponent {
  private static introPlayed = false;

  protected readonly summary = inject(SummaryStore).summary;
  /**
   * The staggered entrance and count-up play on the first visit only. Coming back later, the router's page
   * transition is enough (see "Page transitions" in styles.css).
   */
  protected readonly intro = !OverviewPageComponent.introPlayed;

  constructor() {
    OverviewPageComponent.introPlayed = true;
  }

  protected readonly titlesCaption = computed(() => {
    const titles = this.summary()?.titles;
    return titles === undefined ? '' : `${plural(titles, 'title')} in the catalogue`;
  });
}
