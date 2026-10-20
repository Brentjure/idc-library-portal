import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icons';

/**
 * A small centred question, e.g. before deleting something.
 *
 *   <app-confirm-dialog [open]="asking()" heading="Delete “Mere Christianity”?" confirmLabel="Yes, delete"
 *                       (confirmed)="delete()" (cancelled)="asking.set(false)">
 *     <p>This removes the title and its 3 copies.</p>
 *   </app-confirm-dialog>
 *
 * With no confirmLabel only the cancel button shows (use cancelLabel="OK"), for "this can't be done yet".
 * Esc, the backdrop and Cancel all fire (cancelled). Focus starts on Cancel, the safe choice.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  readonly open = input.required<boolean>();
  readonly heading = input.required<string>();
  /** 'danger' for a destructive action, 'warn' when it can't be done yet. */
  readonly tone = input<'danger' | 'warn'>('danger');
  readonly icon = input<IconName>('trash');
  readonly confirmLabel = input('');
  readonly cancelLabel = input('Cancel');
  /** Disables both buttons while the action runs. */
  readonly busy = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');
  private readonly box = viewChild<ElementRef<HTMLElement>>('box');

  constructor() {
    effect(() => {
      if (this.open()) {
        setTimeout(() => this.cancelButton()?.nativeElement.focus(), 30);
      }
    });
  }

  protected cancel(): void {
    if (!this.busy()) {
      this.cancelled.emit();
    }
  }

  /** Keeps Tab inside the dialog. */
  protected trapTab(event: Event): void {
    const keyboard = event as KeyboardEvent;
    const buttons = [...(this.box()?.nativeElement.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])];
    if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    keyboard.preventDefault();
    buttons[(index + (keyboard.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
  }
}
