import { Injectable, inject } from '@angular/core';
import { DirectoryMember, Member, MemberDetail, MemberRemoval, MemberUpdate, NewMember } from '../models/member.model';
import { ApiClient } from './api-client.service';

/** /api/v1/members */
@Injectable({ providedIn: 'root' })
export class MembersApi {
  private readonly api = inject(ApiClient);

  /** Name or phone search, with each member's loan and overdue counts. */
  search(query: string, limit = 6): Promise<Member[]> {
    return this.api.get('/members', { q: query, limit });
  }

  create(member: NewMember): Promise<Member> {
    return this.api.post('/members', member);
  }

  /** The Members page (admin only): every member, active or not. */
  directory(): Promise<DirectoryMember[]> {
    return this.api.get('/members/directory');
  }

  detail(id: number): Promise<MemberDetail> {
    return this.api.get(`/members/${id}/detail`);
  }

  /** A taken phone number comes back on ApiError.fieldErrors.phone. */
  update(id: number, changes: MemberUpdate): Promise<MemberDetail> {
    return this.api.put(`/members/${id}`, changes);
  }

  /** Deletes a member with no history, otherwise deactivates them. Fails with 409 while they have books out. */
  remove(id: number): Promise<MemberRemoval> {
    return this.api.delete(`/members/${id}`);
  }

  reactivate(id: number): Promise<MemberDetail> {
    return this.api.post(`/members/${id}/reactivate`, {});
  }
}
