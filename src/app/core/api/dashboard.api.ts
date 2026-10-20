import { Injectable, inject } from '@angular/core';
import { DashboardSummary } from '../models/dashboard.model';
import { ApiClient } from './api-client.service';

/** /api/v1/dashboard */
@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly api = inject(ApiClient);

  summary(): Promise<DashboardSummary> {
    return this.api.get('/dashboard/summary');
  }
}
