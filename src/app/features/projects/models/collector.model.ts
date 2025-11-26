/**
 * Estado del recolector
 */
export enum CollectorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * Interfaz del recolector
 */
export interface Collector {
  id: string;
  name: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  birthDate?: string | null;
  gender?: string | null;
  address?: string | null;
  qrCode?: string | null;
  notes?: string | null;
  status: CollectorStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  projectCommunityId: string;
  projectName?: string | null;
  communityName?: string | null;
  projectCommunityCollectorId?: string | null;
  currentBrigadeId?: string | null;
  currentBrigadeName?: string | null;
}
