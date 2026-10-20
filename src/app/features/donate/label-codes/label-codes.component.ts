import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { BookLineComponent } from '../../../components/book-line/book-line.component';
import { DonatedCopy } from '../../../core/models/donation.model';
import { plural } from '../../../utils/format';

interface TitleGroup {
  title: string;
  author: string;
  copies: DonatedCopy[];
}

/**
 * After saving: every new copy has a code (BK-010001…). The librarian writes it in the book
 * and ticks it here. Codes are grouped by title.
 */
@Component({
  selector: 'app-label-codes',
  imports: [BookLineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './label-codes.component.html',
  styleUrl: './label-codes.component.css',
  host: { class: 'flex flex-col gap-[22px]' },
})
export class LabelCodesComponent {
  readonly copies = input.required<DonatedCopy[]>();
  readonly isPurchase = input(false);
  /** Shown in the intro, e.g. "from Grace Mensah". */
  readonly donorLabel = input('');
  /** Ids of the copies ticked as labelled (two-way). */
  readonly labelled = model<Set<number>>(new Set());

  protected readonly groups = computed<TitleGroup[]>(() => {
    const byTitle = new Map<number, TitleGroup>();
    for (const copy of this.copies()) {
      const group = byTitle.get(copy.titleId) ?? { title: copy.title, author: copy.author, copies: [] };
      group.copies.push(copy);
      byTitle.set(copy.titleId, group);
    }
    return [...byTitle.values()];
  });
  protected readonly doneCount = computed(() => this.labelled().size);
  protected readonly percentDone = computed(() => (this.copies().length ? (this.doneCount() / this.copies().length) * 100 : 0));

  protected readonly plural = plural;

  protected toggle(copyId: number): void {
    const next = new Set(this.labelled());
    if (next.has(copyId)) {
      next.delete(copyId);
    } else {
      next.add(copyId);
    }
    this.labelled.set(next);
  }

  protected markAll(): void {
    this.labelled.set(new Set(this.copies().map((copy) => copy.copyId)));
  }
}
