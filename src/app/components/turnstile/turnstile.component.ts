import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, inject, input, output, signal } from '@angular/core';

/** The part of Cloudflare's Turnstile script this component uses. */
interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<TurnstileApi> | null = null;

/** Loads Cloudflare's script once per page (the CSP allows challenges.cloudflare.com). */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not load')));
    script.onerror = () => {
      loading = null;
      reject(new Error('Turnstile did not load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Cloudflare Turnstile: a "not a robot" check, usually invisible or a single tick. Emits a one-time token, or null
 * when it expires or fails. Call reset() after the token has been used.
 *
 *   <app-turnstile [siteKey]="key" (tokenChange)="token.set($event)" />
 */
@Component({
  selector: 'app-turnstile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (failed()) {
      <p class="m-0 text-[12.5px] text-bad">The security check didn’t load. Check your connection and reload the page.</p>
    }`,
  host: { class: 'block min-h-[65px]' },
})
export class TurnstileComponent implements OnDestroy {
  readonly siteKey = input.required<string>();
  readonly tokenChange = output<string | null>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private api: TurnstileApi | null = null;
  private widgetId: string | null = null;
  private destroyed = false;
  protected readonly failed = signal(false);

  constructor() {
    afterNextRender(() => void this.render());
  }

  /** A token works once: get a fresh one after each sign-in attempt. */
  reset(): void {
    this.tokenChange.emit(null);
    if (this.api && this.widgetId) this.api.reset(this.widgetId);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.api && this.widgetId) this.api.remove(this.widgetId);
  }

  private async render(): Promise<void> {
    try {
      const api = await loadTurnstile();
      if (this.destroyed) return;
      this.api = api;
      this.widgetId = api.render(this.host.nativeElement, {
        sitekey: this.siteKey(),
        theme: 'light',
        size: 'flexible',
        callback: (token: string) => this.tokenChange.emit(token),
        'expired-callback': () => this.tokenChange.emit(null),
        'error-callback': () => this.tokenChange.emit(null),
      });
    } catch {
      this.failed.set(true);
    }
  }
}
