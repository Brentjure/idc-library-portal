import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';
import { ChoiceChipsComponent, ChoiceOption } from '../../../components/choice-chips/choice-chips.component';
import { DonationSource } from '../../../core/models/donation.model';
import { MemberPickerComponent } from '../../desk/member-picker/member-picker.component';
import { DonationForm } from '../donation.form';

const SOURCES: ChoiceOption<DonationSource>[] = [
  { value: 'DONATION', label: 'Donation' },
  { value: 'PURCHASE', label: 'Church purchase' },
];

/** Where the books come from: a member, a visitor (typed name), an anonymous donor, or a church purchase. */
@Component({
  selector: 'app-donor-step',
  imports: [ChoiceChipsComponent, MemberPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './donor-step.component.html',
  host: { class: 'flex flex-col gap-2.5' },
})
export class DonorStepComponent {
  readonly form = input.required<DonationForm>();
  readonly sourceChange = output<DonationSource>();

  protected readonly sources = SOURCES;
  private readonly memberPicker = viewChild(MemberPickerComponent);

  focus(): void {
    this.memberPicker()?.focus();
  }

  reset(): void {
    this.memberPicker()?.reset();
  }

  protected onSource(source: DonationSource | null): void {
    if (source) {
      this.sourceChange.emit(source);
    }
  }

  protected onAnonymous(event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    this.form().setAnonymous(on);
    if (on) {
      this.memberPicker()?.reset();
    }
  }
}
