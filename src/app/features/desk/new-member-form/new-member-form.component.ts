import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { errorMessage } from '../../../core/api/api-client.service';
import { MembersApi } from '../../../core/api/members.api';
import { Member } from '../../../core/models/member.model';

/** Small inline form to add a member who isn't on the list yet. */
@Component({
  selector: 'app-new-member-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-member-form.component.html',
})
export class NewMemberFormComponent implements OnInit {
  private readonly membersApi = inject(MembersApi);

  readonly idPrefix = input.required<string>();
  /** Starting values, from what was typed in the search fields. */
  readonly initialName = input('');
  readonly initialPhone = input('');

  readonly created = output<Member>();
  readonly cancelled = output<void>();

  protected readonly name = signal('');
  protected readonly phone = signal('');
  protected readonly group = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.name.set(this.initialName());
    this.phone.set(this.initialPhone());
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      const member = await this.membersApi.create({
        fullName: this.name().trim(),
        phone: this.phone().trim() || undefined,
        group: this.group().trim() || undefined,
      });
      this.created.emit(member);
    } catch (err) {
      this.error.set(errorMessage(err, 'Could not add the member.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
