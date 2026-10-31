import { Injectable, inject } from '@angular/core';
import {
  AcceptInvitation,
  InvitationInfo,
  InvitationLink,
  NewStaffUser,
  RoleOption,
  StaffUser,
  StaffUserUpdate,
} from '../models/user.model';
import { ApiClient } from './api-client.service';

/** /api/v1/users, /api/v1/roles and the public /api/v1/auth/invitations */
@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly api = inject(ApiClient);

  directory(): Promise<StaffUser[]> {
    return this.api.get('/users/directory');
  }

  roles(): Promise<RoleOption[]> {
    return this.api.get('/roles');
  }

  /** A taken email comes back on ApiError.fieldErrors.email. */
  invite(user: NewStaffUser): Promise<InvitationLink> {
    return this.api.post('/users/invite', user);
  }

  /** Fails with 409 for the rules: not yourself, always one active Administrator. */
  update(id: number, changes: StaffUserUpdate): Promise<StaffUser> {
    return this.api.put(`/users/${id}`, changes);
  }

  /** A new link; the previous one stops working. */
  newInvitation(id: number): Promise<InvitationLink> {
    return this.api.post(`/users/${id}/invitation`, {});
  }

  /** Only for someone who never set up their account. */
  /** Lets someone locked out after too many wrong passwords try again now. */
  unlock(id: number): Promise<StaffUser> {
    return this.api.post(`/users/${id}/unlock`, {});
  }

  withdraw(id: number): Promise<void> {
    return this.api.delete(`/users/${id}`);
  }

  /** Public. Fails with 404 when the link is used, expired or unknown. */
  invitation(token: string): Promise<InvitationInfo> {
    return this.api.get(`/auth/invitations/${encodeURIComponent(token)}`);
  }

  /** Public. Resolves with the email to sign in with. */
  acceptInvitation(token: string, details: AcceptInvitation): Promise<string> {
    return this.api.post(`/auth/invitations/${encodeURIComponent(token)}`, details);
  }
}
