import { signal } from '@angular/core';
import { NewStaffUser, StaffUser, StaffUserUpdate } from '../../core/models/user.model';

export type UserField = 'name' | 'email' | 'phone' | 'roleId';

const FIELD_ORDER: UserField[] = ['name', 'email', 'phone', 'roleId'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * State and checks of the New user / Edit user form. Plain signals with no HTTP, so it is easy to test.
 * There is no password: new users choose their own from the invitation link.
 */
export class UserForm {
  readonly name = signal('');
  readonly email = signal('');
  readonly phone = signal('');
  readonly roleId = signal<number | null>(null);
  readonly canSignIn = signal(true);
  readonly errors = signal<Partial<Record<UserField, string>>>({});

  load(user: StaffUser | null, defaultRoleId: number | null = null): void {
    this.name.set(user?.name ?? '');
    this.email.set(user?.email ?? '');
    this.phone.set(user?.phone ?? '');
    this.roleId.set(user ? user.roleId : defaultRoleId);
    this.canSignIn.set(user ? user.status !== 'DISABLED' : true);
    this.errors.set({});
  }

  validate(): boolean {
    const errors: Partial<Record<UserField, string>> = {};
    if (!this.name().trim()) errors.name = 'Enter their full name.';
    if (!EMAIL.test(this.email().trim())) errors.email = 'Enter a valid email address. They sign in with it.';
    const digits = this.phone().replace(/\D/g, '');
    if (this.phone().trim() && (digits.length < 9 || digits.length > 15)) errors.phone = 'Check the phone number.';
    if (this.roleId() === null) errors.roleId = 'Choose a role.';
    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  showServerErrors(fieldErrors: Record<string, string>): void {
    const errors: Partial<Record<UserField, string>> = {};
    for (const [field, message] of Object.entries(fieldErrors)) {
      if ((FIELD_ORDER as string[]).includes(field)) errors[field as UserField] = message;
    }
    this.errors.set(errors);
  }

  firstError(): UserField | null {
    const errors = this.errors();
    return FIELD_ORDER.find((field) => errors[field]) ?? null;
  }

  clearError(field: UserField): void {
    if (this.errors()[field]) {
      this.errors.update(({ [field]: _, ...rest }) => rest);
    }
  }

  toNewUser(): NewStaffUser {
    const roleId = this.roleId();
    if (roleId === null) throw new Error('Choose a role first');
    return {
      name: this.name().trim().replace(/\s+/g, ' '),
      email: this.email().trim().toLowerCase(),
      phone: this.phone().trim() || null,
      roleId,
    };
  }

  toUpdate(): StaffUserUpdate {
    return { ...this.toNewUser(), canSignIn: this.canSignIn() };
  }
}
