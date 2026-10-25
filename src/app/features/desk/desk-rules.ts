import { ChoiceOption } from '../../components/choice-chips/choice-chips.component';
import { CopyCondition } from '../../core/models/book.model';
import { ReturnCondition } from '../../core/models/loan.model';

/**
 * Front-desk rules in one place. The server enforces the same limits.
 * Change them here when the church confirms its real rules (docs/HANDOFF.md §5).
 */

/** Books one member may have out at the same time. */
export const MAX_BOOKS_PER_MEMBER = 5;

/** Loan period choices in days, and the one selected by default. */
export const LOAN_PERIOD_DAYS = [7, 14, 21] as const;
export const DEFAULT_LOAN_DAYS = 14;

/** How much longer staff can give a member on a book, in weeks, and the choice picked first. */
export const EXTENSION_WEEKS: readonly ChoiceOption<number>[] = [
  { value: 1, label: '+1 week' },
  { value: 2, label: '+2 weeks' },
  { value: 3, label: '+3 weeks' },
];
export const DEFAULT_EXTENSION_WEEKS = 2;

/** Category picked first when adding a new title. */
export const DEFAULT_CATEGORY = 'Christian Living';

export const COPY_CONDITIONS: readonly ChoiceOption<CopyCondition>[] = [
  { value: 'NEW', label: 'New' },
  { value: 'GOOD', label: 'Good' },
  { value: 'WORN', label: 'Worn' },
];

export const RETURN_CONDITIONS: readonly ChoiceOption<ReturnCondition>[] = [
  { value: 'GOOD', label: 'Good' },
  { value: 'WORN', label: 'Worn' },
  { value: 'DAMAGED', label: 'Damaged', danger: true },
];
