import { Injectable, inject } from '@angular/core';
import { RoleRequest, RoleSummary, RolesCatalog } from '../models/role.model';
import { ApiClient } from './api-client.service';

/** /api/v1/roles */
@Injectable({ providedIn: 'root' })
export class RolesApi {
  private readonly api = inject(ApiClient);

  catalog(): Promise<RolesCatalog> {
    return this.api.get('/roles/catalog');
  }

  /** A taken name comes back on ApiError.fieldErrors.name. */
  create(role: RoleRequest): Promise<RoleSummary> {
    return this.api.post('/roles', role);
  }

  update(id: number, role: RoleRequest): Promise<RoleSummary> {
    return this.api.put(`/roles/${id}`, role);
  }

  /** Fails with 409 for Administrator, or while users have the role. */
  remove(id: number): Promise<void> {
    return this.api.delete(`/roles/${id}`);
  }

  /** Replaces the role's permissions. Not for Administrator. */
  setPermissions(id: number, permissionIds: number[]): Promise<unknown> {
    return this.api.put(`/roles/${id}/permissions`, { permissionIds });
  }
}
