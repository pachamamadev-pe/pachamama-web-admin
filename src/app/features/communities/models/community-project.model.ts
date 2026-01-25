/**
 * Proyecto asociado a una comunidad
 */
export interface CommunityProject {
  projectId: string;
  projectName: string;
  projectCode: string;
  projectDescription: string;
  startDate: string;
  endDate: string;
  stage: ProjectStage;
  status: ProjectStatus;
  productId: string;
  productName: string;
  companyId: string;
  companyName: string;
  collectorsCount: number;
  projectCommunityId: string;
}

/**
 * Etapas del proyecto
 */
export type ProjectStage =
  | 'planning'
  | 'inventory'
  | 'collection'
  | 'pmf_development'
  | 'serfor_evaluation'
  | 'ctp_entry'
  | 'primary_transformation'
  | 'map_adjustment';

/**
 * Estados del proyecto
 */
export type ProjectStatus = 'active' | 'inactive' | 'completed' | 'cancelled';
