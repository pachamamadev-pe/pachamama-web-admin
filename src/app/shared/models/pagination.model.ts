/**
 * Parámetros para paginación de listas.
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Opciones de ordenamiento.
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Parámetros de filtro genéricos.
 */
export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: string | undefined;
}

/**
 * Estado de paginación para componentes.
 */
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Opciones de tamaño de página predefinidas.
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Tamaño de página por defecto.
 */
export const DEFAULT_PAGE_SIZE = 25;
