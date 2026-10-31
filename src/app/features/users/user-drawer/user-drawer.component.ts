import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { AlertComponent } from '../../../components/alert/alert.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { DrawerComponent } from '../../../components/drawer/drawer.component';
import { IconComponent } from '../../../components/icon/icon.component';
import { ToastService } from '../../../components/toast/toast.service';
import { ApiError, errorMessage } from '../../../core/api/api-client.service';
import { UsersApi } from '../../../core/api/users.api';
import { InvitationLink, RoleOption, StaffUser } from '../../../core/models/user.model';
import { formatDate, formatTime } from '../../../utils/dates';
import { plural, roleLabel } from '../../../utils/format';
import { invitationMessage, userStatus } from '../user-directory';
import { UserField, UserForm } from '../user.form';

export type UserDrawerRequest = { mode: 'add' } | { mode: 'edit'; user: StaffUser };

type Mode = 'add' | 'edit' | 'link';

/**
 * New user and Edit user, in a right-side drawer. After inviting (or sending a new link) it shows the link
 * once, with Copy link and a ready WhatsApp / SMS message: the server keeps only a hash of it.
 */
@Component({
  selector: 'app-user-drawer',
  imports: [DrawerComponent, AlertComponent, ConfirmDialogComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-drawer.component.html',
})
export class UserDrawerComponent {
  private readonly usersApi = inject(UsersApi);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly request = input<UserDrawerRequest | null>(null);
  readonly roles = input.required<RoleOption[]>();
  /** The signed-in user, for the "not yourself" rules. */
  readonly currentUserId = input<number | null>(null);
  readonly closed = output<void>();
  /** After any save, so the page reloads its list. */
  readonly changed = output<void>();

  protected readonly mode = signal<Mode>('add');
  protected readonly user = signal<StaffUser | null>(null);
  protected readonly link = signal<InvitationLink | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly confirmWithdraw = signal(false);
  protected readonly form = new UserForm();

  protected readonly isOpen = computed(() => this.request() !== null);
  protected readonly isSelf = computed(() => this.user() !== null && this.user()!.id === this.currentUserId());
  protected readonly isInvited = computed(() => this.user()?.status === 'INVITED');
  protected readonly status = computed(() => (this.user() ? userStatus(this.user()!) : null));
  protected readonly heading = computed(() => ({ add: 'New user', edit: 'Edit user', link: 'Invitation link' })[this.mode()]);
  protected readonly hint = computed(
    () =>
      ({
        add: 'They choose their own password from an invitation link',
        edit: 'Changes apply the next time they do anything',
        link: 'Send it by WhatsApp or SMS',
      })[this.mode()],
  );
  protected readonly roleCards = computed(() =>
    this.roles().map((role) => ({
      role,
      label: roleLabel(role.name),
      count: role.system ? 'Every permission' : plural(role.permissions.length, 'permission'),
      // Your own Administrator role can't be taken away by yourself.
      locked: this.isSelf() && this.user()?.roleName === 'ADMIN' && role.name !== 'ADMIN',
    })),
  );
  protected readonly linkExpiry = computed(() => (this.link() ? formatDate(this.link()!.expiresAt) : ''));
  protected readonly lockedUntilTime = computed(() => (this.user()?.lockedUntil ? formatTime(this.user()!.lockedUntil!) : ''));
  protected readonly message = computed(() => {
    const l = this.link();
    return l ? invitationMessage(l.user.name, l.link, l.expiresAt, roleLabel(l.user.roleName)) : '';
  });

  constructor() {
    effect(() => {
      const request = this.request();
      untracked(() => {
        this.error.set('');
        this.link.set(null);
        this.confirmWithdraw.set(false);
        if (!request) return;
        if (request.mode === 'add') {
          this.user.set(null);
          this.form.load(null, this.defaultRoleId());
          this.mode.set('add');
        } else {
          this.user.set(request.user);
          this.form.load(request.user);
          this.mode.set('edit');
        }
        this.focus('name');
      });
    });
  }

  protected setText(field: 'name' | 'email' | 'phone', event: Event): void {
    this.form[field].set((event.target as HTMLInputElement).value);
    this.form.clearError(field);
  }

  protected chooseRole(roleId: number): void {
    this.form.roleId.set(roleId);
    this.form.clearError('roleId');
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    if (!this.form.validate()) {
      this.focus(this.form.firstError() ?? 'name');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      if (this.mode() === 'add') {
        this.showLink(await this.usersApi.invite(this.form.toNewUser()));
        this.toast.show(`Invited ${this.form.name().trim()}. Send them the link.`);
      } else {
        const saved = await this.usersApi.update(this.user()!.id, this.form.toUpdate());
        this.toast.show(`Saved changes to ${saved.name}.`);
        this.closed.emit();
      }
      this.changed.emit();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        this.form.showServerErrors(err.fieldErrors);
        this.focus(this.form.firstError() ?? 'name');
      } else {
        // The rules (yourself, last Administrator) come back as a message.
        this.error.set(errorMessage(err, 'Couldn’t save. Please try again.'));
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected async sendNewLink(): Promise<void> {
    const user = this.user();
    if (!user || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      this.showLink(await this.usersApi.newInvitation(user.id));
      this.changed.emit();
    } catch (err) {
      this.error.set(errorMessage(err, 'Couldn’t make a new link. Please try again.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async unlock(): Promise<void> {
    const user = this.user();
    if (!user || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      this.user.set(await this.usersApi.unlock(user.id));
      this.toast.show(`Unlocked ${user.name}. They can sign in again now.`);
      this.changed.emit();
    } catch (err) {
      this.error.set(errorMessage(err, 'Couldn’t unlock. Please try again.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async withdraw(): Promise<void> {
    const user = this.user();
    if (!user || this.saving()) return;
    this.saving.set(true);
    try {
      await this.usersApi.withdraw(user.id);
      this.confirmWithdraw.set(false);
      this.toast.show(`Withdrew the invitation for ${user.name}.`);
      this.changed.emit();
      this.closed.emit();
    } catch (err) {
      this.confirmWithdraw.set(false);
      this.error.set(errorMessage(err, 'Couldn’t withdraw the invitation. Please try again.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async copy(text: string, what: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toast.show(`${what} copied. Paste it into WhatsApp or an SMS.`);
    } catch {
      // No clipboard access: select the text so it can be copied by hand.
      this.host.nativeElement.querySelector<HTMLTextAreaElement>('#user-invite-message')?.select();
      this.toast.show('Select the text and copy it by hand.');
    }
  }

  protected close(): void {
    if (!this.saving()) this.closed.emit();
  }

  private showLink(link: InvitationLink): void {
    this.link.set(link);
    this.user.set(link.user);
    this.mode.set('link');
  }

  /** New users start as Librarian when there is one, the role most staff get. */
  private defaultRoleId(): number | null {
    const roles = this.roles();
    return (roles.find((r) => r.name === 'LIBRARIAN') ?? roles.find((r) => r.name !== 'ADMIN') ?? roles[0])?.id ?? null;
  }

  private focus(field: UserField): void {
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>(`#user-edit-${field}`)?.focus(), 230);
  }

  protected readonly roleLabel = roleLabel;
}
