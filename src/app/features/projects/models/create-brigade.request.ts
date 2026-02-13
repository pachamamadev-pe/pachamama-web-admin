export interface CreateBrigadeRequest {
  projectCommunityId: string;
  name: string;
  description?: string;
  collectionRequestId?: string | null;
  collectorIds?: string[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  qrCode?: string;
}
