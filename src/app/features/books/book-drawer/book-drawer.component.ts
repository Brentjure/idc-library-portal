import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { AlertComponent } from '../../../components/alert/alert.component';
import { DrawerComponent } from '../../../components/drawer/drawer.component';
import { IconComponent } from '../../../components/icon/icon.component';
import { ToastService } from '../../../components/toast/toast.service';
import { ApiError, errorMessage } from '../../../core/api/api-client.service';
import { BooksApi } from '../../../core/api/books.api';
import { AuthService } from '../../../core/auth/auth.service';
import { Book, BookDetail, Category } from '../../../core/models/book.model';
import { BookDetailsComponent } from '../book-details/book-details.component';
import { BookEditForm } from '../book-edit.form';
import { BookEditComponent } from '../book-edit/book-edit.component';

type Mode = 'view' | 'edit';

/**
 * One title from the catalogue in a right-side drawer: its details and copies, or the edit form.
 * Delete and Borrow are handed back to the page, which owns the confirmation and the desk drawers.
 */
@Component({
  selector: 'app-book-drawer',
  imports: [DrawerComponent, AlertComponent, IconComponent, BookDetailsComponent, BookEditComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-drawer.component.html',
})
export class BookDrawerComponent {
  protected readonly auth = inject(AuthService);
  private readonly booksApi = inject(BooksApi);
  private readonly toast = inject(ToastService);

  /** The title to show; null closes the drawer. */
  readonly bookId = input<number | null>(null);
  /** Open straight on the edit form (the row's green pencil). */
  readonly startEditing = input(false);
  readonly categories = input.required<Category[]>();
  readonly closed = output<void>();
  /** After a save, so the page can reload its list. */
  readonly changed = output<void>();
  readonly deleteRequested = output<BookDetail>();
  readonly borrowRequested = output<Book>();

  protected readonly detail = signal<BookDetail | null>(null);
  protected readonly mode = signal<Mode>('view');
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly form = new BookEditForm();

  protected readonly isOpen = computed(() => this.bookId() !== null);
  protected readonly heading = computed(() => (this.mode() === 'edit' ? 'Edit book' : 'Book details'));
  protected readonly hint = computed(() =>
    this.mode() === 'edit' ? 'Changes apply to every copy of this title' : 'From the catalogue · title and copies',
  );

  private readonly editor = viewChild(BookEditComponent);
  /** Answers for a book that has since been closed or replaced are ignored. */
  private ticket = 0;

  constructor() {
    effect(() => {
      const id = this.bookId();
      const editing = this.startEditing();
      untracked(() => (id === null ? this.forget() : this.load(id, editing)));
    });
  }

  /** Called by the page after a delete is refused or a desk drawer saved, to show fresh numbers. */
  async reload(): Promise<void> {
    const id = this.bookId();
    if (id !== null) {
      await this.load(id, this.mode() === 'edit');
    }
  }

  protected edit(): void {
    const detail = this.detail();
    if (detail) {
      this.form.load(detail.book);
      this.mode.set('edit');
      // The edit fields only exist after this change is rendered.
      setTimeout(() => this.editor()?.focus());
    }
  }

  protected cancelEdit(): void {
    this.mode.set('view');
  }

  protected async save(): Promise<void> {
    const detail = this.detail();
    if (!detail || this.saving()) return;
    if (!this.form.validate()) {
      this.editor()?.focus(this.form.firstError() ?? 'title');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const saved = await this.booksApi.update(detail.book.id, this.form.toRequest());
      this.detail.set(saved);
      this.mode.set('view');
      this.changed.emit();
      this.toast.show(`Saved changes to “${saved.book.title}”.`);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        this.form.showServerErrors(err.fieldErrors);
        this.editor()?.focus(this.form.firstError() ?? 'title');
      } else {
        this.error.set(errorMessage(err, 'Couldn’t save the changes. Please try again.'));
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected close(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  private async load(id: number, editing: boolean): Promise<void> {
    const ticket = ++this.ticket;
    if (this.detail()?.book.id !== id) {
      this.detail.set(null);
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const detail = await this.booksApi.detail(id);
      if (ticket !== this.ticket) return;
      this.detail.set(detail);
      if (editing) {
        this.edit();
      } else {
        this.mode.set('view');
      }
    } catch (err) {
      if (ticket === this.ticket) {
        this.error.set(errorMessage(err, 'Couldn’t load this book. Please try again.'));
      }
    } finally {
      if (ticket === this.ticket) {
        this.loading.set(false);
      }
    }
  }

  private forget(): void {
    this.ticket++;
    this.mode.set('view');
    this.error.set('');
    // Keep the old detail while the drawer slides out, so it doesn't go blank mid-animation.
  }
}
