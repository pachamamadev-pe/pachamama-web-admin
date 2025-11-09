/**
 * User model representing authenticated user from Firebase
 */
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

/**
 * Login credentials for email/password authentication
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Authentication error codes from Firebase
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'auth/invalid-credential',
  USER_NOT_FOUND = 'auth/user-not-found',
  WRONG_PASSWORD = 'auth/wrong-password',
  TOO_MANY_REQUESTS = 'auth/too-many-requests',
  NETWORK_ERROR = 'auth/network-request-failed',
  UNKNOWN = 'auth/unknown',
}

/**
 * User-friendly error messages for authentication errors
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  [AuthErrorCode.INVALID_CREDENTIALS]:
    'Credenciales inválidas. Por favor verifica tu email y contraseña.',
  [AuthErrorCode.USER_NOT_FOUND]: 'No existe una cuenta con este correo electrónico.',
  [AuthErrorCode.WRONG_PASSWORD]: 'La contraseña es incorrecta.',
  [AuthErrorCode.TOO_MANY_REQUESTS]: 'Demasiados intentos fallidos. Por favor intenta más tarde.',
  [AuthErrorCode.NETWORK_ERROR]: 'Error de conexión. Por favor verifica tu conexión a internet.',
  [AuthErrorCode.UNKNOWN]: 'Ha ocurrido un error inesperado. Por favor intenta nuevamente.',
};
