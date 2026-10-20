import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE } from '../api/api-client.service';
import { AuthService } from './auth.service';

/** Adds the bearer token to API calls, and sends the user back to sign-in when the server rejects it. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isApiCall = req.url.startsWith(API_BASE);
  const isLogin = req.url.endsWith('/auth/login');

  const token = isApiCall && !isLogin ? auth.token() : null;
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      if (isApiCall && !isLogin && err instanceof HttpErrorResponse && err.status === 401) {
        auth.clear();
        void router.navigate(['/login'], { queryParams: { expired: 1 } });
      }
      return throwError(() => err);
    }),
  );
};
