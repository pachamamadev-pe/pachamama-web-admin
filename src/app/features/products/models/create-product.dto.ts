/**
 * DTO para crear un nuevo producto
 *
 * Body requerido:
 * {
 *   "name": "string",        // Requerido
 *   "description": "string"  // Opcional
 * }
 */
export interface CreateProductDto {
  /**
   * Nombre del producto
   * Requerido, longitud mínima 3 caracteres, máxima 200
   *
   * Ejemplo: "Café orgánico"
   */
  name: string;

  /**
   * Descripción detallada del producto
   * Opcional, longitud máxima 500 caracteres
   *
   * Ejemplo: "Granos seleccionados de altura"
   */
  description?: string;
}

/**
 * Validaciones para CreateProductDto
 */
export const CREATE_PRODUCT_VALIDATIONS = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 200,
  },
  description: {
    required: false,
    maxLength: 500,
  },
} as const;
