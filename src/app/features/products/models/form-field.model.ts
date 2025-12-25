/**
 * Tipo de campo de formulario dinámico
 */
export interface FieldType {
  id: string;
  code?: string; // Código interno del campo
  fieldType: string; // SHORT_TEXT, MULTIPLE_CHOICE, PHOTO, etc.
  name: string;
  description: string;
  requiresOptions: boolean; // Si necesita opciones (ej: MULTIPLE_CHOICE)
  supportsMediaUpload: boolean; // Si permite subir archivos
  validationOptions: Record<string, unknown> | null; // Opciones de validación dinámicas
}

/**
 * Pregunta/Campo del formulario
 */
export interface FormField {
  id?: string;
  question: string;
  fieldTypeId: string;
  fieldTypeCode?: string; // Para mostrar en UI
  isRequired: boolean;
  protocolId?: string | null; // Si está linkeado a un protocolo
  protocolName?: string; // Para mostrar en UI
  order?: number;
  options?: string[]; // Para tipos como MULTIPLE_CHOICE (cuando requiresOptions = true)
  validationConfig?: Record<string, unknown>; // Configuración de validación personalizada
}

/**
 * Tipo de formulario
 */
export type FormType = 'protocol_linked' | 'free_form';

/**
 * Sección del formulario (Parte 1 o Parte 2)
 */
export interface FormSection {
  title: string;
  type: FormType;
  fields: FormField[];
}
