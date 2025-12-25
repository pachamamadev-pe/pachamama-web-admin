/**
 * Esquema parseado de un formulario dinámico
 */
export interface FormSchema {
  sections: FormSchemaSection[];
}

/**
 * Sección del esquema de formulario
 */
export interface FormSchemaSection {
  id: string;
  name: string;
  type: 'protocol_linked' | 'free_form';
  auto_approve: boolean;
  display_order: number;
  fields: FormSchemaField[];
}

/**
 * Campo del esquema de formulario
 */
export interface FormSchemaField {
  question: string;
  required: boolean;
  field_type: string;
  id_protocol: string;
  attribute_code: string;
  display_order: number;
  id_field_type: string;
  validationOptions?: Record<string, unknown>;
}
