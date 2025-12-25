/**
 * Respuesta del API con la información completa de un formulario dinámico
 */
export interface FormSchemaResponse {
  /** ID del formulario */
  id: string;

  /** Nombre del formulario */
  name: string;

  /** Descripción del formulario */
  description: string;

  /** ID del producto al que aplica */
  productId: string;

  /** Nombre del producto */
  productName: string;

  /** ID de la empresa propietaria del formulario */
  companyId: string;

  /** Versión del formulario */
  version: number;

  /** Etapas del proyecto donde aplica (ej: ['INVENTORY', 'COLLECTION']) */
  applicableStages: string[];

  /** Esquema JSON del formulario (secciones, campos, validaciones) */
  schema: string;

  /** Configuración de preview */
  previewConfig: string;

  /** Fecha desde la cual es válido (ISO 8601 date string) */
  validFrom: string;

  /** Fecha hasta la cual es válido (ISO 8601 date string) */
  validUntil: string;

  /** Indica si está publicado */
  isPublished: boolean;

  /** Fecha de publicación (ISO 8601 timestamp) */
  publishedAt: string | null;
}
