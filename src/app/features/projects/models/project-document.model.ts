/**
 * Modelos para la gestión de documentos de proyectos
 */

import { ProjectStage } from './project.model';

/**
 * Estados de validación de un documento
 */
export type DocumentValidationStatus = 'pending' | 'observed' | 'approved' | 'rejected';

/**
 * Tipo de documento
 */
export interface DocumentType {
  id: string;
  code: string;
  name: string;
  description?: string;
  requiresApproval: boolean;
  icon?: string; // Icono del tipo de documento
  requiresValidationAttachment?: boolean; // ¿Requiere adjunto de validación?
  validationAttachmentMimeTypes?: string[]; // Tipos MIME permitidos
  validationAttachmentMaxSizeMb?: number; // Tamaño máximo en MB
}

/**
 * Tipo de documento con información de requerimiento (usado en requirements endpoint)
 */
export interface DocumentTypeRequirement extends DocumentType {
  documentTypeId: string | null;
  isRequired: boolean;
  isUploaded: boolean;
  uploadedStatus: DocumentValidationStatus | null;
  uploadedDocumentId: string | null;
  uploadedVersion: number | null;
  uploadedAt: string | null;
  maxFileSizeMb: number;
  allowedMimeTypes: string[];
  hasExpiration: boolean;
  expirationWarningDays: number | null;
  category: string;
  requiredForStages: ProjectStage[] | null;
}

/**
 * Documento de proyecto
 */
export interface ProjectDocument {
  id: string;
  companyId: string;
  documentType: DocumentType;
  entityType: 'projects';
  entityId: string; // projectId
  projectStage: ProjectStage;
  blobUrl: string;
  blobName: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  version: number;
  isLatestVersion: boolean;
  issueDate?: string; // LocalDate
  expirationDate?: string; // LocalDate
  isExpired?: boolean;
  daysUntilExpiration?: number;
  validationStatus: DocumentValidationStatus;
  validatedBy: string | null;
  validatedByName: string | null;
  validatedAt: string | null; // ISO datetime
  validationNotes: string | null;
  validationAttachmentUrl?: string | null; // URL del archivo adjuntado durante la validación
  uploadedBy: string;
  uploadedAt: string; // ISO datetime
  metadata?: Record<string, unknown>;
  status: 'active' | 'inactive';
  previousVersion?: {
    id: string;
    version: number;
  };
}

/**
 * Requerimientos de documentos para un proyecto
 */
export interface DocumentRequirements {
  projectId: string;
  projectName: string;
  currentStage: ProjectStage;
  documentTypes: DocumentTypeRequirement[];
  totalRequired: number;
  requiredUploaded: number;
  totalOptional: number;
  optionalUploaded: number;
  isCompliant: boolean; // ¿Cumple con todos los documentos obligatorios?
}

/**
 * Request para subir un documento
 */
export interface UploadDocumentRequest {
  documentTypeId: string;
  projectStage?: ProjectStage;
  issueDate?: string; // YYYY-MM-DD
  expirationDate?: string; // YYYY-MM-DD
  metadata?: Record<string, unknown>;
}

/**
 * Request para observar/rechazar un documento
 */
export interface DocumentReviewRequest {
  notes?: string;
}

/**
 * Response simplificado de validación (aprobar/observar/rechazar)
 */
export interface DocumentValidationResponse {
  id: string;
  validationStatus: DocumentValidationStatus;
  validatedBy: string;
  validatedAt: string;
  validationNotes: string | null;
}
