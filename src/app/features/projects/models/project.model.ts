/**
 * Status del proyecto
 */
export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  COMPLETED = 'COMPLETED',
}

/**
 * Etapa del proyecto (stage)
 */
export enum ProjectStage {
  PLANNING = 'planning',
  INVENTORY = 'inventory',
  INVENTORY_COMPLETE = 'inventory_complete',
  AREA_GENERATION = 'area_generation',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  HARVEST = 'harvest',
  COLLECTION = 'collection',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

/**
 * Interfaz principal del proyecto
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  companyId: string;
  companyName?: string;
  productId: string;
  productName?: string;
  code?: string;
  status: string; // 'active' | 'inactive' | 'archived'
  stage?: string; // 'planning', 'inventory', 'inventory_complete', etc.
  startDate?: string;
  endDate?: string;
  approvedQuota?: number; // Cuota máxima de recolección
  maxCollectors?: number; // Número máximo de recolectores
  communityLink?: CommunityProjectLink; // Vínculo con comunidad
}

export interface CommunityProjectLink {
  id: string; // linkId para actualizar
  communityId: string;
  communityName?: string; // Nombre de la comunidad
}

/**
 * DTO para crear un proyecto
 */
export interface CreateProjectRequest {
  name: string;
  productId: string;
  companyId: string;
  description?: string;
  approvedQuota: number; // Cuota máxima de recolección
  maxCollectors: number; // Número máximo de recolectores
  startDate?: string;
  endDate?: string;
  code: string; // Empty string as per requirements
}

/**
 * DTO para actualizar un proyecto
 */
export interface UpdateProjectRequest {
  name: string;
  productId: string;
  description?: string;
  approvedQuota?: number; // Cuota máxima de recolección
  maxCollectors?: number; // Número máximo de recolectores
  status?: ProjectStatus;
  code?: string;
  startDate?: string;
  endDate?: string;
  // Etapa del proyecto (stage). Se agrega para permitir transición de etapas desde el frontend.
  stage?: string; // 'planning' | 'inventory' | 'inventory_complete' | ...
}

/**
 * DTO para actualizar la etapa de un proyecto
 */
export interface ProjectStageUpdateDto {
  stage: string;
}

/**
 * Respuesta paginada genérica
 */
export interface PageDto<T> {
  page: number;
  size: number;
  total: number;
  items: T[];
}

/**
 * Helper para obtener el label en español de una etapa
 */
export function getProjectStageLabel(stage?: string): string {
  if (!stage) return 'Sin etapa';

  const labels: Record<string, string> = {
    planning: 'Planificación',
    inventory: 'Inventario',
    inventory_complete: 'Inventario Completo',
    pmf_development: 'Elaboración de PMF',
    area_generation: 'Generación de Áreas',
    pending_approval: 'Pendiente de Aprobación',
    approved: 'Aprobado',
    harvest: 'Cosecha',
    collection: 'Recolección',
    completed: 'Completado',
    archived: 'Archivado',
  };

  return labels[stage] || stage;
}

/**
 * Helper para obtener las clases CSS de una etapa (colores)
 */
export function getProjectStageClass(stage?: string): string {
  if (!stage) return 'bg-gray-100 text-gray-600';

  const classes: Record<string, string> = {
    planning: 'bg-blue-100 text-blue-700',
    inventory: 'bg-purple-100 text-purple-700',
    inventory_complete: 'bg-indigo-100 text-indigo-700',
    pmf_development: 'bg-cyan-100 text-cyan-700',
    pending_approval: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    harvest: 'bg-orange-100 text-orange-700',
    collection: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-gray-100 text-gray-600',
  };

  return classes[stage] || 'bg-gray-100 text-gray-600';
}

/**
 * Get status label in Spanish
 */
export function getProjectStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    archived: 'Archivado',
  };
  return statusMap[status] || status;
}

/**
 * Get CSS class for project status
 */
export function getProjectStatusClass(status: string): string {
  const classMap: Record<string, string> = {
    active: 'status-active',
    inactive: 'status-inactive',
    archived: 'status-archived',
  };
  return classMap[status] || 'status-active';
}
