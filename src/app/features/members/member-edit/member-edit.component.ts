import { ChangeDetectionStrategy, Component, ElementRef, WritableSignal, inject, input, output } from '@angular/core';
import { MemberEditForm, MemberField } from '../member-edit.form';

/** The Add / Edit member fields: full name, phone and group. */
@Component({
  selector: 'app-member-edit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './member-edit.component.html',
})
export class MemberEditComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly form = input.required<MemberEditForm>();
  /** Groups already in use, suggested while typing. */
  readonly groups = input<string[]>([]);
  readonly submitted = output<void>();

  focus(field: MemberField = 'fullName'): void {
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>(`#member-edit-${field}`)?.focus());
  }

  protected set(field: MemberField, target: WritableSignal<string>, event: Event): void {
    target.set((event.target as HTMLInputElement).value);
    this.form().clearError(field);
  }
}
