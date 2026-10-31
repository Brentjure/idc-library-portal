import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertComponent } from '../../components/alert/alert.component';
import { IconComponent } from '../../components/icon/icon.component';
import { TurnstileComponent } from '../../components/turnstile/turnstile.component';
import { errorMessage } from '../../core/api/api-client.service';
import { AuthService } from '../../core/auth/auth.service';

/** Book spines drawn at the bottom of the yellow panel: [colour, height in px]. */
const SHELF: [string, number][] = [
  ['#7A4B1E', 88], ['#3F5A4A', 72], ['#8A6A1A', 96], ['#3E6A8A', 80], ['#5B4A2E', 92], ['#A0522D', 70],
  ['#2F6B6B', 86], ['#8B2F3A', 78], ['#3B4F6B', 94], ['#4F3A2A', 74], ['#6B3A2F', 90], ['#3A4A2F', 82],
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Staff sign-in: yellow brand panel on the left, sign-in card on the right. */
@Component({
  selector: 'app-login-page',
  imports: [IconComponent, AlertComponent, TurnstileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.component.html',
  host: { class: 'grid min-h-dvh bg-bg min-[861px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]' },
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly shelf = SHELF;
  /** Prefilled after setting up an account: /login?email=… */
  protected readonly email = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '');
  protected readonly password = signal('');
  protected readonly keep = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly busy = signal(false);
  protected readonly emailError = signal('');
  protected readonly passwordError = signal('');
  protected readonly error = signal(
    inject(ActivatedRoute).snapshot.queryParamMap.has('expired') ? 'Your session ended. Please sign in again.' : '',
  );
  /** Cloudflare Turnstile, when the server has it switched on. */
  protected readonly turnstileKey = signal<string | null>(null);
  protected readonly turnstileToken = signal<string | null>(null);
  private readonly turnstile = viewChild(TurnstileComponent);

  constructor() {
    // Without the settings the form still works; the server refuses sign-in if a check was needed.
    this.auth.config().then(
      (config) => this.turnstileKey.set(config.turnstileSiteKey),
      () => this.turnstileKey.set(null),
    );
  }

  protected async submit(): Promise<void> {
    const email = this.email().trim();
    this.error.set('');
    this.emailError.set(EMAIL_PATTERN.test(email) ? '' : 'Enter a valid email address.');
    this.passwordError.set(this.password() ? '' : 'Enter your password.');
    if (this.emailError() || this.passwordError()) {
      return;
    }
    if (this.turnstileKey() && !this.turnstileToken()) {
      this.error.set('Please complete the security check below the password.');
      return;
    }

    this.busy.set(true);
    try {
      await this.auth.signIn(email, this.password(), this.keep(), this.turnstileToken());
      await this.router.navigate(['/']);
    } catch (err) {
      this.error.set(errorMessage(err, 'Could not sign in. Please try again.'));
      this.password.set('');
      // Each token works once.
      this.turnstile()?.reset();
    } finally {
      this.busy.set(false);
    }
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }
}
