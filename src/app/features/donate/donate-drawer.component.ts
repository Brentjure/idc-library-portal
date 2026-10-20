import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { AlertComponent } from '../../components/alert/alert.component';
import { ChoiceChipsComponent, ChoiceOption } from '../../components/choice-chips/choice-chips.component';
import { DrawerComponent } from '../../components/drawer/drawer.component';
import { StepComponent } from '../../components/step/step.component';
import { SummaryTileComponent } from '../../components/summary-tile/summary-tile.component';
import { ToastService } from '../../components/toast/toast.service';
import { ApiError, errorMessage } from '../../core/api/api-client.service';
import { BooksApi } from '../../core/api/books.api';
import { DonationsApi } from '../../core/api/donations.api';
import { Category } from '../../core/models/book.model';
import { DonationResult, DonationSource } from '../../core/models/donation.model';
import { formatMedium, today } from '../../utils/dates';
import { plural } from '../../utils/format';
import { DeskService } from '../desk/desk.service';
import { AddBookFormComponent } from './add-book-form/add-book-form.component';
import { DonationForm, NewDraftBook } from './donation.form';
import { DonorStepComponent } from './donor-step/donor-step.component';
import { DraftBookListComponent } from './draft-book-list/draft-book-list.component';
import { LabelCodesComponent } from './label-codes/label-codes.component';
import { SheetUploadComponent } from './sheet-upload/sheet-upload.component';

type AddMode = 'one' | 'sheet';

const ADD_MODES: ChoiceOption<AddMode>[] = [
  { value: 'one', label: 'One by one' },
  { value: 'sheet', label: 'Upload Excel' },
];

/**
 * Donate a book / Add books. Two stages:
 * 1. the form: where the books come from, then the books (one by one or from Excel);
 * 2. after saving, labelling: tick each new code once it is written in the book.
 */
@Component({
  selector: 'app-donate-drawer',
  imports: [
    DrawerComponent, StepComponent, ChoiceChipsComponent, AlertComponent, SummaryTileComponent,
    DonorStepComponent, AddBookFormComponent, SheetUploadComponent, DraftBookListComponent, LabelCodesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './donate-drawer.component.html',
})
export class DonateDrawerComponent {
  protected readonly desk = inject(DeskService);
  private readonly booksApi = inject(BooksApi);
  private readonly donationsApi = inject(DonationsApi);
  private readonly toast = inject(ToastService);

  protected readonly form = new DonationForm();
  protected readonly categories = signal<Category[]>([]);
  protected readonly addMode = signal<AddMode>('one');
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  /** Set after saving: the new copies waiting for their labels. */
  protected readonly saved = signal<DonationResult | null>(null);
  protected readonly labelled = signal<Set<number>>(new Set());

  protected readonly addModes = ADD_MODES;
  protected readonly todayLabel = formatMedium(today());

  private readonly donorStep = viewChild(DonorStepComponent);
  private readonly addBookForm = viewChild(AddBookFormComponent);

  protected readonly isOpen = computed(() => this.desk.open() === 'donate');
  protected readonly allLabelled = computed(() => this.labelled().size === (this.saved()?.copies.length ?? 0));
  protected readonly booksHint = computed(() => {
    if (this.form.books().length) return this.form.countLabel();
    return this.form.isPurchase() ? 'Add each title that was bought' : 'Add each title they are giving';
  });

  protected readonly plural = plural;

  constructor() {
    // The sidebar and top bar choose donation or purchase; keep the form in step.
    effect(() => {
      const source = this.desk.donateSource();
      untracked(() => this.form.source.set(source));
    });
    effect(() => {
      if (!this.isOpen()) return;
      untracked(() => {
        void this.loadCategories();
        if (!this.saved()) setTimeout(() => this.focusFirstField(), 230);
      });
    });
  }

  protected changeSource(source: DonationSource): void {
    this.desk.donateSource.set(source);
    setTimeout(() => this.focusFirstField());
  }

  protected changeAddMode(mode: AddMode | null): void {
    if (mode) this.addMode.set(mode);
  }

  protected addBooks(books: NewDraftBook[]): void {
    this.form.addBooks(...books);
    const fromSpreadsheet = books.some((book) => book.fromSpreadsheet);
    if (fromSpreadsheet) {
      this.toast.show(`Added ${plural(books.length, 'title')} from the spreadsheet.`);
    }
  }

  protected cancel(): void {
    this.reset();
    this.desk.close();
  }

  protected async save(): Promise<void> {
    if (!this.form.canSave()) return;
    this.saving.set(true);
    this.error.set('');
    this.form.clearErrors();
    try {
      const result = await this.donationsApi.record(this.form.toRequest());
      this.desk.saved();
      this.labelled.set(new Set());
      this.saved.set(result);
    } catch (err) {
      this.error.set(errorMessage(err, 'Could not save. Please try again.'));
      if (err instanceof ApiError) this.form.showServerErrors(err.fieldErrors);
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Ends the labelling step. Saves the ticked codes; with `later`, the rest stay "needs a label".
   */
  protected async finishLabelling(later: boolean): Promise<void> {
    const result = this.saved();
    if (!result) return;
    const ticked = [...this.labelled()];
    this.saving.set(true);
    this.error.set('');
    try {
      if (ticked.length) {
        await this.booksApi.markLabelled(ticked);
        this.desk.saved();
      }
    } catch (err) {
      this.error.set(errorMessage(err, 'Could not save the labels. Please try again.'));
      return;
    } finally {
      this.saving.set(false);
    }

    const total = result.copies.length;
    const left = total - ticked.length;
    const purchase = result.source === 'PURCHASE';
    this.reset();
    if (later) {
      this.desk.close();
      this.toast.show(left ? `${plural(left, 'book')} still need${left === 1 ? 's' : ''} a label.` : 'Saved.');
    } else {
      this.toast.show(
        `${plural(total, purchase ? 'new book' : 'donated book')}${purchase ? '' : ` from ${result.donorLabel}`} labelled and ready to borrow.`,
      );
      setTimeout(() => this.focusFirstField());
    }
  }

  private reset(): void {
    this.donorStep()?.reset();
    this.form.reset();
    this.saved.set(null);
    this.labelled.set(new Set());
    this.error.set('');
  }

  private focusFirstField(): void {
    if (this.form.isPurchase()) {
      this.addBookForm()?.focus();
    } else {
      this.donorStep()?.focus();
    }
  }

  private async loadCategories(): Promise<void> {
    if (this.categories().length) return;
    try {
      this.categories.set(await this.booksApi.categories());
    } catch {
      this.error.set('Could not load the categories. Close and reopen to try again.');
    }
  }
}
