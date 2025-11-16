/**
 * Documento subido a una entidad (empresa, proyecto, colector, etc.)
 */
export interface EntityDocument {
  id: string;
  companyId: string; // UUID de la empresa propietaria
  documentType: {
    id: string;
    code: string;
    name: string;
  };
  entityType: string; // "companies", "projects", "collectors"
  entityId: string; // UUID de la entidad
  blobUrl: string; // URL del archivo en Azure
  blobName: string; // Nombre del blob en Azure Storage (path para SAS token)
  fileName: string; // Nombre original del archivo
  fileSizeBytes: number;
  mimeType: string;
  version: number; // 1, 2, 3... (versionado automático)
  isLatestVersion: boolean;
  issueDate?: string; // Fecha de emisión (YYYY-MM-DD)
  expirationDate?: string; // Fecha de expiración (YYYY-MM-DD)
  isExpired?: boolean; // Calculado por backend
  daysUntilExpiration?: number; // Días hasta expirar (calculado)
  validationStatus: DocumentValidationStatus;
  validationNotes?: string;
  validatedBy?: string; // UUID del validador
  validatedAt?: string; // ISO 8601
  uploadedBy: string; // UUID del uploader
  uploadedAt: string; // ISO 8601
  status: EntityDocumentStatus;
}

export enum DocumentValidationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum EntityDocumentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * DTO para subir un documento
 */
export interface UploadDocumentDto {
  documentTypeId: string;
  entityType: string; // "companies", "projects", etc.
  entityId: string;
  issueDate?: string; // YYYY-MM-DD
  expirationDate?: string; // YYYY-MM-DD
}

/**
 * Helper para formatear el tamaño del archivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Helper para obtener badge de estado de validación
 */
export function getValidationStatusBadge(status: DocumentValidationStatus): {
  label: string;
  class: string;
} {
  switch (status) {
    case DocumentValidationStatus.APPROVED:
      return { label: 'Aprobado', class: 'bg-secondary-light text-secondary' };
    case DocumentValidationStatus.PENDING:
      return { label: 'Pendiente', class: 'bg-yellow-100 text-yellow-800' };
    case DocumentValidationStatus.REJECTED:
      return { label: 'Rechazado', class: 'bg-red-100 text-red-800' };
    case DocumentValidationStatus.EXPIRED:
      return { label: 'Expirado', class: 'bg-gray-100 text-neutral-subheading' };
    default:
      return { label: 'Desconocido', class: 'bg-gray-100 text-neutral-subheading' };
  }
}

/**
 * Helper para verificar si un documento está por expirar
 */
export function isDocumentExpiringSoon(document: EntityDocument, warningDays = 30): boolean {
  if (!document.daysUntilExpiration) return false;
  return document.daysUntilExpiration <= warningDays && document.daysUntilExpiration > 0;
}
