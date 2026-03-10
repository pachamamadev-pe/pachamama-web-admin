export interface DocumentTypeIconOption {
  value: string;
  label: string;
}

export const DOCUMENT_TYPE_ICON_OPTIONS: DocumentTypeIconOption[] = [
  { value: 'article', label: 'Artículo' },
  { value: 'assignment', label: 'Formulario' },
  { value: 'description', label: 'Documento' },
  { value: 'gavel', label: 'Legal' },
  { value: 'home', label: 'Vivienda' },
  { value: 'park', label: 'Ambiental' },
  { value: 'verified', label: 'Verificado' },
  { value: 'workspace_premium', label: 'Certificado' },
  { value: 'local_shipping', label: 'Transporte' },
  { value: 'settings', label: 'Configuración' },
  { value: 'sync_alt', label: 'Sincronización' },
];

/**
 * Retorna la etiqueta amigable para un icono dado.
 * Si no se encuentra en el catálogo, devuelve el valor técnico original.
 */
export function getDocumentTypeIconLabel(value: string): string {
  return DOCUMENT_TYPE_ICON_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
