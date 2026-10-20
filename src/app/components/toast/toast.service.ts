import { Injectable, signal } from '@angular/core';

/** Shows a short message at the bottom of the screen. Render <app-toast /> once, in the shell. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal('');
  readonly visible = signal(false);
  private hideTimer?: ReturnType<typeof setTimeout>;

  show(message: string): void {
    this.message.set(message);
    this.visible.set(true);
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.visible.set(false), 4000);
  }
}
