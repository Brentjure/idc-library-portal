import { computed, signal } from '@angular/core';
import { IsbnLookup } from '../../../core/models/book.model';
import { cleanIsbn, isValidIsbn } from '../book-rules';

export type IsbnLookupStatus = 'idle' | 'invalid' | 'looking' | 'done' | 'failed';

const SOURCE_NAMES: Record<string, string> = { OPEN_LIBRARY: 'Open Library', GOOGLE_BOOKS: 'Google Books' };

/**
 * Looks an ISBN up once it has been typed in full, and says what happened.
 * The lookup itself is passed in, so this class has no HTTP and is easy to test.
 */
export class IsbnLookupState {
  readonly status = signal<IsbnLookupStatus>('idle');
  readonly result = signal<IsbnLookup | null>(null);

  /** The hint under the ISBN field, and whether it's good news. */
  readonly note = computed((): { text: string; good: boolean } | null => {
    const result = this.result();
    switch (this.status()) {
      case 'invalid':
        return { text: 'This ISBN doesn’t look right. Check the digits.', good: false };
      case 'looking':
        return { text: 'Looking up this ISBN…', good: false };
      case 'failed':
        return { text: 'Couldn’t look this ISBN up. Fill in the details yourself.', good: false };
      case 'done':
        if (!result || result.source === 'LIBRARY') {
          return null; // The title note already says it's in the library.
        }
        if (result.source === 'NONE') {
          return {
            text: result.online ? 'Not found online. Fill in the details yourself.' : 'Not in the library yet. Fill in the details yourself.',
            good: false,
          };
        }
        return { text: `✓ Found on ${SOURCE_NAMES[result.source]}. Check the details before adding.`, good: true };
      default:
        return null;
    }
  });

  private lastIsbn = '';
  /** Answers to an older ISBN are ignored once a newer one is typed. */
  private ticket = 0;

  constructor(private readonly lookup: (isbn: string) => Promise<IsbnLookup>) {}

  /**
   * Call on every change to the ISBN field. Looks up a complete, valid ISBN once.
   * Resolves with the answer, or null when nothing new was looked up.
   */
  async check(raw: string): Promise<IsbnLookup | null> {
    const isbn = cleanIsbn(raw);
    if (isbn === this.lastIsbn) {
      return null;
    }
    this.cancel();
    this.lastIsbn = isbn;
    if (!isValidIsbn(isbn)) {
      // Only complain once it's the length of an ISBN; while typing, say nothing.
      this.status.set(isbn.length === 10 || isbn.length === 13 ? 'invalid' : 'idle');
      return null;
    }

    const ticket = this.ticket;
    this.status.set('looking');
    try {
      const result = await this.lookup(isbn);
      if (ticket !== this.ticket) {
        return null;
      }
      this.result.set(result);
      this.status.set('done');
      return result;
    } catch {
      if (ticket === this.ticket) {
        this.status.set('failed');
      }
      return null;
    }
  }

  reset(): void {
    this.cancel();
    this.lastIsbn = '';
    this.status.set('idle');
  }

  private cancel(): void {
    this.ticket++;
    this.result.set(null);
  }
}
