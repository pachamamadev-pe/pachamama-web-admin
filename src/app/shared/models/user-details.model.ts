/**
 * Detalle completo del usuario
 */
export interface UserDetails {
  id: string;
  companyId: string;
  companyName: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  avatarUrl: string | null;
}

/**
 * Request para actualizar datos del usuario
 */
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  documentType?: string;
  documentNumber?: string;
  avatarUrl?: string | null;
}

/**
 * Request para cambiar la contraseña
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
