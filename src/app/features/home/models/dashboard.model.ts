export interface ProjectStageItem {
  stage: string;
  count: number;
}

export interface PartnerCommunitiesDto {
  total: number;
}

export interface CollectorsSummaryDto {
  total: number;
  femaleTotal: number;
  femalePercentage: number;
}

export interface BusinessDashboardOverviewDto {
  asOfDate: string;
  projectStageDistribution: ProjectStageItem[];
  partnerCommunities: PartnerCommunitiesDto;
  collectors: CollectorsSummaryDto;
}
