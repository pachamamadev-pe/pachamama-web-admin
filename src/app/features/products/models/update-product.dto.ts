import { ProductStatus } from './product.model';

/**
 * DTO para actualizar un producto existente
 * Según la API: PATCH /api/v1/admin/products/:productId
 *
 * Body (todos los campos opcionales):
 * {
 *   "name": "string",
 *   "description": "string",
 *   "status": "ACTIVE" | "INACTIVE"
 * }
 */
export interface UpdateProductDto {
  /**
   * Nombre del producto
   * Opcional, longitud mínima 3 caracteres, máxima 200
   */
  name?: string;

  /**
   * Descripción detallada del producto
   * Opcional, longitud máxima 500 caracteres
   */
  description?: string;

  /**
   * Estado del producto
   * Opcional, valores: "ACTIVE" | "INACTIVE"
   */
  status?: ProductStatus;
}

/**
 * Validaciones para UpdateProductDto
 */
export const UPDATE_PRODUCT_VALIDATIONS = {
  name: {
    required: false,
    minLength: 3,
    maxLength: 200,
  },
  description: {
    required: false,
    maxLength: 500,
  },
  status: {
    required: false,
    allowedValues: [ProductStatus.ACTIVE, ProductStatus.INACTIVE],
  },
} as const;
