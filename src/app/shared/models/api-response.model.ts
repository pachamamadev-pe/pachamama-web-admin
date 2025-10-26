/**
 * Estructura estándar de respuesta de la API.
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  timestamp?: string;
}

/**
 * Respuesta paginada de la API.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Respuesta de error de la API.
 */
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  statusCode: number;
  timestamp?: string;
}

/**
 * Opciones para realizar requests HTTP.
 */
export interface RequestOptions {
  showLoader?: boolean;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
}
