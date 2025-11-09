import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs';

/**
 * Auth Guard to protect routes that require authentication
 * Redirects to /login if user is not authenticated
 *
 * IMPORTANT: Uses authState observable to wait for Firebase to restore
 * the session from localStorage. This prevents logout on page refresh.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Wait for Firebase to restore the session (async)
  return authState(auth).pipe(
    take(1), // Only take the first emission (current state)
    map((user) => {
      if (user) {
        return true; // User is authenticated
      }
      // Redirect to login if not authenticated
      return router.createUrlTree(['/login']);
    }),
  );
};

/**
 * Login Guard to prevent authenticated users from accessing login page
 * Redirects to /home if user is already authenticated
 */
export const loginGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Wait for Firebase to restore the session (async)
  return authState(auth).pipe(
    take(1), // Only take the first emission
    map((user) => {
      if (user) {
        // Redirect to home if already authenticated
        return router.createUrlTree(['/home']);
      }
      return true; // Allow access to login
    }),
  );
};
