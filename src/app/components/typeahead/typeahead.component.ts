import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  TemplateRef,
  contentChild,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icons';

/**
 * A text field that searches as you type and shows the results underneath.
 * Arrow keys move, Enter picks, Esc closes. It waits 180 ms after the last key and ignores
 * answers that arrive after a newer search.
 *
 *   <app-typeahead label="Book title" inputId="borrow-book" [fetch]="searchBooks" (picks)="add($event)">
 *     <ng-template #row let-book> …how one result looks… </ng-template>
 *     <ng-template #none let-text> …shown when nothing matches (optional)… </ng-template>
 *   </app-typeahead>
 */
@Component({
  selector: 'app-typeahead',
  imports: [IconComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './typeahead.component.html',
  host: { class: 'relative block' },
})
export class TypeaheadComponent<T> implements OnDestroy {
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  /** Runs the search. Return the results to show. */
  readonly fetch = input.required<(query: string) => Promise<T[]>>();

  readonly placeholder = input('');
  readonly icon = input<IconName>('search');
  readonly inputMode = input('text');
  readonly optional = input(false);
  readonly disabled = input(false);
  /** Highlights the field once something has been chosen. */
  readonly picked = input(false);
  /** Characters needed before searching. */
  readonly minChars = input(1);
  /** Results that are shown but can't be picked (e.g. a book with no copy on the shelf). */
  readonly isDisabled = input<(item: T) => boolean>(() => false);
  /** Empties the field after a pick, for adding several items in a row. */
  readonly clearOnPick = input(false);

  /** The text in the field (two-way). */
  readonly text = model('');
  readonly picks = output<T>();
  /** Fires when the user edits the text, so the parent can drop an earlier pick. */
  readonly typed = output<string>();

  protected readonly rowTemplate = contentChild.required<TemplateRef<{ $implicit: T }>>('row');
  protected readonly noneTemplate = contentChild<TemplateRef<{ $implicit: string }>>('none');
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected readonly results = signal<T[]>([]);
  protected readonly isOpen = signal(false);
  protected readonly loading = signal(false);
  protected readonly highlighted = signal(0);

  private debounceTimer?: ReturnType<typeof setTimeout>;
  private latestSearch = 0;

  focus(): void {
    this.field().nativeElement.focus();
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.text.set(value);
    this.typed.emit(value);
    this.search();
  }

  protected onFocus(): void {
    if (!this.picked() && this.text().trim().length >= this.minChars()) {
      this.search();
    }
  }

  protected onBlur(): void {
    // Give a click on a result time to land before the list closes.
    setTimeout(() => this.isOpen.set(false), 150);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) {
      return;
    }
    const last = this.results().length - 1;
    if (event.key === 'ArrowDown') {
      this.highlighted.update((i) => Math.min(i + 1, last));
    } else if (event.key === 'ArrowUp') {
      this.highlighted.update((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      this.choose(this.highlighted());
    } else if (event.key === 'Escape') {
      this.isOpen.set(false);
      event.stopPropagation(); // don't close the drawer too
    } else {
      return;
    }
    event.preventDefault();
  }

  protected choose(index: number): void {
    const item = this.results()[index];
    if (item === undefined || this.isDisabled()(item)) {
      return;
    }
    this.isOpen.set(false);
    if (this.clearOnPick()) {
      this.text.set('');
    }
    this.picks.emit(item);
  }

  private search(): void {
    clearTimeout(this.debounceTimer);
    const query = this.text().trim();
    if (query.length < this.minChars()) {
      this.isOpen.set(false);
      return;
    }
    // Clear old results at once so Enter can't pick a row from an earlier search.
    this.results.set([]);
    this.loading.set(true);
    this.isOpen.set(true);
    const searchId = ++this.latestSearch;

    this.debounceTimer = setTimeout(async () => {
      let found: T[] = [];
      try {
        found = await this.fetch()(query);
      } catch {
        found = [];
      }
      if (searchId === this.latestSearch) {
        this.results.set(found);
        this.highlighted.set(0);
        this.loading.set(false);
      }
    }, 180);
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounceTimer);
  }
}
