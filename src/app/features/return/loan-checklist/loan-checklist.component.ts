import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BookLineComponent } from '../../../components/book-line/book-line.component';
import { ChoiceChipsComponent } from '../../../components/choice-chips/choice-chips.component';
import { Loan, ReturnCondition } from '../../../core/models/loan.model';
import { dueState, formatDayMonth } from '../../../utils/dates';
import { RETURN_CONDITIONS } from '../../desk/desk-rules';

/** A member's loans, each with a tick box. Ticked books show Good / Worn / Damaged. */
@Component({
  selector: 'app-loan-checklist',
  imports: [BookLineComponent, ChoiceChipsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loan-checklist.component.html',
  styleUrl: './loan-checklist.component.css',
})
export class LoanChecklistComponent {
  readonly loans = input.required<Loan[]>();
  /** transactionId → condition, for the ticked books. */
  readonly selected = input.required<Record<number, ReturnCondition>>();

  readonly toggled = output<Loan>();
  readonly conditionChanged = output<{ loan: Loan; condition: ReturnCondition }>();

  protected readonly conditions = RETURN_CONDITIONS;
  protected readonly dueState = dueState;
  protected readonly formatDayMonth = formatDayMonth;

  protected onCondition(loan: Loan, condition: ReturnCondition | null): void {
    if (condition) {
      this.conditionChanged.emit({ loan, condition });
    }
  }
}
