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

/**
 * Información de paginación según Spring Data
 */
export interface Pageable {
  /**
   * Número de página actual (0-based)
   */
  pageNumber: number;

  /**
   * Tamaño de la página
   */
  pageSize: number;

  /**
   * Offset de elementos
   */
  offset: number;

  /**
   * Indica si está paginado
   */
  paged: boolean;

  /**
   * Indica si no está paginado
   */
  unpaged: boolean;
}

/**
 * Respuesta paginada genérica compatible con Spring Data Page<T>
 * Utilizada por la API Java para retornar listas paginadas
 */
export interface PageResponse<T> {
  /**
   * Contenido de la página actual
   */
  content: T[];

  /**
   * Información de paginación
   */
  pageable: Pageable;

  /**
   * Número total de páginas
   */
  totalPages: number;

  /**
   * Número total de elementos en todas las páginas
   */
  totalElements: number;

  /**
   * Indica si es la última página
   */
  last: boolean;

  /**
   * Tamaño de la página
   */
  size: number;

  /**
   * Número de página actual (0-based)
   */
  number: number;

  /**
   * Número de elementos en la página actual
   */
  numberOfElements: number;

  /**
   * Indica si es la primera página
   */
  first: boolean;

  /**
   * Indica si la página está vacía
   */
  empty: boolean;
}

/**
 * Parámetros para solicitar una página al backend Java
 */
export interface PageRequest {
  /**
   * Número de página (0-based)
   * Default: 0
   */
  page?: number;

  /**
   * Tamaño de página
   * Default: 20
   */
  size?: number;

  /**
   * Query de búsqueda opcional
   */
  q?: string;
}

/**
 * Respuesta paginada simple (estructura actual del backend)
 * Utilizada por endpoints que retornan: { page, size, total, items }
 */
export interface SimplePaginatedResponse<T> {
  /**
   * Número de página actual (0-based)
   */
  page: number;

  /**
   * Tamaño de página
   */
  size: number;

  /**
   * Total de elementos
   */
  total: number;

  /**
   * Items de la página actual
   */
  items: T[];
}
