import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { ActivatedRouteSnapshot, ViewTransitionInfo, provideRouter, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

/** The page's path, e.g. "loans" or "setup/abc", read through the nested route snapshots. */
function pathOf(snapshot: ActivatedRouteSnapshot): string {
  const parts: string[] = [];
  for (let route: ActivatedRouteSnapshot | null = snapshot; route; route = route.firstChild) {
    parts.push(...route.url.map((segment) => segment.path));
  }
  return parts.join('/');
}

/**
 * Page changes inside the portal fade and rise (styles.css, "Page transitions"). No animation when only the query
 * changes, or on the way into or out of the sign-in and setup pages, which aren't part of the shell.
 */
function onViewTransitionCreated({ transition, from, to }: ViewTransitionInfo): void {
  const before = pathOf(from);
  const after = pathOf(to);
  const outsideShell = (path: string) => path.startsWith('login') || path.startsWith('setup');
  if (before === after || outsideShell(before) || outsideShell(after)) {
    transition.skipTransition();
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withViewTransitions({ skipInitialTransition: true, onViewTransitionCreated })),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
  ],
};
