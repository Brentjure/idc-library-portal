import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiClient } from '../api/api-client.service';
import { AuthUser, LoginResult, Permission } from '../models/auth.model';

interface Session {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

const STORAGE_KEY = 'idc.library.session';

/**
 * Staff sign-in. The session is kept in sessionStorage, or in localStorage with "Keep me signed in".
 * can() only hides buttons; the server checks the same permission on every call.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly session = signal<Session | null>(readStoredSession());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isSignedIn = computed(() => this.session() !== null);
  readonly firstName = computed(() => this.user()?.name.split(' ')[0] ?? '');

  /** The bearer token, or null when signed out or expired. */
  token(): string | null {
    const session = this.session();
    if (!session) {
      return null;
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      this.clear();
      return null;
    }
    return session.token;
  }

  can(permission: Permission): boolean {
    return this.user()?.permissions.includes(permission) ?? false;
  }

  async signIn(email: string, password: string, keepSignedIn: boolean): Promise<void> {
    const result = await this.api.post<LoginResult>('/auth/login', { email, password });
    const session: Session = { token: result.token, expiresAt: result.expiresAt, user: result.user };
    clearStorage();
    try {
      (keepSignedIn ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage can be blocked (private mode). The session still works until the tab closes.
    }
    this.session.set(session);
  }

  signOut(): void {
    this.clear();
    void this.router.navigate(['/login']);
  }

  /** Forgets the session without navigating, e.g. after the server answers 401. */
  clear(): void {
    clearStorage();
    this.session.set(null);
  }
}

function readStoredSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const session = JSON.parse(raw) as Session;
    return new Date(session.expiresAt).getTime() > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
