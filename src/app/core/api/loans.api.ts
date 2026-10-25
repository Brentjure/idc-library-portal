import { Injectable, inject } from '@angular/core';
import { ExtendLoans, Loan, LoanPage, LoanQuery, LoanSummary, NewLoan, RegisterQuery, ReturnedBook } from '../models/loan.model';
import { ApiClient } from './api-client.service';

/** /api/v1/loans and /api/v1/returns */
@Injectable({ providedIn: 'root' })
export class LoansApi {
  private readonly api = inject(ApiClient);

  find(query: LoanQuery): Promise<Loan[]> {
    return this.api.get('/loans', { ...query });
  }

  /** One page of the Loans & Returns register. */
  register(query: RegisterQuery): Promise<LoanPage> {
    return this.api.get('/loans/register', { ...query });
  }

  summary(): Promise<LoanSummary> {
    return this.api.get('/loans/summary');
  }

  /** Gives one member more time on their books. 409 when a book is back or was already extended the most times. */
  extend(request: ExtendLoans): Promise<Loan[]> {
    return this.api.post('/loans/extensions', request);
  }

  /** Records that an overdue reminder was sent. */
  markReminded(transactionId: number): Promise<Loan> {
    return this.api.post(`/loans/${transactionId}/reminded`, {});
  }

  /** Hands the books over now. All or nothing. */
  lend(loan: NewLoan): Promise<Loan[]> {
    return this.api.post('/loans', loan);
  }

  receive(books: ReturnedBook[]): Promise<Loan[]> {
    return this.api.post('/returns', { items: books });
  }
}
