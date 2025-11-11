import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  user,
  UserCredential,
  authState,
} from '@angular/fire/auth';
import { Observable, from, map, catchError, switchMap } from 'rxjs';
import { User, LoginCredentials, AUTH_ERROR_MESSAGES } from './auth.models';

/**
 * Authentication service using Firebase Auth
 * Handles login, logout, user state management, and token generation
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);

  // Signals for reactive state management
  private currentUserSignal = signal<User | null>(null);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Public computed signals
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  constructor() {
    // Subscribe to Firebase auth state changes
    authState(this.auth).subscribe((firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        this.currentUserSignal.set(this.mapFirebaseUser(firebaseUser));
      } else {
        this.currentUserSignal.set(null);
      }
    });
  }

  /**
   * Login with email and password
   * @param credentials - User email and password
   * @returns Observable<UserCredential>
   */
  login(credentials: LoginCredentials): Observable<UserCredential> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(
      signInWithEmailAndPassword(this.auth, credentials.email, credentials.password),
    ).pipe(
      switchMap(async (userCredential: UserCredential) => {
        this.currentUserSignal.set(this.mapFirebaseUser(userCredential.user));
        // Guardar token inmediatamente después del login
        const token = await userCredential.user.getIdToken();
        localStorage.setItem('pachamama_auth_token', token);
        this.loadingSignal.set(false);
        return userCredential;
      }),
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error.code);
        this.errorSignal.set(errorMessage);
        this.loadingSignal.set(false);
        throw new Error(errorMessage);
      }),
    );
  }

  /**
   * Logout current user
   * Clears user state and redirects to login page
   */
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.currentUserSignal.set(null);
      // Limpiar token del localStorage
      localStorage.removeItem('pachamama_auth_token');
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error during logout:', error);
      this.errorSignal.set('Error al cerrar sesión');
    }
  }

  /**
   * Get current authenticated user as Observable
   * @returns Observable<User | null>
   */
  getCurrentUser(): Observable<User | null> {
    return user(this.auth).pipe(
      map((firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          return this.mapFirebaseUser(firebaseUser);
        }
        return null;
      }),
    );
  }

  /**
   * Get Firebase ID token for API authentication
   * @returns Promise<string | null>
   */
  async getIdToken(): Promise<string | null> {
    try {
      const currentUser = this.auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        // Guardar token en localStorage para testing con Postman
        localStorage.setItem('pachamama_auth_token', token);
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated (synchronous)
   * @returns boolean
   */
  isAuthenticatedSync(): boolean {
    return this.auth.currentUser !== null;
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Map Firebase User to application User model
   * @param firebaseUser - Firebase user object
   * @returns User
   */
  private mapFirebaseUser(firebaseUser: FirebaseUser): User {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
    };
  }

  /**
   * Get user-friendly error message from Firebase error code
   * @param errorCode - Firebase error code
   * @returns string
   */
  private getErrorMessage(errorCode: string): string {
    return AUTH_ERROR_MESSAGES[errorCode] || AUTH_ERROR_MESSAGES['auth/unknown'];
  }
}
