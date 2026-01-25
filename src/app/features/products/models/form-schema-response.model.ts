/**
 * Estado del formulario
 */
export type FormStatus = 'draft' | 'published' | 'archived';

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

  /** ID de la empresa propietaria del formulario (null = global) */
  companyId: string | null;

  /** Versión del formulario */
  version: number;

  /** Estado del formulario: draft, published, archived */
  status: FormStatus;

  /** Etapas del proyecto donde aplica (ej: ['inventory', 'collection']) */
  applicableStages: string[];

  /** Esquema JSON del formulario (secciones, campos, validaciones) */
  schema: string;

  /** Configuración de preview */
  previewConfig: string | null;

  /** Fecha desde la cual es válido (ISO 8601 date string) */
  validFrom: string | null;

  /** Fecha hasta la cual es válido (ISO 8601 date string) */
  validUntil: string | null;

  /** Indica si está publicado */
  isPublished: boolean;

  /** Fecha de publicación (ISO 8601 timestamp) */
  publishedAt: string | null;

  /** Fecha de creación */
  createdAt: string;

  /** Fecha de última actualización */
  updatedAt: string;

  /** ID del usuario que creó el formulario */
  createdBy: string;

  /** ID del usuario que actualizó el formulario */
  updatedBy: string | null;
}
