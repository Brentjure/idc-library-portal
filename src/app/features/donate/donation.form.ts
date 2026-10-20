import { computed, signal } from '@angular/core';
import { Book, CopyCondition } from '../../core/models/book.model';
import { DonationBookLine, DonationRequest, DonationSource } from '../../core/models/donation.model';
import { Member } from '../../core/models/member.model';
import { plural } from '../../utils/format';

/** A book waiting to be saved: extra copies of an existing title, or a new title. */
export interface DraftBook {
  /** Local id for the list; not sent to the server. */
  key: number;
  /** Set when the title is already in the catalogue. */
  existing: Book | null;
  fromSpreadsheet: boolean;
  title: string;
  author: string;
  categoryId: number | null;
  categoryName: string;
  copies: number;
  condition: CopyCondition;
  isbn: string;
  publisher: string;
  year: number | null;
  description: string;
}

export type NewDraftBook = Omit<DraftBook, 'key'>;

/**
 * State and rules of the Donate / Add books drawer: where the books come from, the list of books,
 * and the errors the server sent back for each. Plain signals with no HTTP or DOM, so it is easy to test.
 */
export class DonationForm {
  readonly source = signal<DonationSource>('DONATION');
  readonly donorMember = signal<Member | null>(null);
  /** What is typed in the donor fields, for a visitor who isn't a member. */
  readonly donorName = signal('');
  readonly donorPhone = signal('');
  readonly anonymous = signal(false);

  readonly books = signal<DraftBook[]>([]);
  /** Server messages per book (by key) and for the donor. */
  readonly bookErrors = signal<Partial<Record<number, string[]>>>({});
  readonly donorError = signal('');

  private nextKey = 1;

  readonly isPurchase = computed(() => this.source() === 'PURCHASE');

  /** A donation needs a member, a typed name, or "anonymous". A purchase needs no donor. */
  readonly donorOk = computed(
    () => this.isPurchase() || this.anonymous() || !!this.donorMember() || this.donorName().trim().length >= 2,
  );

  /** "Grace Mensah", "an anonymous donor" or "a church purchase", for messages. */
  readonly donorLabel = computed(() => {
    if (this.isPurchase()) return 'a church purchase';
    if (this.anonymous()) return 'an anonymous donor';
    return this.donorMember()?.fullName ?? this.donorName().trim();
  });

  readonly totalCopies = computed(() => this.books().reduce((sum, book) => sum + book.copies, 0));
  readonly canSave = computed(() => this.donorOk() && this.books().length > 0);

  /** "3 copies · 2 titles" */
  readonly countLabel = computed(
    () => `${plural(this.totalCopies(), 'copy', 'copies')} · ${plural(this.books().length, 'title')}`,
  );

  /** Anonymous donors can't also be a member. */
  setAnonymous(on: boolean): void {
    this.anonymous.set(on);
    if (on) {
      this.donorMember.set(null);
      this.donorName.set('');
      this.donorPhone.set('');
    }
  }

  addBooks(...books: NewDraftBook[]): void {
    this.books.update((list) => [...list, ...books.map((book) => ({ ...book, key: this.nextKey++ }))]);
  }

  removeBook(key: number): void {
    this.books.update((list) => list.filter((book) => book.key !== key));
    this.bookErrors.update((errors) => {
      const rest = { ...errors };
      delete rest[key];
      return rest;
    });
  }

  toRequest(): DonationRequest {
    return {
      source: this.source(),
      donor: this.donorForRequest(),
      books: this.books().map(toBookLine),
    };
  }

  /**
   * Shows the server's field errors next to the right book.
   * "books[2].author" belongs to the third book in the list; "donor.name" to the donor fields.
   */
  showServerErrors(fieldErrors: Record<string, string>): void {
    const list = this.books();
    const perBook: Partial<Record<number, string[]>> = {};
    let donorError = '';
    for (const [field, message] of Object.entries(fieldErrors)) {
      const index = /^books\[(\d+)]/.exec(field)?.[1];
      const book = index !== undefined ? list[Number(index)] : undefined;
      if (book) {
        (perBook[book.key] ??= []).push(message);
      } else if (field.startsWith('donor')) {
        donorError = message;
      }
    }
    this.bookErrors.set(perBook);
    this.donorError.set(donorError);
  }

  clearErrors(): void {
    this.bookErrors.set({});
    this.donorError.set('');
  }

  /** Empties the form for the next donor. The source (donation or purchase) stays. */
  reset(): void {
    this.donorMember.set(null);
    this.donorName.set('');
    this.donorPhone.set('');
    this.anonymous.set(false);
    this.books.set([]);
    this.clearErrors();
  }

  private donorForRequest(): DonationRequest['donor'] {
    if (this.isPurchase()) return undefined;
    if (this.anonymous()) return { anonymous: true };
    const member = this.donorMember();
    if (member) return { memberId: member.id, anonymous: false };
    return { name: this.donorName().trim(), phone: this.donorPhone().trim() || undefined, anonymous: false };
  }
}

/** An existing title only needs its id; a new one sends all its details. */
function toBookLine(book: DraftBook): DonationBookLine {
  if (book.existing) {
    return { titleId: book.existing.id, copies: book.copies, condition: book.condition };
  }
  return {
    title: book.title,
    author: book.author,
    categoryId: book.categoryId ?? undefined,
    categoryName: book.categoryId ? undefined : book.categoryName,
    isbn: book.isbn || undefined,
    publisher: book.publisher || undefined,
    publicationYear: book.year ?? undefined,
    description: book.description || undefined,
    copies: book.copies,
    condition: book.condition,
  };
}
