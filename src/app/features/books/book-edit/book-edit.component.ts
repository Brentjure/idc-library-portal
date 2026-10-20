import { ChangeDetectionStrategy, Component, ElementRef, WritableSignal, computed, inject, input, output } from '@angular/core';
import { BookDetail, Category } from '../../../core/models/book.model';
import { coverColor, plural } from '../../../utils/format';
import { BookEditField, BookEditForm } from '../book-edit.form';

/** The edit mode of the book drawer: the title's details. Copies aren't touched. */
@Component({
  selector: 'app-book-edit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-edit.component.html',
  host: { class: 'flex flex-col gap-3.5' },
})
export class BookEditComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly form = input.required<BookEditForm>();
  readonly detail = input.required<BookDetail>();
  readonly categories = input.required<Category[]>();
  /** Enter in a field. */
  readonly submitted = output<void>();

  protected readonly cover = computed(() => coverColor(this.detail().book.title));
  protected readonly copiesLabel = computed(() => plural(this.detail().book.totalCopies, 'copy', 'copies'));

  /** Puts the cursor in a field, e.g. the first one with a problem. */
  focus(field: BookEditField = 'title'): void {
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>(`#book-edit-${field}`)?.focus());
  }

  protected set(field: BookEditField, target: WritableSignal<string>, event: Event): void {
    target.set((event.target as HTMLInputElement).value);
    this.form().clearError(field);
  }

  protected selectCategory(event: Event): void {
    this.form().categoryId.set(Number((event.target as HTMLSelectElement).value));
    this.form().clearError('categoryId');
  }
}
