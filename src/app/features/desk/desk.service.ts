import { Injectable, signal } from '@angular/core';
import { Book } from '../../core/models/book.model';
import { DonationSource } from '../../core/models/donation.model';
import { Member } from '../../core/models/member.model';

export type DeskDrawer = 'borrow' | 'return' | 'donate' | 'extend' | null;

/** The person who has the books. memberId is null for old online requests made before members existed. */
export interface Borrower {
  memberId: number | null;
  name: string;
  phone: string | null;
}

/** What the return or extend drawer should show when opened from a button on a loan. */
export interface ReturnPrefill {
  memberId: number | null;
  memberName: string;
  memberPhone: string | null;
  transactionId: number;
}

/**
 * Which front-desk drawer is open (only one at a time), plus a counter that ticks after every save
 * so screens showing loans or counts know to reload.
 */
@Injectable({ providedIn: 'root' })
export class DeskService {
  readonly open = signal<DeskDrawer>(null);
  readonly donateSource = signal<DonationSource>('DONATION');
  readonly returnPrefill = signal<ReturnPrefill | null>(null);
  readonly extendPrefill = signal<ReturnPrefill | null>(null);
  /** A book to add to the borrow list once the member is chosen ("Borrow this book" on the Books page). */
  readonly borrowPrefill = signal<Book | null>(null);
  /** A member to start the borrow drawer with ("Lend books" on the Members page). */
  readonly borrowMember = signal<Member | null>(null);
  readonly changes = signal(0);

  openBorrow(book: Book | null = null, member: Member | null = null): void {
    this.borrowPrefill.set(book);
    this.borrowMember.set(member);
    this.open.set('borrow');
  }

  openReturn(prefill: ReturnPrefill | null = null): void {
    this.returnPrefill.set(prefill);
    this.open.set('return');
  }

  /** Extend: always about one member's books, opened from a loan. */
  openExtend(prefill: ReturnPrefill): void {
    this.extendPrefill.set(prefill);
    this.open.set('extend');
  }

  openDonate(source: DonationSource): void {
    this.donateSource.set(source);
    this.open.set('donate');
  }

  close(): void {
    this.open.set(null);
  }

  /** Call after any save that changes loans or books. */
  saved(): void {
    this.changes.update((n) => n + 1);
  }
}
