import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, model, signal, viewChild } from '@angular/core';
import { MemberLineComponent } from '../../../components/member-line/member-line.component';
import { TypeaheadComponent } from '../../../components/typeahead/typeahead.component';
import { MembersApi } from '../../../core/api/members.api';
import { Member } from '../../../core/models/member.model';
import { formatPhone } from '../../../utils/format';
import { NewMemberFormComponent } from '../new-member-form/new-member-form.component';

/**
 * Find a member by full name or by phone. Editing either field after a pick starts a new search.
 *
 * - `canAdd`: offers "Add as a new member" when nobody matches (borrowing).
 * - `freeText`: keeps whatever was typed, for a visiting donor who isn't a member.
 *
 *   <app-member-picker idPrefix="borrow" [canAdd]="true" [(member)]="member" />
 */
@Component({
  selector: 'app-member-picker',
  imports: [TypeaheadComponent, MemberLineComponent, NewMemberFormComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './member-picker.component.html',
  host: { class: 'flex flex-col gap-2.5' },
})
export class MemberPickerComponent {
  private readonly membersApi = inject(MembersApi);

  /** Makes the field ids unique when several pickers are on the page. */
  readonly idPrefix = input.required<string>();
  readonly disabled = input(false);
  readonly canAdd = input(false);
  readonly freeText = input(false);
  readonly namePlaceholder = input("Start typing the member's name");

  /** The chosen member (two-way). */
  readonly member = model<Member | null>(null);
  /** What is typed in each field (two-way); read these for a visitor who isn't a member. */
  readonly name = model('');
  readonly phone = model('');

  protected readonly addingNew = signal<{ name: string; phone: string } | null>(null);
  private readonly nameField = viewChild.required<TypeaheadComponent<Member>>('nameField');

  protected readonly searchByName = (query: string) => this.membersApi.search(query);
  protected readonly searchByPhone = (query: string) =>
    query.replace(/\D/g, '').length >= 3 ? this.membersApi.search(query) : Promise.resolve([]);

  focus(): void {
    this.nameField().focus();
  }

  /** Clears the chosen member and both fields. */
  reset(): void {
    this.member.set(null);
    this.name.set('');
    this.phone.set('');
    this.addingNew.set(null);
  }

  protected select(member: Member): void {
    this.member.set(member);
    this.name.set(member.fullName);
    this.phone.set(formatPhone(member.phone));
    this.addingNew.set(null);
  }

  /** Typing in one field after a pick drops the pick and empties the other field. */
  protected onTyped(field: 'name' | 'phone'): void {
    if (!this.member()) {
      return;
    }
    this.member.set(null);
    if (field === 'name') {
      this.phone.set('');
    } else {
      this.name.set('');
    }
  }

  protected startAdding(name: string, phone: string): void {
    this.addingNew.set({ name: name || this.name(), phone: phone || this.phone() });
  }

  protected contact(member: Member): string {
    return [formatPhone(member.phone) || 'No phone saved', member.group].filter(Boolean).join(' · ');
  }

  protected loanSummary(member: Member): string {
    if (!member.onLoanCount) {
      return 'Nothing on loan';
    }
    const late = member.overdueCount ? ` · ${member.overdueCount} late` : '';
    return `${member.onLoanCount} on loan${late}`;
  }
}
