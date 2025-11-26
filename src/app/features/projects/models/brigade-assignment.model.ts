/**
 * Request para crear una asignación de brigada
 */
export interface CreateBrigadeAssignmentRequest {
  projectCommunityCollectorId: string;
  brigadeId: string;
  startDate: string; // Formato: YYYY-MM-DD
  taskDescription?: string;
  dailyRate?: number;
  notes?: string;
}

/**
 * Respuesta de asignación de brigada
 */
export interface BrigadeAssignment {
  id: string;
  projectCommunityCollectorId: string;
  collectorId: string;
  collectorName: string;
  collectorEmail: string;
  brigadeId: string;
  brigadeName: string;
  projectCommunityId: string;
  startDate: string;
  endDate?: string | null;
  taskDescription?: string | null;
  dailyRate: number;
  notes?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

/**
 * Request para re-asignar una brigada a un recolector
 */
export interface ReassignBrigadeRequest {
  projectCommunityCollectorId: string;
  newBrigadeId: string;
  startDate: string; // YYYY-MM-DD
  notes?: string;
}
