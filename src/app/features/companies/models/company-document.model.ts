/**
 * Documento adjunto a una empresa (RUC, licencias, poderes, etc.)
 */
export interface CompanyDocument {
  id: string;
  companyId: string;
  fileName: string; // Nombre en Azure Storage (ej: "company-123/ruc-20123456789.pdf")
  originalFileName: string; // Nombre original del archivo subido
  documentType: CompanyDocumentType;
  fileSize: number; // Tamaño en bytes
  mimeType: string; // "application/pdf", "image/jpeg", etc.
  blobUrl: string; // URL completa de Azure Blob Storage
  uploadedBy: string; // userId del usuario que subió
  uploadedAt: Date;
  status: DocumentStatus;
}

/**
 * Tipos de documentos que puede adjuntar una empresa
 */
export type CompanyDocumentType =
  | 'ruc' // Registro Único de Contribuyentes (obligatorio)
  | 'license' // Licencias de operación
  | 'certificate' // Certificados (orgánico, fair trade, etc.)
  | 'power_of_attorney' // Poderes del representante legal
  | 'other'; // Otros documentos

/**
 * Estado del documento
 */
export type DocumentStatus =
  | 'pending' // Subida iniciada pero no confirmada
  | 'uploaded' // Subido exitosamente
  | 'verified' // Verificado por admin Pachamama
  | 'rejected'; // Rechazado (documento inválido)

/**
 * Metadata de un archivo durante el proceso de subida
 */
export interface UploadingFile {
  file: File;
  documentType: CompanyDocumentType;
  progress: number; // 0-100
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  uploadedDocument?: CompanyDocument; // Resultado después de subir
}
