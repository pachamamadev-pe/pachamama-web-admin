export type CollectorAssignmentStatus = 'active' | 'inactive' | 'archived';

export interface UpdateCollectorAssignmentStatusRequest {
  newStatus: CollectorAssignmentStatus;
  reason: string;
}

export interface UpdateCollectorAssignmentStatusResponse {
  projectCommunityCollectorId: string;
  previousStatus: CollectorAssignmentStatus;
  newStatus: CollectorAssignmentStatus;
  reason: string;
}

export interface CollectorAssignmentStatusHistoryItem {
  id: string;
  previousStatus: CollectorAssignmentStatus;
  newStatus: CollectorAssignmentStatus;
  reason: string;
  changedBy: string;
  changedByName: string;
  changedAt: string;
}
