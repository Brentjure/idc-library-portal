import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { AlertComponent } from '../../components/alert/alert.component';
import { ChoiceChipsComponent, ChoiceOption } from '../../components/choice-chips/choice-chips.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../components/icon/icon.component';
import { ToastService } from '../../components/toast/toast.service';
import { errorMessage } from '../../core/api/api-client.service';
import { BooksApi } from '../../core/api/books.api';
import { AuthService } from '../../core/auth/auth.service';
import { Book, BookDetail, CatalogueEntry, Category } from '../../core/models/book.model';
import { formatDate, formatDayMonth } from '../../utils/dates';
import { coverColor, plural } from '../../utils/format';
import { DeskService } from '../desk/desk.service';
import { BookDrawerComponent } from './book-drawer/book-drawer.component';
import {
  Availability,
  CatalogueSort,
  catalogueStats,
  categoryCounts,
  filterCatalogue,
  shelfStatus,
  sortCatalogue,
} from './catalogue';

const AVAILABILITY: ChoiceOption<Availability>[] = [
  { value: 'all', label: 'All' },
  { value: 'in', label: 'On shelf' },
  { value: 'out', label: 'All out' },
];

const SORTS: { value: CatalogueSort; label: string }[] = [
  { value: 'title', label: 'Title A–Z' },
  { value: 'popular', label: 'Most borrowed' },
  { value: 'recent', label: 'Recently added' },
  { value: 'out', label: 'Fewest on shelf' },
];

/** At most this many little blocks per row; more copies show a "+". */
const MAX_DOTS = 8;

/**
 * The catalogue: totals, search, filters and sort, one row per title. A row opens the book drawer;
 * the green pencil opens it on the edit form; the red bin asks before deleting.
 */
@Component({
  selector: 'app-books-page',
  imports: [AlertComponent, ChoiceChipsComponent, ConfirmDialogComponent, IconComponent, BookDrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './books-page.component.html',
  host: { class: 'flex flex-col gap-[18px]' },
})
export class BooksPageComponent {
  protected readonly auth = inject(AuthService);
  private readonly desk = inject(DeskService);
  private readonly booksApi = inject(BooksApi);
  private readonly toast = inject(ToastService);

  protected readonly entries = signal<CatalogueEntry[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly query = signal('');
  protected readonly categoryId = signal<number | null>(null);
  protected readonly availability = signal<Availability>('all');
  protected readonly sort = signal<CatalogueSort>('title');

  /** The book in the drawer, and whether it opened on the edit form. */
  protected readonly openId = signal<number | null>(null);
  protected readonly openEditing = signal(false);

  /** The book being deleted: confirm, or explain why it can't be yet. */
  protected readonly deleting = signal<BookDetail | null>(null);
  protected readonly deleteBusy = signal(false);
  protected readonly deleteError = signal('');

  protected readonly availabilityOptions = AVAILABILITY;
  protected readonly sorts = SORTS;

  protected readonly stats = computed(() => catalogueStats(this.entries()));
  protected readonly chips = computed(() => categoryCounts(this.entries()));
  protected readonly rows = computed(() =>
    sortCatalogue(
      filterCatalogue(this.entries(), { query: this.query(), categoryId: this.categoryId(), availability: this.availability() }),
      this.sort(),
    ).map((entry) => ({
      entry,
      status: shelfStatus(entry),
      color: coverColor(entry.title),
      dots: Array.from({ length: Math.min(entry.totalCopies, MAX_DOTS) }, (_, i) => i < entry.availableCopies),
      more: entry.totalCopies > MAX_DOTS,
      added: entry.addedAt ? formatDate(entry.addedAt) : '—',
    })),
  );
  protected readonly isFiltered = computed(
    () => !!this.query().trim() || this.categoryId() !== null || this.availability() !== 'all',
  );

  /** Copies that block the delete: on loan or set aside. */
  protected readonly blockingCopies = computed(() =>
    (this.deleting()?.copies ?? []).filter((c) => c.status === 'BORROWED' || c.status === 'RESERVED'),
  );
  protected readonly deleteHeading = computed(() => {
    const detail = this.deleting();
    if (!detail) return '';
    return this.blockingCopies().length ? 'This book can’t be deleted yet' : `Delete “${detail.book.title}”?`;
  });

  protected readonly plural = plural;
  protected readonly formatDayMonth = formatDayMonth;

  private readonly drawer = viewChild(BookDrawerComponent);

  constructor() {
    void this.loadCategories();
    // Load now, and again whenever a desk drawer saves (a loan, a return or new books change the counts).
    effect(() => {
      this.desk.changes();
      untracked(() => {
        void this.load();
        void this.drawer()?.reload();
      });
    });
  }

  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected setSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as CatalogueSort);
  }

  protected clearFilters(): void {
    this.query.set('');
    this.categoryId.set(null);
    this.availability.set('all');
  }

  protected open(entry: CatalogueEntry, editing = false): void {
    this.openEditing.set(editing);
    this.openId.set(entry.id);
  }

  protected closeDrawer(): void {
    this.openId.set(null);
  }

  protected addBooks(): void {
    this.desk.openDonate('PURCHASE');
  }

  protected borrow(book: Book): void {
    this.closeDrawer();
    this.desk.openBorrow(book);
  }

  /** From a row: fetch the copies first, so the dialog can say who has them. */
  protected async askDeleteRow(entry: CatalogueEntry): Promise<void> {
    try {
      this.askDelete(await this.booksApi.detail(entry.id));
    } catch (err) {
      this.toast.show(errorMessage(err, 'Couldn’t load this book. Please try again.'));
    }
  }

  protected askDelete(detail: BookDetail): void {
    this.deleteError.set('');
    this.deleting.set(detail);
  }

  protected cancelDelete(): void {
    this.deleting.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const detail = this.deleting();
    if (!detail || this.deleteBusy()) return;
    this.deleteBusy.set(true);
    this.deleteError.set('');
    try {
      await this.booksApi.remove(detail.book.id);
      this.deleting.set(null);
      if (this.openId() === detail.book.id) {
        this.closeDrawer();
      }
      this.entries.update((list) => list.filter((e) => e.id !== detail.book.id));
      if (this.categoryId() !== null && !this.entries().some((e) => e.categoryId === this.categoryId())) {
        this.categoryId.set(null);
      }
      this.toast.show(`Deleted “${detail.book.title}” and its ${plural(detail.book.totalCopies, 'copy', 'copies')}.`);
      this.desk.saved();
    } catch (err) {
      // Most likely someone borrowed a copy meanwhile: say why, and show the current copies.
      this.deleteError.set(errorMessage(err, 'Couldn’t delete this book. Please try again.'));
      try {
        this.deleting.set(await this.booksApi.detail(detail.book.id));
      } catch {
        // Keep what we have.
      }
    } finally {
      this.deleteBusy.set(false);
    }
  }

  protected async load(): Promise<void> {
    this.error.set('');
    try {
      this.entries.set(await this.booksApi.catalogue());
    } catch (err) {
      this.error.set(errorMessage(err, 'Couldn’t load the catalogue. Please try again.'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      this.categories.set(await this.booksApi.categories());
    } catch {
      // The edit form shows an empty list; saving then reports the problem.
    }
  }
}
