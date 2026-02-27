import { Collector } from './collector.model';

/**
 * Estado de la brigada
 */
export enum BrigadeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

/**
 * Interfaz de la brigada
 */
export interface Brigade {
  id: string;
  companyId: string;
  projectId: string;
  communityId: string;
  collectionRequestId?: string | null;
  collectionRequestCode?: string | null;
  code: string;
  name: string;
  description?: string;
  qrCode?: string | null;
  status: BrigadeStatus;
  members?: Collector[] | null; // Puede expandirse según necesidad
}

/**
 * Respuesta paginada de brigadas
 */
export interface BrigadePageDto {
  page: number;
  size: number;
  total: number;
  items: Brigade[];
}
