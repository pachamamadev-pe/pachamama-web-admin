/**
 * Response del backend al solicitar una URL de subida con SAS Token
 */
export interface UploadUrlResponse {
  /**
   * URL firmada con SAS Token para subir directamente a Azure Blob Storage
   * Ejemplo: "https://pachamamastorage.blob.core.windows.net/documents/company-123/ruc-20123456789.pdf?sv=2021-06-08&se=2025-11-02T15:00:00Z&sp=w&sig=ABC123..."
   */
  uploadUrl: string;

  /**
   * Nombre del blob en Azure Storage (ruta completa dentro del contenedor)
   * Ejemplo: "company-123/ruc-20123456789.pdf"
   */
  blobName: string;

  /**
   * Fecha/hora de expiración del SAS Token
   * Después de este momento, la URL ya no será válida
   */
  expiresAt: Date;
}
