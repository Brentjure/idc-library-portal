import { PermissionItem, RoleSummary } from '../../core/models/role.model';
import { RolePermissionsForm, groupBySection } from './role-permissions.form';

const PERMISSIONS: PermissionItem[] = [
  { id: 1, key: 'books.view', label: 'See the catalogue', section: 'Books', description: null },
  { id: 2, key: 'books.edit', label: 'Edit books', section: 'Books', description: null },
  { id: 3, key: 'loans.borrow', label: 'Lend books', section: 'Loans', description: null },
];
const SECTIONS = groupBySection(PERMISSIONS);

function role(overrides: Partial<RoleSummary> = {}): RoleSummary {
  return { id: 2, name: 'LIBRARIAN', description: null, system: false, users: 3, permissionIds: [1], ...overrides };
}

describe('Role permissions form', () => {
  it('groups permissions by section in the order they come', () => {
    expect(SECTIONS.map((s) => [s.name, s.permissions.map((p) => p.id)])).toEqual([
      ['Books', [1, 2]],
      ['Loans', [3]],
    ]);
  });

  it('keeps changes as a draft and counts them', () => {
    const form = new RolePermissionsForm();
    form.load(role());
    expect(form.dirty()).toBe(false);

    form.toggle(1);
    form.toggle(3);

    expect(form.isOn(1)).toBe(false);
    expect(form.isOn(3)).toBe(true);
    expect([form.added(), form.removed()]).toEqual([1, 1]);
    expect(form.dirty()).toBe(true);
    expect(form.toRequest()).toEqual([3]);
  });

  it('switches a whole section on, then off again', () => {
    const form = new RolePermissionsForm();
    form.load(role());
    expect(form.sectionState(SECTIONS[0])).toBe('some');

    form.toggleSection(SECTIONS[0]);
    expect(form.sectionState(SECTIONS[0])).toBe('all');
    expect(form.toRequest()).toEqual([1, 2]);

    form.toggleSection(SECTIONS[0]);
    expect(form.sectionState(SECTIONS[0])).toBe('none');
  });

  it('discards back to what was saved, and remembers a save', () => {
    const form = new RolePermissionsForm();
    form.load(role());
    form.toggle(2);
    form.discard();
    expect(form.toRequest()).toEqual([1]);

    form.toggle(2);
    form.markSaved();
    expect(form.dirty()).toBe(false);
    expect(form.count()).toBe(2);
  });

  it('never changes the Administrator role', () => {
    const form = new RolePermissionsForm();
    form.load(role({ id: 1, name: 'ADMIN', system: true, permissionIds: [1, 2, 3] }));
    form.toggle(1);
    form.toggleSection(SECTIONS[1]);
    expect(form.locked()).toBe(true);
    expect(form.dirty()).toBe(false);
    expect(form.toRequest()).toEqual([1, 2, 3]);
  });
});
