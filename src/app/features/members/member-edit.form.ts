import { signal } from '@angular/core';
import { Member, MemberUpdate } from '../../core/models/member.model';

export type MemberField = 'fullName' | 'phone' | 'group';

const FIELD_ORDER: MemberField[] = ['fullName', 'phone', 'group'];

/**
 * State and checks of the Add / Edit member form. Plain signals with no HTTP, so it is easy to test.
 * The server checks again, including that the phone number isn't another member's.
 */
export class MemberEditForm {
  readonly fullName = signal('');
  readonly phone = signal('');
  readonly group = signal('');
  readonly errors = signal<Partial<Record<MemberField, string>>>({});

  load(member: Member | null): void {
    this.fullName.set(member?.fullName ?? '');
    // Shown as typed at the desk: +254 7xx becomes 07xx.
    this.phone.set(member?.phone ? localPhone(member.phone) : '');
    this.group.set(member?.group ?? '');
    this.errors.set({});
  }

  validate(): boolean {
    const errors: Partial<Record<MemberField, string>> = {};
    if (!this.fullName().trim()) errors.fullName = 'Enter the member’s full name.';
    const digits = this.phone().replace(/\D/g, '');
    if (this.phone().trim() && (digits.length < 9 || digits.length > 15)) {
      errors.phone = 'Check the phone number, e.g. 0712 448 210.';
    }
    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  showServerErrors(fieldErrors: Record<string, string>): void {
    const errors: Partial<Record<MemberField, string>> = {};
    for (const [field, message] of Object.entries(fieldErrors)) {
      if ((FIELD_ORDER as string[]).includes(field)) errors[field as MemberField] = message;
    }
    this.errors.set(errors);
  }

  firstError(): MemberField | null {
    const errors = this.errors();
    return FIELD_ORDER.find((field) => errors[field]) ?? null;
  }

  clearError(field: MemberField): void {
    if (this.errors()[field]) {
      this.errors.update(({ [field]: _, ...rest }) => rest);
    }
  }

  toRequest(): MemberUpdate {
    return {
      fullName: this.fullName().trim().replace(/\s+/g, ' '),
      phone: this.phone().trim() || null,
      group: this.group().trim() || null,
    };
  }
}

/** "254712448210" → "0712 448 210"; other numbers are shown as stored. */
function localPhone(phone: string): string {
  const match = /^254(\d{3})(\d{3})(\d{3})$/.exec(phone);
  return match ? `0${match[1]} ${match[2]} ${match[3]}` : phone;
}
