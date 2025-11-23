/**
 * Modelos para gestión de áreas y mapas de proyectos
 */

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface GeoJSONFeature {
  id: string;
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: Record<string, unknown>;
}

export interface GeoJSONGeometry {
  type: 'Polygon' | 'MultiPolygon' | 'Point' | 'LineString';
  coordinates: number[][] | number[][][] | number[];
}

export enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface AreaImportResponse {
  importId: string;
  projectId: string;
  status: ImportStatus;
  totalFeatures: number;
  featuresImported: number;
  featuresFailed: number;
  bounds: number[];
  errors: string[];
  metadata: {
    originalFilename: string;
    originalCRS: string;
    targetCRS: string;
    version: number;
    source: string;
    name: string;
  };
}

export interface AreaImportStatus {
  id: string;
  projectId: string;
  name: string;
  source: string;
  originalFilename: string;
  status: ImportStatus;
  featuresCount: number;
  featuresImported: number;
  featuresFailed: number;
  version: number;
  errors: string[] | null;
  processingStartedAt: string;
  processingCompletedAt: string | null;
  createdBy: string;
  createdAt: string;
}

export interface UploadAreaRequest {
  file: File;
  name: string;
  source: string;
}
