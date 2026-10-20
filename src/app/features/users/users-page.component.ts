import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AlertComponent } from '../../components/alert/alert.component';
import { ChoiceChipsComponent, ChoiceOption } from '../../components/choice-chips/choice-chips.component';
import { IconComponent } from '../../components/icon/icon.component';
import { MemberLineComponent } from '../../components/member-line/member-line.component';
import { errorMessage } from '../../core/api/api-client.service';
import { UsersApi } from '../../core/api/users.api';
import { AuthService } from '../../core/auth/auth.service';
import { RoleOption, StaffUser } from '../../core/models/user.model';
import { formatSince } from '../../utils/dates';
import { plural, roleLabel } from '../../utils/format';
import { StatusFilter, filterUsers, userStats, userStatus } from './user-directory';
import { UserDrawerComponent, UserDrawerRequest } from './user-drawer/user-drawer.component';

const STATUSES: ChoiceOption<StatusFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INVITED', label: 'Invited' },
  { value: 'DISABLED', label: 'Disabled' },
];

/** Staff and volunteers who sign in: totals, search, role and status filters, invite and edit. */
@Component({
  selector: 'app-users-page',
  imports: [AlertComponent, ChoiceChipsComponent, IconComponent, MemberLineComponent, UserDrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-page.component.html',
  host: { class: 'flex flex-col gap-[18px]' },
})
export class UsersPageComponent {
  protected readonly auth = inject(AuthService);
  private readonly usersApi = inject(UsersApi);

  protected readonly users = signal<StaffUser[]>([]);
  protected readonly roles = signal<RoleOption[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly query = signal('');
  protected readonly roleId = signal<number | null>(null);
  protected readonly status = signal<StatusFilter>('all');
  protected readonly drawerRequest = signal<UserDrawerRequest | null>(null);

  protected readonly statuses = STATUSES;
  protected readonly me = computed(() => this.auth.user()?.id ?? null);
  protected readonly stats = computed(() => userStats(this.users(), this.roles().length));
  protected readonly rows = computed(() =>
    filterUsers(this.users(), { query: this.query(), roleId: this.roleId(), status: this.status() }).map((user) => ({
      user,
      status: userStatus(user),
      role: roleLabel(user.roleName),
      lastSignIn: user.lastLoginAt ? formatSince(user.lastLoginAt) : user.status === 'INVITED' ? 'Not yet' : 'Never',
    })),
  );
  protected readonly isFiltered = computed(() => !!this.query().trim() || this.roleId() !== null || this.status() !== 'all');

  protected readonly plural = plural;
  protected readonly roleLabel = roleLabel;

  constructor() {
    void this.load();
  }

  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected setRole(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.roleId.set(value ? Number(value) : null);
  }

  protected clearFilters(): void {
    this.query.set('');
    this.roleId.set(null);
    this.status.set('all');
  }

  protected add(): void {
    this.drawerRequest.set({ mode: 'add' });
  }

  protected edit(user: StaffUser): void {
    this.drawerRequest.set({ mode: 'edit', user });
  }

  protected async load(): Promise<void> {
    this.error.set('');
    try {
      const [users, roles] = await Promise.all([this.usersApi.directory(), this.usersApi.roles()]);
      this.users.set(users);
      this.roles.set(roles);
    } catch (err) {
      this.error.set(errorMessage(err, 'Couldn’t load the users. Please try again.'));
    } finally {
      this.loading.set(false);
    }
  }
}
