import { Injectable, inject } from '@angular/core';
import { Report, ReportExport } from '../models/report.model';
import { ApiClient } from './api-client.service';

/** /api/v1/reports */
@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private readonly api = inject(ApiClient);

  /** Both dates yyyy-MM-dd, inclusive. */
  report(from: string, to: string): Promise<Report> {
    return this.api.get('/reports', { from, to });
  }

  /** Needs reports.export. */
  csv(name: ReportExport, from: string, to: string): Promise<Blob> {
    return this.api.download(`/reports/${name}.csv`, { from, to });
  }
}
