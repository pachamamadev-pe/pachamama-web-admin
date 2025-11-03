import { CompanyDocumentType } from './company-document.model';

/**
 * DTO para solicitar una URL de subida al backend
 */
export interface RequestUploadUrlDto {
  fileName: string; // Nombre del archivo a subir
  fileType: string; // MIME type (application/pdf, image/jpeg, etc.)
  documentType: CompanyDocumentType;
}

/**
 * DTO para confirmar que un archivo se subió exitosamente a Azure
 */
export interface ConfirmUploadDto {
  fileName: string; // Nombre en Azure Storage
  originalFileName: string; // Nombre original del archivo
  documentType: CompanyDocumentType;
  fileSize: number; // Bytes
  mimeType: string;
  blobName: string; // Ruta completa en Azure (ej: "company-123/ruc-20123456789.pdf")
}
