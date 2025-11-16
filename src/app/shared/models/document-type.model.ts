/**
 * Tipo de documento genérico que puede aplicarse a diferentes entidades
 * (empresas, proyectos, colectores, etc.)
 */
export interface DocumentType {
  id: string;
  companyId: string | null; // null = documento global Pachamama
  code: string; // "RUC", "LICENSE", "LOGO", etc.
  name: string; // "Cédula RUC", "Licencia de Operación"
  description?: string;
  applicableTo: string[]; // ["companies", "projects", "collectors"]
  isRequired: boolean;
  requiredForLicense?: string[]; // ["premium"] - Req. para ciertos tipos
  maxFileSizeMb: number;
  allowedMimeTypes: string[]; // ["application/pdf", "image/jpeg"]
  hasExpiration: boolean;
  expirationWarningDays?: number; // Días antes de expirar para alertar
  displayOrder: number;
  category?: string; // "fiscal", "legal", "branding"
  icon?: string; // Nombre del icono Material
  status: DocumentTypeStatus;
}

export enum DocumentTypeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Helper para verificar si un tipo de archivo es permitido
 */
export function isFileTypeAllowed(file: File, documentType: DocumentType): boolean {
  return documentType.allowedMimeTypes.includes(file.type);
}

/**
 * Helper para verificar si el tamaño del archivo es válido
 */
export function isFileSizeValid(file: File, documentType: DocumentType): boolean {
  const maxBytes = documentType.maxFileSizeMb * 1024 * 1024;
  return file.size <= maxBytes;
}

/**
 * Helper para obtener mensaje de error de tipo de archivo
 */
export function getFileTypeErrorMessage(documentType: DocumentType): string {
  const types = documentType.allowedMimeTypes
    .map((mime) => {
      if (mime === 'application/pdf') return 'PDF';
      if (mime.startsWith('image/')) return mime.replace('image/', '').toUpperCase();
      return mime;
    })
    .join(', ');
  return `Solo se permiten archivos: ${types}`;
}

/**
 * Helper para obtener mensaje de error de tamaño
 */
export function getFileSizeErrorMessage(documentType: DocumentType): string {
  return `El archivo no debe superar ${documentType.maxFileSizeMb} MB`;
}
