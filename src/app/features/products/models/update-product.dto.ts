import { ProductStatus, ProductUnit } from './product.model';

/**
 * DTO para actualizar un producto existente
 * Según la API: PATCH /api/v1/admin/products/:productId
 *
 * Body (todos los campos opcionales):
 * {
 *   "name": "string",
 *   "description": "string",
 *   "status": "ACTIVE" | "INACTIVE",
 *   "unit": "kg" | "ton" | "units" | "liters" | "bunches",
 *   "icon": "string"
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
   * Unidad de medida del producto
   * Opcional
   */
  unit?: ProductUnit;

  /**
   * Path relativo del icono en Azure Storage
   * Opcional
   * - string: actualizar con nueva ruta
   * - null: eliminar imagen del producto
   * - undefined: no modificar
   */
  icon?: string | null;

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
  unit: {
    required: false,
  },
  icon: {
    required: false,
    maxLength: 500,
  },
  status: {
    required: false,
    allowedValues: [ProductStatus.ACTIVE, ProductStatus.INACTIVE],
  },
} as const;
