/**
 * Estado de una solicitud de recolección
 */
export type CollectionRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'observed'
  | 'cancelled';

/**
 * Solicitud de recolección
 */
export interface CollectionRequest {
  id: string;
  companyId: string;
  projectId: string;
  projectName: string;
  requestNumber: string;
  requestedWeighing: number;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  status: CollectionRequestStatus;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string; // ISO datetime
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  observationNotes: string | null;
  observationCount: number;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

/**
 * Request para crear solicitud de recolección
 */
export interface CreateCollectionRequestDto {
  projectId: string;
  companyId: string;
  requestedWeighing: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/**
 * Request para actualizar solicitud observada
 */
export interface UpdateCollectionRequestDto {
  requestedWeighing: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/**
 * Respuesta paginada de solicitudes
 */
export interface CollectionRequestsPageDto {
  items: CollectionRequest[];
  page: number;
  size: number;
  total: number;
}

/**
 * Filtros para listar solicitudes
 */
export interface CollectionRequestFilters {
  status?: CollectionRequestStatus;
  page?: number;
  size?: number;
}

/**
 * Historial de cambios de una solicitud de recolección
 */
export interface CollectionRequestHistoryDto {
  id: string;
  collectionRequestId: string;
  previousStatus: string | null;
  newStatus: string;
  reviewedById: string;
  reviewedByName: string;
  reviewedByEmail: string;
  reviewedAt: string; // ISO datetime
  reviewNotes: string | null;
  observationNotes: string | null;
  requestedWeighing: number;
  startDate: string; // ISO date
  endDate: string; // ISO date
  metadata: Record<string, unknown> | null;
  createdAt: string; // ISO datetime
}
