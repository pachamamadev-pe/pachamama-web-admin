/**
 * Empresa registrada en el sistema Pachamama
 */
export interface Company {
  id: string; // UUID
  code: string; // Código único (ej: "ACME-001")
  businessName: string; // Razón social
  tradeName?: string; // Nombre comercial (opcional)
  ruc: string; // RUC único (11 dígitos)
  taxAddress?: string; // Dirección fiscal (opcional)
  contactEmail: string; // Email principal
  contactPhone?: string; // Teléfono (opcional)
  legalRepresentative?: string; // Representante legal (opcional)
  subdomain?: string; // Subdominio (opcional)
  licenseType?: LicenseType;
  status: CompanyStatus;
  createdAt: string; // ISO 8601
  updatedAt?: string;
  userCount?: number; // Cantidad de administradores
}

/**
 * Estados posibles de una empresa
 */
export enum CompanyStatus {
  ACTIVE = 'active', // Activa (todos los documentos completos)
  INACTIVE = 'inactive', // Inactiva (deshabilitada manualmente)
  SUSPENDED = 'suspended', // Suspendida (por problemas legales/pago)
  PENDING_DOCUMENTS = 'pending_documents', // Pendiente de documentos obligatorios
}

/**
 * Tipos de licencia disponibles
 */
export enum LicenseType {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

/**
 * Helper para obtener label del estado
 */
export function getCompanyStatusLabel(status: CompanyStatus): string {
  switch (status) {
    case CompanyStatus.ACTIVE:
      return 'Activa';
    case CompanyStatus.INACTIVE:
      return 'Inactiva';
    case CompanyStatus.SUSPENDED:
      return 'Suspendida';
    case CompanyStatus.PENDING_DOCUMENTS:
      return 'Pendiente de documentos';
    default:
      return 'Desconocido';
  }
}

/**
 * Helper para obtener clase CSS del badge de estado
 */
export function getCompanyStatusClass(status: CompanyStatus): string {
  switch (status) {
    case CompanyStatus.ACTIVE:
      return 'bg-secondary-light text-secondary'; // Verde Pachamama
    case CompanyStatus.INACTIVE:
      return 'bg-gray-100 text-neutral-subheading'; // Gris
    case CompanyStatus.SUSPENDED:
      return 'bg-red-100 text-red-800'; // Rojo
    case CompanyStatus.PENDING_DOCUMENTS:
      return 'bg-yellow-100 text-yellow-800'; // Amarillo
    default:
      return 'bg-gray-100 text-neutral-subheading';
  }
}

/**
 * Helper para obtener icono del estado
 */
export function getCompanyStatusIcon(status: CompanyStatus): string {
  switch (status) {
    case CompanyStatus.ACTIVE:
      return 'check_circle';
    case CompanyStatus.INACTIVE:
      return 'cancel';
    case CompanyStatus.SUSPENDED:
      return 'block';
    case CompanyStatus.PENDING_DOCUMENTS:
      return 'hourglass_empty';
    default:
      return 'help';
  }
}

/**
 * Helper para obtener label del tipo de licencia
 */
export function getLicenseTypeLabel(type?: LicenseType): string {
  if (!type) return '-';
  switch (type) {
    case LicenseType.BASIC:
      return 'Básica';
    case LicenseType.PREMIUM:
      return 'Premium';
    case LicenseType.ENTERPRISE:
      return 'Enterprise';
    default:
      return '-';
  }
}
