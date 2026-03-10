/**
 * Modelos para gestión de lotes de producción (Transformación Primaria)
 */

import { TransportInfoRequest } from '../../collection-batches/models/collection-batch.model';

/**
 * Etapa de transformación
 */
export type TransformationStage = 'primaria' | 'secundaria';

/**
 * Estado del lote de producción
 */
export type ProductionLotStatus =
  | 'recepcion'
  | 'acondicionado'
  | 'ablandamiento'
  | 'pulpeado'
  | 'envasado'
  | 'almacenamiento';

/**
 * Labels para el estado del lote de producción
 */
export const PRODUCTION_LOT_STATUS_LABELS: Record<ProductionLotStatus, string> = {
  recepcion: 'Recepción',
  acondicionado: 'Acondicionado',
  ablandamiento: 'Ablandamiento',
  pulpeado: 'Pulpeado',
  envasado: 'Envasado',
  almacenamiento: 'Almacenamiento',
};

/**
 * Código de documento de lote de producción (ProductionLotDocumentCode)
 */
export type ProductionLotDocumentCode =
  | 'FRUIT_RECEPTION_RECORD'
  | 'PULP_PROCESSING_RECORD'
  | 'PACKAGING_RECORD'
  | 'STORAGE_CONTROL_RECORD'
  | 'TRANSPORT_WAYBILL';

/**
 * Labels para códigos de documentos
 */
export const PRODUCTION_LOT_DOCUMENT_LABELS: Record<ProductionLotDocumentCode, string> = {
  FRUIT_RECEPTION_RECORD: 'Ficha de Recepción de Frutos',
  PULP_PROCESSING_RECORD: 'Registro de Procesamiento de Pulpa',
  PACKAGING_RECORD: 'Registro de Envasado',
  STORAGE_CONTROL_RECORD: 'Registro de Control de Almacén',
  TRANSPORT_WAYBILL: 'Guía de Transporte',
};

/**
 * Documento de lote de producción (ProductionLotDocumentResponse)
 */
