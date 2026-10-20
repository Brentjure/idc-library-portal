import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BookLineComponent } from '../../../components/book-line/book-line.component';
import { EmptyStateComponent } from '../../../components/empty-state/empty-state.component';
import { capitalise, plural } from '../../../utils/format';
import { DraftBook } from '../donation.form';

/** The books added so far, with tags (copies, condition, new or extra) and any server errors. */
@Component({
  selector: 'app-draft-book-list',
  imports: [BookLineComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './draft-book-list.component.html',
  styleUrl: './draft-book-list.component.css',
})
export class DraftBookListComponent {
  readonly books = input.required<DraftBook[]>();
  /** Messages from the server, by book key. */
  readonly errors = input<Partial<Record<number, string[]>>>({});
  readonly isPurchase = input(false);
  readonly remove = output<number>();

  protected readonly plural = plural;
  protected readonly capitalise = capitalise;
}
