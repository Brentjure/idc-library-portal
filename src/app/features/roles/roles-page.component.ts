import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AlertComponent } from '../../components/alert/alert.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../components/icon/icon.component';
import { ToastService } from '../../components/toast/toast.service';
import { errorMessage } from '../../core/api/api-client.service';
import { RolesApi } from '../../core/api/roles.api';
import { PermissionItem, RoleSummary } from '../../core/models/role.model';
import { plural, roleLabel } from '../../utils/format';
import { RoleDrawerComponent, RoleDrawerRequest } from './role-drawer/role-drawer.component';
import { RolePermissionsForm, groupBySection } from './role-permissions.form';

/**
 * Roles & Permissions: the roles on the left, the selected role's permissions on the right, grouped by section.
 * Changes are a draft until Save; switching roles with unsaved changes asks first.
 */
@Component({
  selector: 'app-roles-page',
  imports: [AlertComponent, ConfirmDialogComponent, IconComponent, RoleDrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './roles-page.component.html',
  host: { class: 'flex flex-col gap-[18px]' },
})
export class RolesPageComponent {
  private readonly rolesApi = inject(RolesApi);
  private readonly toast = inject(ToastService);

  protected readonly roles = signal<RoleSummary[]>([]);
  protected readonly permissions = signal<PermissionItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly form = new RolePermissionsForm();

  protected readonly drawerRequest = signal<RoleDrawerRequest | null>(null);
  /** A role to switch to once the user agrees to drop unsaved changes. */
  protected readonly pendingRole = signal<RoleSummary | null>(null);
  protected readonly deleting = signal<RoleSummary | null>(null);
  protected readonly deleteError = signal('');

  protected readonly sections = computed(() => groupBySection(this.permissions()));
  protected readonly selected = computed(() => this.form.role());
  protected readonly roleLabel = roleLabel;
  protected readonly plural = plural;

  constructor() {
    void this.load();
  }

  protected select(role: RoleSummary): void {
    if (role.id === this.selected()?.id) return;
    if (this.form.dirty()) {
      this.pendingRole.set(role);
    } else {
      this.form.load(role);
    }
  }

  protected discardAndSwitch(): void {
    const role = this.pendingRole();
    this.pendingRole.set(null);
    if (role) this.form.load(role);
  }

  protected async save(): Promise<void> {
    const role = this.selected();
    if (!role || this.saving() || !this.form.dirty()) return;
    this.saving.set(true);
    try {
      await this.rolesApi.setPermissions(role.id, this.form.toRequest());
      this.form.markSaved();
      this.toast.show(`Saved the permissions for ${roleLabel(role.name)}. They apply from the next click.`);
      await this.load(role.id);
    } catch (err) {
      this.toast.show(errorMessage(err, 'Couldn’t save the permissions. Please try again.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected add(): void {
    this.drawerRequest.set({ mode: 'add' });
  }

  protected rename(role: RoleSummary): void {
    this.drawerRequest.set({ mode: 'edit', role });
  }

  protected async onSaved(role: RoleSummary): Promise<void> {
    this.drawerRequest.set(null);
    // A brand-new role opens straight away; a renamed one keeps any unsaved ticks.
    await this.load(role.id, !this.form.dirty() || this.selected()?.id !== role.id);
  }

  protected askDelete(role: RoleSummary): void {
    this.deleteError.set('');
    this.deleting.set(role);
  }

  protected async confirmDelete(): Promise<void> {
    const role = this.deleting();
    if (!role || this.saving()) return;
    this.saving.set(true);
    try {
      await this.rolesApi.remove(role.id);
      this.deleting.set(null);
      this.toast.show(`Deleted the ${roleLabel(role.name)} role.`);
      this.form.load(null);
      await this.load();
    } catch (err) {
      this.deleteError.set(errorMessage(err, 'Couldn’t delete the role. Please try again.'));
    } finally {
      this.saving.set(false);
    }
  }

  /** Reloads, keeping (or moving to) the role with this id. */
  protected async load(selectId: number | null = this.selected()?.id ?? null, reselect = true): Promise<void> {
    this.error.set('');
    try {
      const catalog = await this.rolesApi.catalog();
      this.roles.set(catalog.roles);
      this.permissions.set(catalog.permissions);
      if (reselect || !this.selected()) {
        this.form.load(catalog.roles.find((r) => r.id === selectId) ?? catalog.roles.find((r) => !r.system) ?? catalog.roles[0] ?? null);
      }
    } catch (err) {
      this.error.set(errorMessage(err, 'Couldn’t load the roles. Please try again.'));
    } finally {
      this.loading.set(false);
    }
  }
}
