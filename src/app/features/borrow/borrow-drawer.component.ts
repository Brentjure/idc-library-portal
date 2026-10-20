import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { AlertComponent } from '../../components/alert/alert.component';
import { BookLineComponent } from '../../components/book-line/book-line.component';
import { DrawerComponent } from '../../components/drawer/drawer.component';
import { StepComponent } from '../../components/step/step.component';
import { SummaryTileComponent } from '../../components/summary-tile/summary-tile.component';
import { ToastService } from '../../components/toast/toast.service';
import { TypeaheadComponent } from '../../components/typeahead/typeahead.component';
import { errorMessage } from '../../core/api/api-client.service';
import { BooksApi } from '../../core/api/books.api';
import { LoansApi } from '../../core/api/loans.api';
import { Book } from '../../core/models/book.model';
import { Member } from '../../core/models/member.model';
import { formatMedium, formatShort } from '../../utils/dates';
import { plural } from '../../utils/format';
import { MAX_BOOKS_PER_MEMBER } from '../desk/desk-rules';
import { DeskService } from '../desk/desk.service';
import { MemberPickerComponent } from '../desk/member-picker/member-picker.component';
import { SummaryStore } from '../desk/summary.store';
import { BookCartComponent } from './book-cart/book-cart.component';
import { BorrowForm } from './borrow.form';
import { LoanPeriodComponent } from './loan-period/loan-period.component';

/**
 * Borrow books: pick the member, add their books, choose when they come back, save.
 * The rules live in BorrowForm; this component wires the steps together and saves.
 */
@Component({
  selector: 'app-borrow-drawer',
  imports: [
    DrawerComponent, StepComponent, TypeaheadComponent, BookLineComponent, AlertComponent, SummaryTileComponent,
    MemberPickerComponent, BookCartComponent, LoanPeriodComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './borrow-drawer.component.html',
})
export class BorrowDrawerComponent {
  protected readonly desk = inject(DeskService);
  protected readonly summary = inject(SummaryStore);
  private readonly booksApi = inject(BooksApi);
  private readonly loansApi = inject(LoansApi);
  private readonly toast = inject(ToastService);

  protected readonly form = new BorrowForm();
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly maxBooks = MAX_BOOKS_PER_MEMBER;
  protected readonly todayLabel = formatMedium(this.form.startDate);

  private readonly memberPicker = viewChild.required(MemberPickerComponent);
  private readonly bookField = viewChild.required<TypeaheadComponent<Book>>('bookField');

  protected readonly isOpen = computed(() => this.desk.open() === 'borrow');
  protected readonly booksHint = computed(() => {
    if (!this.form.member()) return 'Select the member first';
    const left = this.form.booksLeft();
    return left > 0 ? `${left} more allowed today` : `Limit of ${MAX_BOOKS_PER_MEMBER} books reached`;
  });
  protected readonly bookPlaceholder = computed(() => {
    if (!this.form.member()) return 'Select the member first';
    return this.form.booksLeft() > 0 ? 'Search by book title' : 'Borrowing limit reached';
  });

  protected readonly searchBooks = (query: string) => this.booksApi.search(query);
  protected readonly cannotAdd = (book: Book) => !this.form.canAdd(book);
  protected readonly plural = plural;
  protected readonly formatShort = formatShort;

  constructor() {
    // When the drawer opens, put the cursor where the librarian will type first.
    effect(() => {
      if (this.isOpen()) {
        setTimeout(() => (this.form.member() ? this.bookField().focus() : this.memberPicker().focus()), 230);
      }
    });
    // Opened with a book ("Borrow this book" on the Books page): start a fresh loan with it.
    effect(() => {
      const book = this.desk.borrowPrefill();
      if (book && this.isOpen()) {
        untracked(() => {
          this.memberPicker().reset();
          this.form.startWith(book);
          this.error.set('');
          this.desk.borrowPrefill.set(null);
        });
      }
    });
    // Opened for a member ("Lend books" on the Members page): start a fresh loan with them picked.
    effect(() => {
      const member = this.desk.borrowMember();
      if (member && this.isOpen()) {
        untracked(() => {
          this.memberPicker().reset();
          this.form.reset();
          this.onMemberChange(member);
          this.desk.borrowMember.set(null);
        });
      }
    });
  }

  protected onMemberChange(member: Member | null): void {
    this.form.setMember(member);
    this.error.set('');
    if (member) {
      setTimeout(() => this.bookField().focus());
    }
  }

  protected availability(book: Book): { text: string; css: string } {
    if (this.form.isAdded(book)) return { text: 'Added', css: 'text-ink-3' };
    if (!book.availableCopies) return { text: 'All copies out', css: 'text-bad' };
    return { text: `${book.availableCopies} of ${book.totalCopies} on shelf`, css: 'text-good' };
  }

  protected cancel(): void {
    this.reset();
    this.desk.close();
  }

  /** Saves the loan. `next` keeps the drawer open for the next member in the queue. */
  protected async save(next: boolean): Promise<void> {
    const member = this.form.member();
    if (!member || !this.form.canSave()) {
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const dueDate = this.form.dueDate();
      const loans = await this.loansApi.lend(this.form.toRequest());
      this.desk.saved();
      this.reset();
      this.toast.show(
        `Saved ${plural(loans.length, 'book')} for ${member.fullName}. Due back ${formatShort(dueDate)}.` +
          (next ? ' Ready for the next member.' : ''),
      );
      if (next) {
        setTimeout(() => this.memberPicker().focus());
      } else {
        this.desk.close();
      }
    } catch (err) {
      this.error.set(errorMessage(err, 'Could not save. Please try again.'));
    } finally {
      this.saving.set(false);
    }
  }

  private reset(): void {
    this.memberPicker().reset();
    this.form.reset();
    this.error.set('');
  }
}
