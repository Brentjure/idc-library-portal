import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BookCopyDetail, BookDetail } from '../../../core/models/book.model';
import { formatDate, formatDayMonth } from '../../../utils/dates';
import { capitalise, coverColor } from '../../../utils/format';

/** Where a copy is, how it reads on one line, and its pill. */
interface CopyLine {
  copy: BookCopyDetail;
  where: string;
  facts: string;
  pill: { text: string; css: string };
}

/** The view mode of the book drawer: cover, counts, details and every copy. */
@Component({
  selector: 'app-book-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-details.component.html',
  host: { class: 'flex flex-col gap-5' },
})
export class BookDetailsComponent {
  readonly detail = input.required<BookDetail>();

  protected readonly book = computed(() => this.detail().book);
  protected readonly cover = computed(() => `linear-gradient(160deg, ${coverColor(this.book().title)}, #2A1D0C)`);
  protected readonly added = computed(() => (this.detail().addedAt ? formatDate(this.detail().addedAt!) : '—'));
  protected readonly copies = computed(() => this.detail().copies.map(copyLine));
}

function copyLine(copy: BookCopyDetail): CopyLine {
  const condition = `${capitalise(copy.condition)} condition`;
  const source =
    copy.source === 'PURCHASE' ? 'Bought by the church' : copy.source === 'DONATION' ? `Donated by ${copy.donorName ?? 'a member'}` : '';
  switch (copy.status) {
    case 'BORROWED':
      return {
        copy,
        where: `On loan · ${copy.borrowerName ?? 'a member'}`,
        facts: [copy.dueDate ? `Due back ${formatDayMonth(copy.dueDate)}` : '', condition, source].filter(Boolean).join(' · '),
        pill: { text: 'On loan', css: 'pill-loan' },
      };
    case 'RESERVED':
      return { copy, where: 'Set aside for a reservation', facts: join(condition, source), pill: { text: 'Reserved', css: 'pill-gold' } };
    case 'LOST':
      return { copy, where: 'Lost', facts: join(condition, source), pill: { text: 'Lost', css: 'pill-bad' } };
    case 'DAMAGED':
      return { copy, where: 'Damaged, off the shelf', facts: source, pill: { text: 'Damaged', css: 'pill-bad' } };
    default:
      return copy.needsLabel
        ? { copy, where: 'On shelf · needs a label', facts: join(condition, source), pill: { text: 'Label', css: 'pill-gold' } }
        : { copy, where: 'On shelf', facts: join(condition, source), pill: { text: 'Available', css: 'pill-ok' } };
  }
}

function join(...parts: string[]): string {
  return parts.filter(Boolean).join(' · ');
}
