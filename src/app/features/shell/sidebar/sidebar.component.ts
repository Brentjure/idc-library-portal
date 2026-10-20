import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../../components/icon/icon.component';
import { MemberLineComponent } from '../../../components/member-line/member-line.component';
import { AuthService } from '../../../core/auth/auth.service';
import { DonationSource } from '../../../core/models/donation.model';
import { DeskService } from '../../desk/desk.service';
import { SummaryStore } from '../../desk/summary.store';
import { NAV_SECTIONS } from '../nav-items';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  LIBRARIAN: 'Librarian',
};

/** Left menu: logo, the menu from nav-items.ts, the verse and the signed-in user. Fits the screen height. */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, IconComponent, MemberLineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  protected readonly auth = inject(AuthService);
  private readonly desk = inject(DeskService);
  private readonly summary = inject(SummaryStore);

  /** Icons only (desktop). */
  readonly slim = input(false);
  /** Slid in over the page (phones). */
  readonly mobileOpen = input(false);
  readonly toggleSlim = output<void>();
  readonly closeMobile = output<void>();

  /** "Loans & Returns" and "Overdue Reminders" share /loans; only the one whose query matches is highlighted. */
  protected readonly exactMatch: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'exact',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };

  protected readonly sections = computed(() =>
    NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || this.auth.can(item.permission)),
    })),
  );
  protected readonly overdue = computed(() => this.summary.summary()?.overdue ?? 0);
  protected readonly roleLabel = computed(() => {
    const role = this.auth.user()?.roles[0];
    return role ? (ROLE_LABELS[role] ?? role) : '';
  });

  protected openDonate(source: DonationSource): void {
    this.closeMobile.emit();
    this.desk.openDonate(source);
  }
}
