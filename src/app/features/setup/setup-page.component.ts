import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertComponent } from '../../components/alert/alert.component';
import { IconComponent } from '../../components/icon/icon.component';
import { ApiError, errorMessage } from '../../core/api/api-client.service';
import { UsersApi } from '../../core/api/users.api';
import { InvitationInfo } from '../../core/models/user.model';
import { roleLabel } from '../../utils/format';
import { passwordChecklist, passwordReady } from './password-checklist';

type State = 'loading' | 'form' | 'done' | 'gone' | 'error';

/**
 * Set up your account, opened from an invitation link (/setup/{token}). The new user checks their details and
 * chooses a password. The link works once.
 */
@Component({
  selector: 'app-setup-page',
  imports: [AlertComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './setup-page.component.html',
  host: { class: 'grid min-h-dvh place-items-center bg-bg px-4 py-10' },
})
export class SetupPageComponent {
  private readonly usersApi = inject(UsersApi);
  private readonly router = inject(Router);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  protected readonly state = signal<State>('loading');
  protected readonly invitation = signal<InvitationInfo | null>(null);
  protected readonly name = signal('');
  protected readonly phone = signal('');
  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly showPassword = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly nameError = signal('');
  protected readonly email = signal('');

  protected readonly firstName = computed(() => this.name().trim().split(/\s+/)[0] || 'there');
  protected readonly addedBy = computed(() => {
    const info = this.invitation();
    if (!info) return '';
    const role = info.roleName ? ` as ${roleLabel(info.roleName)}` : '';
    return `${info.inviterName ?? 'The library'} added you to the IDC JKUAT Library portal${role}.`;
  });
  protected readonly checklist = computed(() => passwordChecklist(this.password(), this.confirm(), this.name(), this.email()));
  protected readonly ready = computed(() => passwordReady(this.checklist()) && !!this.name().trim());

  constructor() {
    void this.load();
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected async submit(): Promise<void> {
    this.nameError.set(this.name().trim() ? '' : 'Enter your full name.');
    if (!this.ready() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      this.email.set(
        await this.usersApi.acceptInvitation(this.token, {
          name: this.name().trim(),
          phone: this.phone().trim() || null,
          password: this.password(),
        }),
      );
      this.password.set('');
      this.confirm.set('');
      this.state.set('done');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        this.state.set('gone');
      } else {
        this.error.set(errorMessage(err, 'Couldn’t set up your account. Please try again.'));
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected signIn(): void {
    void this.router.navigate(['/login'], { queryParams: { email: this.email() } });
  }

  private async load(): Promise<void> {
    try {
      const info = await this.usersApi.invitation(this.token);
      this.invitation.set(info);
      this.name.set(info.name);
      this.phone.set(info.phone ?? '');
      this.email.set(info.email);
      this.state.set('form');
    } catch (err) {
      this.state.set(err instanceof ApiError && err.status === 404 ? 'gone' : 'error');
      this.error.set(errorMessage(err, 'Couldn’t open your invitation. Check your connection and try again.'));
    }
  }
}
