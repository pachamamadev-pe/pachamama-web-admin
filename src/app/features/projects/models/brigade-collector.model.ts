/**
 * Recolector asignado a una brigada
 */
export interface BrigadeCollector {
  id: string;
  projectCommunityCollectorId: string;
  collectorId: string;
  collectorName: string;
  collectorEmail: string;
  collectorPhone: string;
  brigadeId: string;
  brigadeName: string;
  projectCommunityId: string;
  startDate: string;
  endDate?: string | null;
  taskDescription?: string | null;
  dailyRate?: number | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

/**
 * Respuesta paginada de recolectores de brigada
 */
export interface BrigadeCollectorsPageDto {
  content: BrigadeCollector[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
