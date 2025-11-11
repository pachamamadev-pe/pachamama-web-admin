/**
 * Enum para el estado del producto
 */
export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Enum para unidades de medida del producto
 */
export enum ProductUnit {
  KG = 'kg',
  TON = 'ton',
  UNITS = 'units',
  LITERS = 'liters',
  BUNCHES = 'bunches',
}

/**
 * Interfaz principal del producto
 */
export interface Product {
  /**
   * ID único del producto (UUID)
   */
  id: string;

  /**
   * Código único del producto
   * Opcional, generado por el backend
   */
  code?: string;

  /**
   * Nombre del producto
   * Requerido, longitud mínima 3 caracteres
   */
  name: string;

  /**
   * Nombre científico del producto
   * Opcional
   */
  scientificName?: string;

  /**
   * Descripción detallada del producto
   * Opcional
   */
  description?: string;

  /**
   * Path relativo del icono/imagen en Azure Storage
   * Ejemplo: "products/1731234567-abc123.png"
   * Opcional
   */
  icon?: string;

  /**
   * Color del producto en formato hex
   * Ejemplo: "#218358"
   * Opcional
   */
  color?: string;

  /**
   * Unidad de medida del producto
   * Por defecto: kg
   */
  unit: ProductUnit;

  /**
   * Metadata adicional en formato JSON
   * Opcional
   */
  metadata?: string;

  /**
   * Estado del producto (ACTIVE | INACTIVE)
   * Por defecto: ACTIVE
   */
  status: ProductStatus;

  /**
   * Fecha de creación (ISO 8601)
   * Ejemplo: "2025-11-06T10:00:00Z"
   */
  createdAt: string;

  /**
   * Fecha de última actualización (ISO 8601)
   * Ejemplo: "2025-11-06T12:30:00Z"
   */
  updatedAt: string;
}

/**
 * Type guard para verificar si un objeto es un Product válido
 */
export function isProduct(obj: unknown): obj is Product {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    'id' in obj &&
    'name' in obj &&
    'description' in obj &&
    'status' in obj &&
    'createdAt' in obj &&
    'updatedAt' in obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    (obj.status === ProductStatus.ACTIVE || obj.status === ProductStatus.INACTIVE) &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  );
}

/**
 * Helper para obtener el label del estado
 */
export function getProductStatusLabel(status: ProductStatus): string {
  const labels: Record<ProductStatus, string> = {
    [ProductStatus.ACTIVE]: 'Activo',
    [ProductStatus.INACTIVE]: 'Inactivo',
  };

  return labels[status];
}

/**
 * Helper para obtener la clase CSS según el estado
 */
export function getProductStatusClass(status: ProductStatus): string {
  const classes: Record<ProductStatus, string> = {
    [ProductStatus.ACTIVE]: 'bg-secondary-light text-secondary',
    [ProductStatus.INACTIVE]: 'bg-gray-100 text-neutral-subheading',
  };

  return classes[status];
}
