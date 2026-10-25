import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { ToastComponent } from '../../components/toast/toast.component';
import { AuthService } from '../../core/auth/auth.service';
import { BorrowDrawerComponent } from '../borrow/borrow-drawer.component';
import { DonateDrawerComponent } from '../donate/donate-drawer.component';
import { ExtendDrawerComponent } from '../extend/extend-drawer.component';
import { ReturnDrawerComponent } from '../return/return-drawer.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopBarComponent } from './top-bar/top-bar.component';

const SLIM_KEY = 'idc.library.sidebar.slim';

/**
 * The signed-in layout: sidebar, top bar, the current page, and the three desk drawers
 * (which float over every page).
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet, SidebarComponent, TopBarComponent, ToastComponent,
    BorrowDrawerComponent, ReturnDrawerComponent, DonateDrawerComponent, ExtendDrawerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly slim = signal(readSlimSetting());
  protected readonly mobileMenuOpen = signal(false);

  /** The page name shown in the top bar, from the route's data.heading. */
  protected readonly pageHeading = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.currentHeading()),
    ),
    { initialValue: this.currentHeading() },
  );

  protected toggleSlim(): void {
    this.slim.update((value) => !value);
    try {
      localStorage.setItem(SLIM_KEY, this.slim() ? '1' : '0');
    } catch {
      // Not saved; the sidebar still works.
    }
  }

  /** The deepest active route's data.heading. Uses snapshots: they exist even while the shell is being created. */
  private currentHeading(): string {
    let route = this.route.snapshot;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return (route.data['heading'] as string | undefined) ?? '';
  }
}

function readSlimSetting(): boolean {
  try {
    return localStorage.getItem(SLIM_KEY) === '1';
  } catch {
    return false;
  }
}
