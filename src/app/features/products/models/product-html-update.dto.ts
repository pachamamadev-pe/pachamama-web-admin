/**
 * DTO para actualizar la descripción HTML de un producto
 * Corresponde al backend ProductHtmlUpdateDto
 */
export interface ProductHtmlUpdateDto {
  /**
   * Descripción enriquecida en HTML
   * Se sanitizará automáticamente en el backend con OWASP
   */
  descriptionHtml: string;
}
