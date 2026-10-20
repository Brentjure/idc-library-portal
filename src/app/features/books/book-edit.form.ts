import { signal } from '@angular/core';
import { Book, BookUpdate } from '../../core/models/book.model';
import { MIN_PUBLICATION_YEAR, cleanIsbn, isValidIsbn, isValidYear } from '../donate/book-rules';

export type BookEditField = 'title' | 'author' | 'categoryId' | 'isbn' | 'publicationYear' | 'publisher' | 'description';

/** In the order they appear on the form, so the first problem gets the focus. */
const FIELD_ORDER: BookEditField[] = ['title', 'author', 'categoryId', 'isbn', 'publicationYear', 'publisher', 'description'];

/**
 * State and checks of the Edit book form. Plain signals with no HTTP, so it is easy to test.
 * The server checks everything again, including duplicates, and its field errors are shown the same way.
 */
export class BookEditForm {
  readonly title = signal('');
  readonly author = signal('');
  readonly categoryId = signal<number | null>(null);
  readonly isbn = signal('');
  readonly year = signal('');
  readonly publisher = signal('');
  readonly description = signal('');
  readonly errors = signal<Partial<Record<BookEditField, string>>>({});

  load(book: Book): void {
    this.title.set(book.title);
    this.author.set(book.author);
    this.categoryId.set(book.categoryId);
    this.isbn.set(book.isbn ?? '');
    this.year.set(book.publicationYear?.toString() ?? '');
    this.publisher.set(book.publisher ?? '');
    this.description.set(book.description ?? '');
    this.errors.set({});
  }

  /** Checks the form and shows what's wrong. True when it can be saved. */
  validate(currentYear = new Date().getFullYear()): boolean {
    const errors: Partial<Record<BookEditField, string>> = {};
    if (!this.title().trim()) errors.title = 'Enter the title.';
    if (!this.author().trim()) errors.author = 'Enter the author. Use “Unknown” if it isn’t printed on the book.';
    if (this.categoryId() === null) errors.categoryId = 'Choose a category.';
    const isbn = cleanIsbn(this.isbn());
    if (isbn && !isValidIsbn(isbn)) errors.isbn = 'That ISBN isn’t valid. Check the digits.';
    const year = this.year().trim();
    if (year && !isValidYear(Number(year))) {
      errors.publicationYear = `Enter a year between ${MIN_PUBLICATION_YEAR} and ${currentYear}.`;
    }
    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  /** Shows field errors from the server, e.g. "Another book already has this title and author". */
  showServerErrors(fieldErrors: Record<string, string>): void {
    const errors: Partial<Record<BookEditField, string>> = {};
    for (const [field, message] of Object.entries(fieldErrors)) {
      if ((FIELD_ORDER as string[]).includes(field)) {
        errors[field as BookEditField] = message;
      }
    }
    this.errors.set(errors);
  }

  /** The first field with a problem, for focus. */
  firstError(): BookEditField | null {
    const errors = this.errors();
    return FIELD_ORDER.find((field) => errors[field]) ?? null;
  }

  clearError(field: BookEditField): void {
    if (this.errors()[field]) {
      this.errors.update(({ [field]: _, ...rest }) => rest);
    }
  }

  toRequest(): BookUpdate {
    const categoryId = this.categoryId();
    if (categoryId === null) {
      throw new Error('Choose a category first');
    }
    return {
      title: this.title().trim(),
      author: this.author().trim(),
      categoryId,
      isbn: cleanIsbn(this.isbn()) || null,
      publicationYear: this.year().trim() ? Number(this.year().trim()) : null,
      publisher: this.publisher().trim() || null,
      description: this.description().trim() || null,
    };
  }
}
