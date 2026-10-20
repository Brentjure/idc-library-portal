/** A catalogue title with how many physical copies exist and how many are on the shelf. */
export interface Book {
  id: number;
  categoryId: number;
  categoryName: string | null;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  publicationYear: number | null;
  description: string | null;
  coverImage: string | null;
  totalCopies: number;
  availableCopies: number;
}

/** One row of the Books page (GET /books/catalogue). */
export interface CatalogueEntry {
  id: number;
  title: string;
  author: string;
  publicationYear: number | null;
  categoryId: number;
  categoryName: string | null;
  isbn: string | null;
  /** Copies in stock (not lost or withdrawn). */
  totalCopies: number;
  availableCopies: number;
  onLoanCopies: number;
  timesBorrowed: number;
  addedAt: string | null;
  /** Codes of the copies in stock, for searching by the code inside the cover. */
  bookCodes: string[];
}

/** AVAILABLE, RESERVED, BORROWED, LOST or DAMAGED. Withdrawn copies are never sent. */
export type CopyStatus = 'AVAILABLE' | 'RESERVED' | 'BORROWED' | 'LOST' | 'DAMAGED';

export interface BookCopyDetail {
  id: number;
  bookCode: string;
  status: CopyStatus;
  condition: CopyCondition | 'DAMAGED';
  needsLabel: boolean;
  /** Null for copies added before donations were recorded. */
  source: 'DONATION' | 'PURCHASE' | null;
  donorName: string | null;
  borrowerName: string | null;
  dueDate: string | null;
}

/** One title with every copy (GET /books/{id}). */
export interface BookDetail {
  book: Book;
  onLoanCopies: number;
  timesBorrowed: number;
  addedAt: string | null;
  copies: BookCopyDetail[];
}

/** Corrections to a title (PUT /books/{id}). */
export interface BookUpdate {
  title: string;
  author: string;
  categoryId: number;
  isbn: string | null;
  publicationYear: number | null;
  publisher: string | null;
  description: string | null;
}

/** Where the ISBN lookup found a book. LIBRARY means it's already in our catalogue. */
export type IsbnSource = 'LIBRARY' | 'OPEN_LIBRARY' | 'GOOGLE_BOOKS' | 'NONE';

/** Book details found for an ISBN (GET /books/isbn/{isbn}), to fill in the add-book form. */
export interface IsbnLookup {
  isbn: string;
  source: IsbnSource;
  /** Whether the server may look books up online at all. */
  online: boolean;
  title: string | null;
  author: string | null;
  publisher: string | null;
  publicationYear: number | null;
  description: string | null;
  coverUrl: string | null;
  /** The catalogue title, when source is LIBRARY. */
  existingTitle: Book | null;
}

export interface Category {
  id: number;
  name: string;
}

/** Condition of a copy when it arrives. */
export type CopyCondition = 'NEW' | 'GOOD' | 'WORN';
