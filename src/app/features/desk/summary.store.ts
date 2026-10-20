import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { DashboardApi } from '../../core/api/dashboard.api';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { DeskService } from './desk.service';

/** Library counts for the overview, sidebar and drawer headers. Reloads after every desk save. */
@Injectable({ providedIn: 'root' })
export class SummaryStore {
  private readonly dashboardApi = inject(DashboardApi);
  private readonly auth = inject(AuthService);
  private readonly desk = inject(DeskService);

  readonly summary = signal<DashboardSummary | null>(null);

  constructor() {
    effect(() => {
      this.desk.changes(); // re-run after every save
      if (this.auth.isSignedIn()) {
        untracked(() => void this.reload());
      } else {
        this.summary.set(null);
      }
    });
  }

  async reload(): Promise<void> {
    if (!this.auth.can('loans.view')) {
      return;
    }
    try {
      this.summary.set(await this.dashboardApi.summary());
    } catch {
      // Counts are informative only; screens keep working without them.
    }
  }
}
