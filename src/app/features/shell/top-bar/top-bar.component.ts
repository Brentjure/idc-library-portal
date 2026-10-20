import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { IconComponent } from '../../../components/icon/icon.component';
import { AuthService } from '../../../core/auth/auth.service';
import { formatLong, greeting, today } from '../../../utils/dates';
import { DeskService } from '../../desk/desk.service';

/** Page title and greeting, sign-out, and the three desk buttons (shown only with the right permission). */
@Component({
  selector: 'app-top-bar',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './top-bar.component.html',
  host: { class: 'flex flex-wrap items-center gap-3 border-b border-line pb-4' },
})
export class TopBarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly desk = inject(DeskService);

  readonly title = input.required<string>();
  readonly openMenu = output<void>();

  protected readonly subtitle = `${greeting()}, ${this.auth.firstName()} · ${formatLong(today())}`;
}
