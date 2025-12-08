/**
 * Tipo de documento de identidad
 */
export type DocumentType = 'DNI' | 'CARNET_EXTRANJERIA' | 'PASAPORTE';

/**
 * Usuario de empresa
 */
export interface CompanyUser {
  id: string;
  tenantId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  documentType: DocumentType;
  documentNumber: string;
  role: string; // Código del rol
  authProviderUid: string;
}

/**
 * Request para crear un nuevo usuario de empresa
 */
export interface CreateCompanyUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  documentType: DocumentType;
  documentNumber: string;
  roleCode: string;
}

/**
 * Request para actualizar un usuario de empresa
 * Si se cambia el email, el usuario tendrá que validarlo nuevamente
 */
export interface UpdateCompanyUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  documentType: DocumentType;
  documentNumber: string;
}

/**
 * Respuesta paginada del API para usuarios de empresa
 */
export interface CompanyUsersPageResponse {
  page: number;
  size: number;
  total: number;
  items: CompanyUser[];
}

/**
 * Obtiene el nombre completo de un usuario
 */
export function getFullName(user: CompanyUser): string {
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  return `${firstName} ${lastName}`.trim() || user.email;
}

/**
 * Obtiene las iniciales de un usuario para el avatar
 */
export function getUserInitials(user: CompanyUser): string {
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';

  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  if (firstName) {
    return firstName.substring(0, 2).toUpperCase();
  }

  return user.email.substring(0, 2).toUpperCase();
}

/**
 * Obtiene la etiqueta legible del tipo de documento
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    DNI: 'DNI',
    CARNET_EXTRANJERIA: 'C. Extranjería',
    PASAPORTE: 'Pasaporte',
  };
  return labels[type] || type;
}
