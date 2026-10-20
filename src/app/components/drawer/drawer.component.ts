import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icons';

/**
 * Right-side panel used for every front-desk task.
 *
 *   <app-drawer [open]="isOpen" heading="Borrow books" headingId="borrow-heading" (closed)="close()">
 *     <ng-container drawerStats>…small facts under the title…</ng-container>
 *     …scrolling body…
 *     <ng-container drawerFooter>…summary and buttons…</ng-container>
 *   </app-drawer>
 *
 * Esc and the dark backdrop close it. Focus moves into it when it opens. While closed it is `inert`,
 * so nothing inside can be clicked or tabbed to.
 */
@Component({
  selector: 'app-drawer',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './drawer.component.html',
})
export class DrawerComponent {
  readonly open = input.required<boolean>();
  readonly heading = input.required<string>();
  /** Unique id for the heading, used for aria-labelledby. */
  readonly headingId = input.required<string>();
  readonly hint = input('');
  readonly icon = input<IconName>('book');
  readonly closed = output<void>();

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  constructor() {
    effect(() => {
      if (this.open()) {
        // Wait for the slide-in, then focus the panel unless something inside already has focus.
        setTimeout(() => {
          const panel = this.panel().nativeElement;
          if (!panel.contains(document.activeElement)) {
            panel.focus();
          }
        }, 220);
      }
    });
  }
}
