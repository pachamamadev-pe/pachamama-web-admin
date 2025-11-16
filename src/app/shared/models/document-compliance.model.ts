import { DocumentType } from './document-type.model';

/**
 * Estado de cumplimiento de documentos de una entidad
 */
export interface DocumentCompliance {
  isCompliant: boolean; // ¿Cumple con todos los requeridos?
  requiredCount: number; // Total de documentos requeridos
  providedCount: number; // Documentos requeridos subidos
  missingDocuments: DocumentType[]; // Documentos faltantes
}

/**
 * Helper para calcular el porcentaje de cumplimiento
 */
export function getCompliancePercentage(compliance: DocumentCompliance): number {
  if (compliance.requiredCount === 0) return 100;
  return Math.round((compliance.providedCount / compliance.requiredCount) * 100);
}

/**
 * Helper para obtener texto descriptivo del cumplimiento
 */
export function getComplianceText(compliance: DocumentCompliance): string {
  return `${compliance.providedCount} de ${compliance.requiredCount} documentos obligatorios`;
}

/**
 * Helper para obtener clase CSS del badge de cumplimiento
 */
export function getComplianceBadgeClass(compliance: DocumentCompliance): string {
  if (compliance.isCompliant) {
    return 'bg-secondary-light text-secondary'; // Verde Pachamama
  }
  if (compliance.providedCount === 0) {
    return 'bg-red-100 text-red-800'; // Rojo - ninguno subido
  }
  return 'bg-yellow-100 text-yellow-800'; // Amarillo - parcialmente completo
}

/**
 * Helper para obtener label del badge de cumplimiento
 */
export function getComplianceBadgeLabel(compliance: DocumentCompliance): string {
  if (compliance.isCompliant) return 'Completo';
  if (compliance.providedCount === 0) return 'Pendiente';
  return 'Incompleto';
}
