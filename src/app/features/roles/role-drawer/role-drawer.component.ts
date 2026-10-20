import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { AlertComponent } from '../../../components/alert/alert.component';
import { DrawerComponent } from '../../../components/drawer/drawer.component';
import { ToastService } from '../../../components/toast/toast.service';
import { ApiError, errorMessage } from '../../../core/api/api-client.service';
import { RolesApi } from '../../../core/api/roles.api';
import { RoleSummary } from '../../../core/models/role.model';
import { roleLabel } from '../../../utils/format';

export type RoleDrawerRequest = { mode: 'add' } | { mode: 'edit'; role: RoleSummary };

/** New role (optionally copying another role's permissions) and Rename role. */
@Component({
  selector: 'app-role-drawer',
  imports: [DrawerComponent, AlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './role-drawer.component.html',
})
export class RoleDrawerComponent {
  private readonly rolesApi = inject(RolesApi);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly request = input<RoleDrawerRequest | null>(null);
  readonly roles = input.required<RoleSummary[]>();
  readonly closed = output<void>();
  /** The role created or renamed, so the page can select it. */
  readonly saved = output<RoleSummary>();

  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly copyFrom = signal<number | null>(null);
  protected readonly nameError = signal('');
  protected readonly error = signal('');
  protected readonly saving = signal(false);

  protected readonly isOpen = computed(() => this.request() !== null);
  protected readonly isAdd = computed(() => this.request()?.mode === 'add');
  protected readonly roleLabel = roleLabel;

  constructor() {
    effect(() => {
      const request = this.request();
      untracked(() => {
        this.nameError.set('');
        this.error.set('');
        if (!request) return;
        const role = request.mode === 'edit' ? request.role : null;
        // The stored name, not its label: migrations find roles by name (e.g. LIBRARIAN), so it only changes on purpose.
        this.name.set(role?.name ?? '');
        this.description.set(role?.description ?? '');
        this.copyFrom.set(null);
        setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('#role-name')?.focus(), 230);
      });
    });
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected selectCopy(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.copyFrom.set(value ? Number(value) : null);
  }

  protected async save(): Promise<void> {
    const request = this.request();
    if (!request || this.saving()) return;
    const name = this.name().trim();
    this.nameError.set(name ? '' : 'Enter a name for the role.');
    if (!name) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const body = { name, description: this.description().trim() || null, copyFromRoleId: this.copyFrom() };
      const role = request.mode === 'add' ? await this.rolesApi.create(body) : await this.rolesApi.update(request.role.id, body);
      this.toast.show(request.mode === 'add' ? `Created ${role.name}. Now switch on what it may do.` : `Saved ${role.name}.`);
      this.saved.emit(role);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors['name']) {
        this.nameError.set(err.fieldErrors['name']);
      } else {
        this.error.set(errorMessage(err, 'Couldn’t save the role. Please try again.'));
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected close(): void {
    if (!this.saving()) this.closed.emit();
  }
}
