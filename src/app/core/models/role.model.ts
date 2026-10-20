/** A permission as the Roles & Permissions page shows it. */
export interface PermissionItem {
  id: number;
  /** What the code checks, e.g. books.edit. */
  key: string;
  /** Plain name, e.g. "Edit books". */
  label: string;
  /** Books, Loans, Members… */
  section: string;
  description: string | null;
}

export interface RoleSummary {
  id: number;
  name: string;
  description: string | null;
  /** The locked Administrator role: every permission, can't be edited or deleted. */
  system: boolean;
  users: number;
  permissionIds: number[];
}

/** GET /roles/catalog */
export interface RolesCatalog {
  roles: RoleSummary[];
  permissions: PermissionItem[];
}

export interface RoleRequest {
  name: string;
  description: string | null;
  /** Only when creating: start with this role's permissions. */
  copyFromRoleId: number | null;
}
