import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { AlertComponent } from '../../../components/alert/alert.component';
import { DrawerComponent } from '../../../components/drawer/drawer.component';
import { IconComponent } from '../../../components/icon/icon.component';
import { ToastService } from '../../../components/toast/toast.service';
import { ApiError, errorMessage } from '../../../core/api/api-client.service';
import { MembersApi } from '../../../core/api/members.api';
import { AuthService } from '../../../core/auth/auth.service';
import { Loan } from '../../../core/models/loan.model';
import { DirectoryMember, MemberDetail } from '../../../core/models/member.model';
import { MemberDetailsComponent } from '../member-details/member-details.component';
import { MemberEditForm } from '../member-edit.form';
import { MemberEditComponent } from '../member-edit/member-edit.component';

/** What the drawer shows: a member (to view or edit), or a blank form for a new one. */
export type MemberDrawerRequest = { mode: 'view' | 'edit'; id: number } | { mode: 'add' };

type Mode = 'view' | 'edit' | 'add';

/**
 * One member in a right-side drawer: details with their books and donations, the edit form, or Add member.
 * Removing, lending and returning are handed back to the page, which owns the dialog and the desk drawers.
 */
@Component({
  selector: 'app-member-drawer',
  imports: [DrawerComponent, AlertComponent, IconComponent, MemberDetailsComponent, MemberEditComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './member-drawer.component.html',
})
export class MemberDrawerComponent {
  protected readonly auth = inject(AuthService);
  private readonly membersApi = inject(MembersApi);
  private readonly toast = inject(ToastService);

  /** Null closes the drawer. */
  readonly request = input<MemberDrawerRequest | null>(null);
  readonly groups = input<string[]>([]);
  readonly closed = output<void>();
  /** After a save or reactivation, so the page can reload its list. */
  readonly changed = output<void>();
  readonly removeRequested = output<MemberDetail>();
  readonly lendRequested = output<DirectoryMember>();
  readonly returnRequested = output<Loan>();
  readonly extendRequested = output<Loan>();

  protected readonly detail = signal<MemberDetail | null>(null);
  protected readonly mode = signal<Mode>('view');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly form = new MemberEditForm();

  protected readonly isOpen = computed(() => this.request() !== null);
  protected readonly heading = computed(() => ({ view: 'Member', edit: 'Edit member', add: 'Add member' })[this.mode()]);
  protected readonly hint = computed(
    () =>
      ({
        view: 'Their books, returns and donations',
        edit: 'Loans and donations stay as they are',
        add: 'Members don’t sign in; you look them up at the desk',
      })[this.mode()],
  );

  private readonly editor = viewChild(MemberEditComponent);
  private ticket = 0;

  constructor() {
    effect(() => {
      const request = this.request();
      untracked(() => {
        if (!request) {
          this.ticket++;
          this.error.set('');
        } else if (request.mode === 'add') {
          this.ticket++;
          this.detail.set(null);
          this.form.load(null);
          this.mode.set('add');
          this.error.set('');
          // The fields only exist after this change is rendered.
          setTimeout(() => this.editor()?.focus());
        } else {
          void this.load(request.id, request.mode);
        }
      });
    });
  }

  /** After a desk drawer saved: show fresh numbers. */
  async reload(): Promise<void> {
    const request = this.request();
    if (request && request.mode !== 'add' && this.mode() === 'view') {
      await this.load(request.id, 'view');
    }
  }

  protected edit(): void {
    const detail = this.detail();
    if (!detail) return;
    this.form.load(detail.member);
    this.mode.set('edit');
    setTimeout(() => this.editor()?.focus());
  }

  protected cancel(): void {
    if (this.mode() === 'add') {
      this.closed.emit();
    } else {
      this.mode.set('view');
    }
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    if (!this.form.validate()) {
      this.editor()?.focus(this.form.firstError() ?? 'fullName');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const changes = this.form.toRequest();
    try {
      if (this.mode() === 'add') {
        const created = await this.membersApi.create({
          fullName: changes.fullName,
          phone: changes.phone ?? undefined,
          group: changes.group ?? undefined,
        });
        this.detail.set(await this.membersApi.detail(created.id));
        this.toast.show(`Added ${created.fullName}.`);
      } else {
        const id = this.detail()!.member.id;
        this.detail.set(await this.membersApi.update(id, changes));
        this.toast.show(`Saved changes to ${changes.fullName}.`);
      }
      this.mode.set('view');
      this.changed.emit();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        this.form.showServerErrors(err.fieldErrors);
        this.editor()?.focus(this.form.firstError() ?? 'fullName');
      } else if (err instanceof ApiError && err.status === 409) {
        // "A member with this phone number already exists" when adding.
        this.form.showServerErrors({ phone: err.message });
        this.editor()?.focus('phone');
      } else {
        this.error.set(errorMessage(err, 'Couldn’t save the member. Please try again.'));
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected async reactivate(): Promise<void> {
    const detail = this.detail();
    if (!detail || this.saving()) return;
    this.saving.set(true);
    try {
      this.detail.set(await this.membersApi.reactivate(detail.member.id));
      this.toast.show(`${detail.member.fullName} can borrow again.`);
      this.changed.emit();
    } catch (err) {
      this.error.set(errorMessage(err, 'Couldn’t reactivate the member. Please try again.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected close(): void {
    if (!this.saving()) this.closed.emit();
  }

  private async load(id: number, mode: 'view' | 'edit'): Promise<void> {
    const ticket = ++this.ticket;
    if (this.detail()?.member.id !== id) this.detail.set(null);
    this.loading.set(true);
    this.error.set('');
    try {
      const detail = await this.membersApi.detail(id);
      if (ticket !== this.ticket) return;
      this.detail.set(detail);
      if (mode === 'edit') {
        this.edit();
      } else {
        this.mode.set('view');
      }
    } catch (err) {
      if (ticket === this.ticket) this.error.set(errorMessage(err, 'Couldn’t load this member. Please try again.'));
    } finally {
      if (ticket === this.ticket) this.loading.set(false);
    }
  }
}
