import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ChoiceChipsComponent, ChoiceOption } from '../../../components/choice-chips/choice-chips.component';
import { addDays, formatMedium, formatShort, isoDate, parseDate } from '../../../utils/dates';
import { LOAN_PERIOD_DAYS } from '../../desk/desk-rules';

/** 1 / 2 / 3 weeks chips (each showing the real date) plus a date picker for anything else. */
@Component({
  selector: 'app-loan-period',
  imports: [ChoiceChipsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loan-period.component.html',
})
export class LoanPeriodComponent {
  readonly startDate = input.required<Date>();
  readonly periodDays = input.required<number | null>();
  readonly dueDate = input.required<Date>();

  readonly periodPicked = output<number>();
  readonly datePicked = output<Date>();

  protected readonly options = computed<ChoiceOption<number>[]>(() =>
    LOAN_PERIOD_DAYS.map((days) => ({
      value: days,
      label: days === 7 ? '1 week' : `${days / 7} weeks`,
      hint: formatShort(addDays(this.startDate(), days)),
    })),
  );
  protected readonly startLabel = computed(() => formatMedium(this.startDate()));
  protected readonly minDue = computed(() => isoDate(addDays(this.startDate(), 1)));
  protected readonly dueValue = computed(() => isoDate(this.dueDate()));

  protected onDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.datePicked.emit(parseDate(value));
    }
  }

  protected onPeriodChange(days: number | null): void {
    if (days !== null) {
      this.periodPicked.emit(days);
    }
  }
}