export interface ProductionLotDocument {
  id: string;
  productionLotId: string;
  codeDocument: ProductionLotDocumentCode;
  blobUrl: string | null;
  blobContainer: string | null;
  blobName: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  fileHash: string | null;
  version: number | null;
  previousVersionId: string | null;
  isLatestVersion: boolean | null;
  uploadedBy: string | null;
  uploadedAt: string | null;
  uploadMethod: string | null;
  metadata: Record<string, unknown> | null;
  status: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Labels para la etapa de transformación
 */
export const TRANSFORMATION_STAGE_LABELS: Record<TransformationStage, string> = {
  primaria: 'Transformación Primaria',
  secundaria: 'Transformación Secundaria',
};

/**
 * Lote de acopio fuente de un lote de transformación primario
 * (ProductionLotSourceBatchResponse del backend)
 */
export interface ProductionLotSourceBatch {
  id: string;
  productionLotId: string;
  collectionBatchId: string;
  collectionBatchNumber: string;
  projectId: string;
  projectName: string;
  companyId: string;
  companyName: string;
  productId: string;
  productName: string;
  sourceOrder: number;
  contributedWeightKg: number | null;
  contributedSacksCount: number | null;
  contributedJabasCount: number | null;
  createdAt: string;
}

/**
 * Lote de transformación primario fuente de un lote secundario
 * (ProductionLotSourceLotResponse del backend)
 */
export interface ProductionLotSourceLot {
  id: string;
  productionLotId: string;
  sourcePrimaryLotId: string;
  sourcePrimaryLotNumber: string;
  sourcePrimaryLotStatus: string;
  sourceOrder: number;
  contributedWeightKg: number | null;
  contributedSacksCount: number | null;
  contributedJabasCount: number | null;
  observations: string | null;
  createdAt: string;
}

/**
 * Respuesta de lote de producción — LISTADO a nivel proyecto
 * (endpoint GET /by-project/{projectId})
 * Mantiene campos planos como productName, companyName, projectId, etc.
 */
export interface ProductionLot {
  id: string;
  companyId: string;
  companyName: string;
  projectId: string;
  projectName: string;
  productId: string;
  productName: string;
  productCode: string;
  lotNumber: string;
  productionDate: string; // LocalDate → string ISO
  sourceCollectionBatchIds: string[];
  traceabilityChain: string | null;
  quantity: number;
  unit: string;
  qrCode: string | null;
  publicUrl: string | null;
  transformationStage: TransformationStage;
  transformationNotes: string | null;
  lotHash: string | null;
  status: ProductionLotStatus;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  documents: ProductionLotDocument[];
  transportInfo?: TransportInfoRequest | null;
  totalSacksCount?: number | null;
  totalJabasCount?: number | null;
  parentLotId?: string | null;
  parentLotNumber?: string | null;
}

/**
 * Respuesta de lote de producción — DETALLE a nivel empresa
 * (endpoint GET /{id} → ProductionLotResponse del backend)
 * No tiene campos planos de proyecto/producto/empresa.
 * Esa información se deriva de sourceBatches (primaria) o sourceLots (secundaria).
 */
export interface ProductionLotDetail {
  id: string;
  lotNumber: string;
  productionDate: string; // LocalDate → "YYYY-MM-DD"
  transformationStage: TransformationStage;
  status: ProductionLotStatus;
  quantity: number | null;
  unit: string | null;
  totalSacksCount: number | null;
  totalJabasCount: number | null;
  transformationNotes: string | null;
  traceabilityChain: string | null;
  lotHash: string | null;
  qrCode: string | null;
  publicUrl: string | null;
  metadata: Record<string, unknown> | null;
  transportInfo: TransportInfoRequest | null;
  /** Nombre de empresa derivado de los lotes fuente */
  derivedCompanyName: string | null;
  /** Solo disponible para lotes primarios */
  sourceBatches: ProductionLotSourceBatch[] | null;
  /** Solo disponible para lotes secundarios */
  sourceLots: ProductionLotSourceLot[] | null;
  sourceBatchesCount: number | null;
  sourceLotsCount: number | null;
  documents: ProductionLotDocument[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string | null;
}

/**
 * Detalle de recepción por lote de acopio origen (ProductionLotBatchReceptionRequest)
 */
export interface BatchReceptionRequest {
  collectionBatchId: string;
  weightKg?: number;
  sacksCount?: number;
  observations?: string;
}

/**
 * Request para crear un lote de producción (ProductionLotCreateRequest)
 */
export interface CreateProductionLotRequest {
  projectId: string;
  sourceCollectionBatchIds: string[];
  receptions: BatchReceptionRequest[];
}

/**
 * Request para crear un lote de transformación secundaria
 * POST /secondary
 */
export interface CreateSecondaryProductionLotRequest {
  parentLotId: string;
  quantity: number;
  totalSacksCount?: number | null;
  totalJabasCount?: number | null;
  transformationNotes?: string | null;
  transportInfo: TransportInfoRequest;
}

export type TransportType = TransportInfoRequest['transportType'];

/**
 * Request para guardar la guía de transporte de un lote secundario
 * POST /{id}/transport-waybill
 */
export interface SaveSecondaryTransportRequest {
  transportInfo: TransportInfoRequest;
}

/**
 * Request para generar la ficha de recepción de transformación secundaria
 * POST /{id}/secondary-fruit-reception-record
 */
export interface SecondaryReceptionRecordRequest {
  productionLotId?: string | null;
  sourcePrimaryLotId: string;
  quantity: number;
  totalSacksCount?: number | null;
  totalJabasCount?: number | null;
  transformationNotes?: string | null;
}

/**
 * Detalle de recepción de un lote de acopio en el lote de producción (ProductionLotBatchReceptionResponse)
 */
export interface ProductionLotBatchReception {
  id: string;
  productionLotId: string;
  collectionBatchId: string;
  collectionBatchNumber: string;
  productId: string;
  productName: string;
  entryDate: string; // Instant → ISO string
  weightKg: number | null;
  sacksCount: number | null;
  jabasCount: number | null;
  observations: string | null;
  processingStage: ProductionLotDocumentCode;
  jabasRipeningCount: number | null;
  ripeningTub: string | null;
  ripeningStartTime: string | null; // Instant → ISO string
  createdAt: string;
  updatedAt: string;
}

/**
 * Request para actualizar una recepción de lote de acopio
 */
export interface UpdateBatchReceptionRequest {
  weightKg?: number | null;
  sacksCount?: number | null;
  jabasCount?: number | null;
  observations?: string | null;
}

/**
 * Request para actualizar el estado del lote de producción
 * PATCH /{id}/status
 */
export interface ProductionLotStatusUpdateRequest {
  status: ProductionLotStatus;
}

/**
 * Detalle de una recepción para la generación de documentos
 * Usado tanto en fruit-reception-record como en pulp-processing-record
 */
export interface ProductionLotBatchReceptionRequest {
  collectionBatchId: string;
  weightKg?: number | null;
  sacksCount?: number | null;
  jabasCount?: number | null;
  observations?: string | null;
  processingStage?: ProductionLotDocumentCode | null;
  jabasRipeningCount?: number | null;
  ripeningTub?: string | null;
  ripeningStartTime?: string | null; // ISO Instant string
}

/**
 * Request body para generar la ficha de recepción de frutos
 */
export interface GenerateFruitReceptionRecordRequest {
  receptions: ProductionLotBatchReceptionRequest[];
}

/**
 * Request body para generar el registro de procesamiento de pulpa
 * POST /{id}/pulp-processing-record
 */
export interface GeneratePulpProcessingRecordRequest {
  receptions: ProductionLotBatchReceptionRequest[];
}

/**
 * Registro de procesamiento por etapa (envasado / almacenamiento)
 * GET /{id}/processing-record?processingStage=PACKAGING_RECORD | STORAGE_CONTROL_RECORD
 */
export interface ProductionLotProcessingRecord {
  id: string;
  productionLotId: string;
  productionLotNumber: string;
  productId: string;
  productName: string;
  processingStage: ProductionLotDocumentCode;
  inputs: string | null;
  startDate: string | null; // LocalDate → ISO string
  startTime: string | null; // LocalTime → "HH:mm:ss"
  productionEndDatetime: string | null; // Instant → ISO string
  brixDegrees: number | null;
  ph: number | null;
  packages1kgCount: number | null;
  packages5kgCount: number | null;
  packages20kgCount: number | null;
  packages50kgCount: number | null;
  expirationDate: string | null; // LocalDate → ISO string
  quantityKg: number | null;
  storageFormat: string | null;
  unitsIn: number | null;
  unitsOut: number | null;
  unitsBalance: number | null;
  entryDate: string | null;
  observations: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request para guardar/actualizar el registro de envasado
 * POST /{id}/packaging-record
 */
export interface SavePackagingRecordRequest {
  productionLotId: string;
  processingStage: ProductionLotDocumentCode;
  inputs?: string | null;
  startDate?: string | null;
  startTime?: string | null;
  productionEndDatetime?: string | null;
  brixDegrees?: number | null;
  ph?: number | null;
  packages1kgCount?: number | null;
  packages5kgCount?: number | null;
  packages20kgCount?: number | null;
  packages50kgCount?: number | null;
  quantityKg?: number | null;
  observations?: string | null;
}

/**
 * Request para guardar/actualizar el registro de almacenamiento
 * POST /{id}/storage-control-record
 */
export interface SaveStorageRecordRequest {
  productionLotId: string;
  processingStage: ProductionLotDocumentCode;
  expirationDate?: string | null;
  storageFormat?: string | null;
  unitsIn?: number | null;
  unitsOut?: number | null;
  unitsBalance?: number | null;
  observations?: string | null;
  handlerName?: string | null;
  handlerTime?: string | null;
  handlerRole?: string | null;
  shift?: string | null;
}
