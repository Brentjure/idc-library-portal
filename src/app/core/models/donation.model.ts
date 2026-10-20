import { CopyCondition } from './book.model';

export type DonationSource = 'DONATION' | 'PURCHASE';

/** One line of a donation: an existing title (titleId) or the details of a new one. */
export interface DonationBookLine {
  titleId?: number;
  title?: string;
  author?: string;
  categoryId?: number;
  categoryName?: string;
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  description?: string;
  copies: number;
  condition: CopyCondition;
}

export interface DonationRequest {
  source: DonationSource;
  /** Left out for church purchases. */
  donor?: { memberId?: number; name?: string; phone?: string; anonymous: boolean };
  books: DonationBookLine[];
}

/** A new physical copy and the code to write in it. */
export interface DonatedCopy {
  copyId: number;
  bookCode: string;
  titleId: number;
  title: string;
  author: string;
  condition: CopyCondition;
}

export interface DonationResult {
  donationId: number;
  source: DonationSource;
  donorLabel: string;
  newTitles: number;
  copies: DonatedCopy[];
}
