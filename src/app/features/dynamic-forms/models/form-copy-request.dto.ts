/**
 * Request para copiar un formulario existente
 */
export interface FormCopyRequest {
  newName?: string | null;
  newDescription?: string | null;
  newCustomLogoUrl?: string | null;
  targetProjectId?: string | null;
}
