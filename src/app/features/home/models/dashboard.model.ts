export interface ProjectStageItem {
  stage: string;
  count: number;
}

export interface PartnerCommunitiesDto {
  total: number;
}

export interface AgeDistributionDto {
  ageRange: string;
  count: number;
}

export interface CollectorsSummaryDto {
  total: number;
  femaleTotal: number;
  femalePercentage: number;
  ageDistribution: AgeDistributionDto[];
}

export interface ProductionByProductDto {
  productId: string;
  productCode: string;
  productName: string;
  totalWeightKg: number;
  totalUnits: number;
  batchCount: number;
}

export interface BusinessDashboardOverviewDto {
  asOfDate: string;
  projectStageDistribution: ProjectStageItem[];
  partnerCommunities: PartnerCommunitiesDto;
  collectors: CollectorsSummaryDto;
  productionByProduct: ProductionByProductDto[];
}
