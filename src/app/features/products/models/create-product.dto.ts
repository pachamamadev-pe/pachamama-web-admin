import { ProductUnit } from './product.model';

/**
 * DTO para crear un nuevo producto
 *
 * Body requerido:
 * {
 *   "name": "string",        // Requerido
 *   "description": "string", // Opcional
 *   "unit": "kg",            // Opcional (default: kg)
 *   "icon": "string"         // Opcional (path relativo)
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

  /**
   * Unidad de medida del producto
   * Opcional, por defecto: kg
   *
   * Ejemplo: "kg", "ton", "units", "liters", "bunches"
   */
  unit?: ProductUnit;

  /**
   * Path relativo del icono en Azure Storage
   * Opcional
   *
   * Ejemplo: "products/1731234567-abc123.png"
   */
  icon?: string;
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
  unit: {
    required: false,
    default: ProductUnit.KG,
  },
  icon: {
    required: false,
    maxLength: 500,
  },
} as const;
