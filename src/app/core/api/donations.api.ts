import { Injectable, inject } from '@angular/core';
import { DonationRequest, DonationResult } from '../models/donation.model';
import { ApiClient } from './api-client.service';

/** /api/v1/donations */
@Injectable({ providedIn: 'root' })
export class DonationsApi {
  private readonly api = inject(ApiClient);

  /** Saves the donation or purchase. The result lists each new copy with its code. */
  record(request: DonationRequest): Promise<DonationResult> {
    return this.api.post('/donations', request);
  }
}
