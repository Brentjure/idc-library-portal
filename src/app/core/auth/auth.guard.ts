import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Permission } from '../models/auth.model';
import { AuthService } from './auth.service';

/** Pages for signed-in staff. */
export const signedInGuard: CanActivateFn = () =>
  inject(AuthService).token() ? true : inject(Router).createUrlTree(['/login']);

/** The sign-in page: skip it when already signed in. */
export const signedOutGuard: CanActivateFn = () =>
  inject(AuthService).token() ? inject(Router).createUrlTree(['/']) : true;

/**
 * A page that needs a permission. Without it, go to the overview. This only hides the page;
 * the server checks the same permission on every call.
 */
export function permissionGuard(permission: Permission): CanActivateFn {
  return () => (inject(AuthService).can(permission) ? true : inject(Router).createUrlTree(['/']));
}
