import { computed, signal } from '@angular/core';
import { PermissionItem, RoleSummary } from '../../core/models/role.model';

export interface PermissionSection {
  name: string;
  permissions: PermissionItem[];
}

/** Sections in the order the server sends permissions, each with its permissions. */
export function groupBySection(permissions: readonly PermissionItem[]): PermissionSection[] {
  const sections: PermissionSection[] = [];
  for (const p of permissions) {
    const section = sections.find((s) => s.name === p.section);
    if (section) {
      section.permissions.push(p);
    } else {
      sections.push({ name: p.section, permissions: [p] });
    }
  }
  return sections;
}

/**
 * The switched-on permissions of the selected role, while being edited. Plain signals with no HTTP.
 * Changes stay a draft until saved; discarding goes back to what was saved.
 */
export class RolePermissionsForm {
  readonly role = signal<RoleSummary | null>(null);
  private readonly saved = signal<ReadonlySet<number>>(new Set());
  private readonly draft = signal<ReadonlySet<number>>(new Set());

  /** Administrator always has everything and can't be changed. */
  readonly locked = computed(() => this.role()?.system ?? false);
  readonly added = computed(() => [...this.draft()].filter((id) => !this.saved().has(id)).length);
  readonly removed = computed(() => [...this.saved()].filter((id) => !this.draft().has(id)).length);
  readonly dirty = computed(() => this.added() + this.removed() > 0);
  readonly count = computed(() => this.draft().size);

  load(role: RoleSummary | null): void {
    const ids = new Set(role?.permissionIds ?? []);
    this.role.set(role);
    this.saved.set(ids);
    this.draft.set(ids);
  }

  isOn(id: number): boolean {
    return this.draft().has(id);
  }

  toggle(id: number): void {
    if (this.locked()) return;
    this.draft.update((ids) => {
      const next = new Set(ids);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  /** "Select all" for a section, or clear it when everything in it is already on. */
  toggleSection(section: PermissionSection): void {
    if (this.locked()) return;
    const ids = section.permissions.map((p) => p.id);
    const allOn = ids.every((id) => this.draft().has(id));
    this.draft.update((current) => {
      const next = new Set(current);
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  sectionState(section: PermissionSection): 'all' | 'some' | 'none' {
    const on = section.permissions.filter((p) => this.draft().has(p.id)).length;
    return on === 0 ? 'none' : on === section.permissions.length ? 'all' : 'some';
  }

  discard(): void {
    this.draft.set(this.saved());
  }

  /** After a successful save. */
  markSaved(): void {
    this.saved.set(this.draft());
  }

  toRequest(): number[] {
    return [...this.draft()].sort((a, b) => a - b);
  }
}
