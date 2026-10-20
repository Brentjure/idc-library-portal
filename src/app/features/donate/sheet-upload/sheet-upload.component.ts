import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AlertComponent } from '../../../components/alert/alert.component';
import { IconComponent } from '../../../components/icon/icon.component';
import { Category } from '../../../core/models/book.model';
import { plural } from '../../../utils/format';
import { SheetRow, readDonationSheet } from '../donation-sheet';
import { NewDraftBook } from '../donation.form';

/**
 * Upload an Excel file of books: drop or choose a file, see which rows are ready and which need fixing,
 * then add the ready ones. Rows with problems are skipped.
 */
@Component({
  selector: 'app-sheet-upload',
  imports: [IconComponent, AlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sheet-upload.component.html',
  host: { class: 'flex flex-col gap-3' },
})
export class SheetUploadComponent {
  readonly categories = input.required<Category[]>();
  readonly isPurchase = input(false);
  readonly added = output<NewDraftBook[]>();

  protected readonly sheet = signal<{ fileName: string; rows: SheetRow[] } | null>(null);
  protected readonly error = signal('');
  protected readonly dragOver = signal(false);

  protected readonly readyRows = computed(() => this.sheet()?.rows.filter((row) => !row.errors.length) ?? []);
  protected readonly badCount = computed(() => (this.sheet()?.rows.length ?? 0) - this.readyRows().length);
  protected readonly readyCopies = computed(() => this.readyRows().reduce((sum, row) => sum + row.copies, 0));

  protected readonly plural = plural;

  protected onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.read(input.files?.[0]);
    input.value = ''; // so choosing the same file again still triggers a change
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    void this.read(event.dataTransfer?.files[0]);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  protected addReadyRows(): void {
    this.added.emit(this.readyRows().map((row) => this.toDraft(row)));
    this.sheet.set(null);
  }

  private async read(file: File | undefined): Promise<void> {
    if (!file) return;
    this.error.set('');
    const result = await readDonationSheet(file, this.categories().map((c) => c.name));
    if ('error' in result) {
      this.error.set(result.error);
    } else {
      this.sheet.set(result);
    }
  }

  private toDraft(row: SheetRow): NewDraftBook {
    const category = this.categories().find((c) => c.name.toLowerCase() === row.category.toLowerCase());
    return {
      existing: null,
      fromSpreadsheet: true,
      title: row.title,
      author: row.author,
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? row.category,
      copies: row.copies,
      condition: row.condition,
      isbn: row.isbn,
      publisher: row.publisher,
      year: row.year,
      description: row.description,
    };
  }
}
