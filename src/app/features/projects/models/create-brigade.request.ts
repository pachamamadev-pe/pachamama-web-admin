export interface CreateBrigadeRequest {
  projectCommunityId: string;
  code: string;
  name: string;
  description?: string;
  qrCode?: string;
}
