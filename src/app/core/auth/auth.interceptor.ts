import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * HTTP Interceptor to add Firebase Auth token to all HTTP requests
 * Automatically adds Authorization header with Bearer token
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Skip adding token for Firebase Auth requests
  if (req.url.includes('identitytoolkit.googleapis.com')) {
    return next(req);
  }

  // Get Firebase ID token and add to request headers
  return from(authService.getIdToken()).pipe(
    switchMap((token) => {
      if (token) {
        const clonedReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });
        return next(clonedReq);
      }
      // No token available, proceed without Authorization header
      return next(req);
    }),
  );
};
