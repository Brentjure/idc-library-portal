import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BookLineComponent } from '../../../components/book-line/book-line.component';
import { EmptyStateComponent } from '../../../components/empty-state/empty-state.component';
import { Book } from '../../../core/models/book.model';

/** The books about to be handed over, each with a × to remove it. */
@Component({
  selector: 'app-book-cart',
  imports: [BookLineComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-cart.component.html',
})
export class BookCartComponent {
  readonly books = input.required<Book[]>();
  /** Shown when the list is empty. */
  readonly emptyText = input('');
  readonly remove = output<Book>();
}
