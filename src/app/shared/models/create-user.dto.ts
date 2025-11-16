/**
 * Alcance del rol del usuario
 */
export enum RoleScope {
  SYSTEM = 'SYSTEM',
  COMPANY = 'COMPANY',
}

/**
 * Tipos de documento de identidad
 */
export enum DocumentType {
  DNI = 'DNI',
  CE = 'CE',
  RUC = 'RUC',
}

/**
 * Roles disponibles en el sistema
 */
export enum ParamRole {
  ADMIN_PACHAMAMA = 'ADMIN_PACHAMAMA',
  ADMIN_EMPRESA = 'ADMIN_EMPRESA',
}

/**
 * Request para crear un nuevo usuario
 */
export interface CreateUserRequest {
  scope: RoleScope;
  tenantId: string; // UUID de la empresa (requerido cuando scope=COMPANY)
  email: string;
  documentType: DocumentType;
  documentNumber: string;
  role: ParamRole;
  firstName: string;
  lastName: string;
}

/**
 * Modelo de usuario del sistema
 */
export interface User {
  id: string;
  tenantId: string;
  email: string;
  documentType: DocumentType | null;
  documentNumber: string | null;
  firstName?: string;
  lastName?: string;
  role: string;
  authProviderUid?: string;
  createdAt?: string;
  active?: boolean;
}
