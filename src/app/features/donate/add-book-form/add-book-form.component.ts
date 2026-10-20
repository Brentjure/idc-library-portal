import { ChangeDetectionStrategy, Component, WritableSignal, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { BookLineComponent } from '../../../components/book-line/book-line.component';
import { ChoiceChipsComponent } from '../../../components/choice-chips/choice-chips.component';
import { TypeaheadComponent } from '../../../components/typeahead/typeahead.component';
import { BooksApi } from '../../../core/api/books.api';
import { Book, Category, CopyCondition } from '../../../core/models/book.model';
import { plural } from '../../../utils/format';
import { COPY_CONDITIONS, DEFAULT_CATEGORY } from '../../desk/desk-rules';
import { cleanIsbn, isValidIsbn, isValidYear } from '../book-rules';
import { NewDraftBook } from '../donation.form';
import { IsbnLookupState } from './isbn-lookup';

const MAX_COPIES = 50;

/**
 * Add one title: type it (existing titles are suggested, so they become extra copies),
 * fill in the details of a new one, then the number of copies and their condition.
 */
@Component({
  selector: 'app-add-book-form',
  imports: [TypeaheadComponent, BookLineComponent, ChoiceChipsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-book-form.component.html',
  styleUrl: './add-book-form.component.css',
  host: { class: 'flex flex-col gap-3 rounded-[14px] border border-line bg-surface-2 p-3.5' },
})
export class AddBookFormComponent {
  private readonly booksApi = inject(BooksApi);

  readonly categories = input.required<Category[]>();
  /** Changes the button text: "Add to donation" or "Add to this batch". */
  readonly isPurchase = input(false);
  readonly added = output<NewDraftBook>();

  protected readonly title = signal('');
  /** The catalogue title picked from the suggestions, if any. */
  protected readonly match = signal<Book | null>(null);
  protected readonly author = signal('');
  protected readonly categoryId = signal<number | null>(null);
  protected readonly isbn = signal('');
  protected readonly publisher = signal('');
  protected readonly year = signal('');
  /** Only ever filled from the ISBN lookup; there's no field for it on this form. */
  private readonly description = signal('');
  protected readonly detailsOpen = signal(false);
  protected readonly isbnLookup = new IsbnLookupState((isbn) => this.booksApi.lookupIsbn(isbn));
  protected readonly copies = signal(1);
  protected readonly condition = signal<CopyCondition>('NEW');
  protected readonly error = signal('');

  protected readonly conditions = COPY_CONDITIONS;
  private readonly titleField = viewChild.required<TypeaheadComponent<Book>>('titleField');

  protected readonly canAdd = computed(() => !!this.title().trim() && (!!this.match() || !!this.author().trim()));
  protected readonly titleNote = computed(() => {
    const match = this.match();
    if (match) {
      return `✓ Already in the library (${plural(match.totalCopies, 'copy', 'copies')}). This adds more copies.`;
    }
    return this.title().trim().length > 2 ? 'New title. It will be added to the catalogue.' : '';
  });

  protected readonly searchTitles = (query: string) => this.booksApi.search(query, 6);
  /** Reads an input's text in the template: (input)="author.set(valueOf($event))". */
  protected readonly valueOf = valueOf;

  constructor() {
    // Pick the default category once the list has loaded.
    effect(() => {
      const categories = this.categories();
      if (this.categoryId() === null && categories.length) {
        this.categoryId.set((categories.find((c) => c.name === DEFAULT_CATEGORY) ?? categories[0]).id);
      }
    });
  }

  focus(): void {
    this.titleField().focus();
  }

  protected onTitleTyped(): void {
    if (this.match()) {
      this.match.set(null);
      this.author.set('');
    }
    this.error.set('');
  }

  protected onTitlePicked(book: Book): void {
    this.match.set(book);
    this.title.set(book.title);
    this.author.set(book.author);
    this.categoryId.set(book.categoryId);
  }

  protected async onIsbnTyped(value: string): Promise<void> {
    this.isbn.set(value);
    const found = await this.isbnLookup.check(value);
    if (!found || this.match()) {
      return;
    }
    if (found.source === 'LIBRARY' && found.existingTitle) {
      this.onTitlePicked(found.existingTitle);
      return;
    }
    // Fill in only what the person hasn't typed themselves.
    fillIfEmpty(this.title, found.title);
    fillIfEmpty(this.author, found.author);
    fillIfEmpty(this.publisher, found.publisher);
    fillIfEmpty(this.year, found.publicationYear?.toString() ?? null);
    fillIfEmpty(this.description, found.description);
    if (found.publisher || found.publicationYear) {
      this.detailsOpen.set(true);
    }
  }

  protected onDetailsToggled(event: Event): void {
    this.detailsOpen.set((event.target as HTMLDetailsElement).open);
  }

  protected changeCopies(by: number): void {
    this.copies.update((n) => clampCopies(n + by));
  }

  protected typeCopies(event: Event): void {
    this.copies.set(clampCopies(parseInt(valueOf(event), 10)));
  }

  protected add(): void {
    const isbn = cleanIsbn(this.isbn());
    const year = this.year().trim() ? Number(this.year().trim()) : null;
    if (isbn && !isValidIsbn(isbn)) {
      this.error.set('That ISBN isn’t valid. Check the digits, or leave it empty.');
      return;
    }
    if (year !== null && !isValidYear(year)) {
      this.error.set(`Year should be between 1450 and ${new Date().getFullYear()}.`);
      return;
    }

    const match = this.match();
    const categoryId = match ? match.categoryId : this.categoryId();
    this.added.emit({
      existing: match,
      fromSpreadsheet: false,
      title: match ? match.title : this.title().trim(),
      author: match ? match.author : this.author().trim(),
      categoryId,
      categoryName: this.categories().find((c) => c.id === categoryId)?.name ?? '',
      copies: this.copies(),
      condition: this.condition(),
      isbn: match ? '' : isbn,
      publisher: match ? '' : this.publisher().trim(),
      year: match ? null : year,
      description: match ? '' : this.description(),
    });
    this.clear();
    this.focus();
  }

  protected selectCategory(event: Event): void {
    this.categoryId.set(Number(valueOf(event)));
  }

  private clear(): void {
    this.title.set('');
    this.match.set(null);
    this.author.set('');
    this.isbn.set('');
    this.publisher.set('');
    this.year.set('');
    this.description.set('');
    this.detailsOpen.set(false);
    this.isbnLookup.reset();
    this.copies.set(1);
    this.error.set('');
  }
}

function valueOf(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function fillIfEmpty(field: WritableSignal<string>, value: string | null): void {
  if (value && !field().trim()) {
    field.set(value);
  }
}

function clampCopies(n: number): number {
  return Number.isFinite(n) ? Math.max(1, Math.min(MAX_COPIES, n)) : 1;
}
