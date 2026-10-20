import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="status"
      aria-live="polite"
      class="pointer-events-none fixed bottom-6 left-1/2 z-[80] max-w-[min(560px,calc(100vw-32px))] -translate-x-1/2 rounded-xl bg-ink px-[18px] py-3 font-semibold text-surface shadow-pop transition duration-200"
      [class.opacity-0]="!toast.visible()"
      [class.translate-y-4]="!toast.visible()"
    >
      {{ toast.message() }}
    </div>
  `,
})
export class ToastComponent {
  protected readonly toast = inject(ToastService);
}
