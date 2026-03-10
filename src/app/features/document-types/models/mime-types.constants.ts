export interface MimeTypeOption {
  value: string;
  label: string;
}

export const MIME_TYPE_OPTIONS: MimeTypeOption[] = [
  { value: 'application/pdf', label: 'Documento PDF' },
  { value: 'image/jpeg', label: 'Imagen JPG o JPEG' },
  { value: 'image/png', label: 'Imagen PNG' },
  { value: 'image/svg+xml', label: 'Imagen SVG (imagen vectorial)' },
  { value: 'application/msword', label: 'Documento Word (.doc)' },
  {
    value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Documento Word (.docx)',
  },
];

/**
 * Retorna la etiqueta amigable para un MIME type dado.
 * Si no se encuentra en el catálogo, devuelve el valor técnico original.
 */
export function getMimeTypeLabel(value: string): string {
  return MIME_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
