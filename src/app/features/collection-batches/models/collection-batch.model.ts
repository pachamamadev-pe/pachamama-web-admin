/**
 * Modelos para gestión de lotes de acopio
 */

/**
 * Estado del lote de acopio
 */
export type BatchStatus = 'draft' | 'pending' | 'validated' | 'closed' | 'documents_generated';

/**
 * Tipo de transporte
 */
export type TransportType = 'terrestre' | 'fluvial';

/**
 * Calidad del material recolectado
 */
export type Quality = 'excelente' | 'buena' | 'regular' | 'mala';

/**
 * Labels para calidad
 */
export const QUALITY_LABELS: Record<Quality, string> = {
  excelente: 'Excelente',
  buena: 'Buena',
  regular: 'Regular',
  mala: 'Mala',
};

/**
 * Información de transporte (TransportInfoResponse)
 */
export interface TransportInfo {
  id: string;
  transportType?: TransportType;

  // Transportista
  transporterName?: string;
  transporterDocumentType?: string;
  transporterDocumentNumber?: string;
  transporterLicense?: string;
  transporterPhone?: string;

  // Vehículo
  vehiclePlate?: string;
  vehicleType?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleCapacityKg?: number;

  // Fluvial
  boatRegistration?: string;
  boatMotorHp?: number;

  // Ruta
  originLocation?: string;
  destinationLocation?: string;
  estimatedDurationHours?: number;
  notes?: string;

  // Centro de acopio
  collectionCenterAddress?: string;
  collectionCenterManagerName?: string;
  collectionCenterManagerDni?: string;

  // Comprador
  buyerName?: string;
  buyerDocumentType?: string;
  buyerDocumentNumber?: string;
  buyerLegalAddress?: string;
  metadata?: string;

  // Auditoría
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Resumen de un recolector dentro de activitiesByCollector
 */
export interface CollectorSummary {
  collectorId: string;
  collectorName: string;
  documentType: string;
  documentNumber: string;
  brigadeId: string | null;
  brigadeName: string | null;
  activitiesCount: number;
  // Datos de acopio pre-cargados desde actividades
  bunchesCount: number | null;
  estimatedWeightKg: number | null;
  sacksCount: number | null;
  notes: string | null;
  quality: string | null;
  species: string | null;
  sackPrice: number | null;
}

/**
 * Resumen de actividades agrupadas por recolector (ActivitiesByCollectorResponse)
 */
export interface ActivitiesByCollector {
  projectId: string;
  batchId: string;
  collectors: CollectorSummary[];
}

/**
 * Detalle de actividad en el lote (BatchActivityDetailResponse)
 */
export interface BatchActivityDetail {
  id: string;
  activityId: string;
  forestCode?: string;
  collectorId?: string;
  collectorName?: string;
  bunchesCount?: number;
  estimatedWeightKg?: number;
  sacksCount?: number;
  quality?: Quality;
  notes?: string;
  createdAt?: string;
}

/**
 * Response completo de un lote de acopio
 */
export interface CollectionBatch {
  // Identificación
  id: string;
  batchNumber: string;
  status: BatchStatus;

  // Relaciones
  companyId: string;
  companyName: string;
  projectId: string;
  projectName: string;
  communityId: string | null;
  communityName: string | null;
  areaId: string | null;
  areaName: string | null;

  // Producto
  productId: string | null;
  productName: string | null;
  productCode: string | null;

  // Solicitud de recolección vinculada
  collectionRequestId: string | null;
  collectionRequestCode: string | null;
  requestedWeighingKg: number | null;
  requestStartDate: string | null;
  requestEndDate: string | null;

  // Datos del lote
  batchDate: string;
  totalWeightKg: number;
  totalSacks: number;
  totalUnits: number;
  activityIds: string[];
  totalActivities: number;
  collectorsCount: number;

  // Indicadores de documentos generados
  handlingRecordGenerated: boolean;
  originCertificateGenerated: boolean;
  transportWaybillGenerated: boolean;

  // Documentos (array de BatchDocument del API)
  documents: BatchDocument[];

  // Certificado de procedencia (si ya fue guardado)
  certificateProvenance?: CertificateProvenance;

  // Hash de integridad
  rootHash?: string;

  // Información de transporte
  transportInfo?: TransportInfo;

  // Actividades agrupadas por recolector
  activitiesByCollector?: ActivitiesByCollector;

  // Metadata adicional
  metadata?: Record<string, unknown>;

  // Detalles por actividad
  activityDetails?: BatchActivityDetail[];

  // Validación
  validatedBy?: string;
  validatedByName?: string;
  validatedAt?: string;
  validationNotes?: string;

  // Auditoría
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
}

/**
 * Estado de solicitud de recolección
 */
export type CollectionRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'observed'
  | 'cancelled';

/**
 * Solicitud de recolección disponible para acopio
 */
export interface AvailableRequest {
  requestId: string;
  requestNumber: string;
  status: CollectionRequestStatus;
  startDate: string;
  endDate: string;
  requestedWeighingKg: number;

  // Datos de actividades aprobadas
  approvedActivitiesCount: number;
  estimatedTotalWeightKg: number;
  totalStumpsCount: number;
  collectorsCount: number;

  // Comunidades y áreas
  communityName: string;
  areaName: string;

  // Validación
  fullyIncludedInOtherBatch: boolean;
  partiallyIncludedInOtherBatch: boolean;
  availableActivitiesCount: number;
}

/**
 * Request para crear/actualizar información de transporte
 */
export interface TransportInfoRequest {
  transportType: TransportType;

  // Transportista
  transporterName: string;
  transporterDocumentType: string;
  transporterDocumentNumber: string;
  transporterLicense?: string;
  transporterPhone?: string;

  // Vehículo / Embarcación
  vehiclePlate?: string;
  vehicleType?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleCapacityKg?: number;

  // Específico fluvial
  boatRegistration?: string;
  boatMotorHp?: number;

  // Ruta
  originLocation: string;
  destinationLocation: string;
  estimatedDurationHours?: number;
  notes?: string;

  // Centro de acopio
  collectionCenterAddress?: string;
  collectionCenterManagerName?: string;
  collectionCenterManagerDni?: string;

  // Comprador
  buyerName?: string;
  buyerDocumentType?: string;
  buyerDocumentNumber?: string;
  buyerLegalAddress?: string;
  metadata?: string;
}

/**
 * Datos del formulario — Documento 3: Guía de Transporte (TransportWaybillSaveRequest)
 */
export interface TransportWaybillData {
  batchId: string;
  transportInfo: TransportInfoRequest;
}

/**
 * Request para crear un lote de acopio
 */
export interface CreateBatchRequest {
  projectId: string;
  collectionRequestId: string;
  areaId?: string;
  batchDate: string;
  totalWeightKg: number;
  totalSacks: number;
  totalUnits?: number;
  notes?: string;
  transportInfo: TransportInfoRequest;
}

/**
 * Request para actualizar un lote de acopio (solo en estado draft)
 */
export interface UpdateBatchRequest {
  batchDate?: string;
  collectionRequestIds?: string[];
  notes?: string;
}

// ─── Document Models ──────────────────────────────────────────────────────────

/**
 * Tipo de documento del lote de acopio
 */
export type BatchDocumentType = 'collectors-register' | 'transport-permit' | 'transport-info';

/**
 * Estado de un documento individual del lote
 */
export type BatchDocumentStatus =
  | 'not_started'
  | 'in_progress'
  | 'generated'
  | 'observed'
  | 'approved';

/**
 * Documento de lote de acopio (respuesta del backend - CollectionBatchDocumentResponse)
 */
export interface BatchDocument {
  id?: string;
  codeDocument: string; // e.g. 'HANDLING_RECORD_FORM'
  blobUrl?: string; // Ruta al blob en Azure Storage
  blobContainer?: string;
  blobName?: string;
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  fileHash?: string;
  version?: number;
  previousVersionId?: string;
  isLatestVersion?: boolean;
  uploadedBy?: string;
  uploadedAt?: string;
  uploadMethod?: string;
  metadata?: Record<string, unknown>;
  status?: string;
}

/**
 * Entrada por recolector — Ficha de Registro de Manejo (HandlingRecordCollectorDetailRequest)
 */
export interface CollectorRegisterEntry {
  collectorId: string;
  bunchesCount?: number;
  estimatedWeightKg?: number;
  sacksCount?: number;
  species?: string;
  sackPrice?: number;
  notes?: string;
}

/**
 * Datos del formulario — Documento 1: Ficha de Registro de Manejo (HandlingRecordSaveRequest)
 */
export interface CollectorsRegisterData {
  batchId: string;
  contract: string;
  startDate: string;
  endDate: string;
  collectors: CollectorRegisterEntry[];
}

/**
 * Tipo de autorización (AuthorizationType enum del backend)
 */
export type AuthorizationType =
  | 'contrato_aprovechamiento'
  | 'acuerdo_actividad_menor'
  | 'autorizacion_caza_deportiva'
  | 'otro';

/**
 * Unidad de medida (UnitOfMeasure enum del backend)
 */
export type UnitOfMeasure =
  | 'kilos'
  | 'toneladas'
  | 'unidades'
  | 'metros_cubicos'
  | 'litros'
  | 'otros';

/**
 * Datos del certificado de procedencia almacenados en el lote (CertificateProvenanceResponse)
 */
export interface CertificateProvenance {
  id?: string;
  collectionBatchId?: string;
  recipientName?: string;
  recipientPosition?: string;
  anpName?: string;
  requestDate?: string;
  applicantFullName?: string;
  applicantDni?: string;
  organizationName?: string;
  organizationPosition?: string;
  authorizationType?: AuthorizationType;
  resolutionNumber?: string;
  yearsPeriod?: number;
  validityStart?: string;
  validityEnd?: string;
  sector?: string;
  internalLocation?: string;
  resourceName?: string;
  harvestedQuantity?: number;
  unitOfMeasure?: UnitOfMeasure;
  paymentMade?: boolean;
  recordSheetsAttached?: boolean;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Datos del formulario — Documento 2: Certificado de Procedencia (OriginCertificateSaveRequest)
 */
export interface OriginCertificateData {
  batchId: string;
  recipientName?: string;
  recipientPosition?: string;
  anpName?: string;
  requestDate?: string;
  applicantFullName?: string;
  applicantDni?: string;
  organizationName?: string;
  organizationPosition?: string;
  authorizationType?: AuthorizationType;
  resolutionNumber?: string;
  yearsPeriod?: number;
  validityStart?: string;
  validityEnd?: string;
  sector?: string;
  internalLocation?: string;
  resourceName?: string;
  harvestedQuantity?: number;
  unitOfMeasure?: UnitOfMeasure;
  paymentMade?: boolean;
  recordSheetsAttached?: boolean;
}

/**
 * Labels para estados de documentos
 */
export const BATCH_DOCUMENT_STATUS_LABELS: Record<BatchDocumentStatus, string> = {
  not_started: 'Sin iniciar',
  in_progress: 'En progreso',
  generated: 'Generado',
  observed: 'Observado',
  approved: 'Aprobado',
};

/**
 * Labels para tipos de documento
 */
export const BATCH_DOCUMENT_TYPE_LABELS: Record<BatchDocumentType, string> = {
  'collectors-register': 'Registro de Recolectores',
  'transport-permit': 'Permiso de Transporte',
  'transport-info': 'Información de Transportista',
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Labels para estados de lote
 */
export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  validated: 'Validado',
  closed: 'Cerrado',
  documents_generated: 'Docs. Generados',
};

/**
 * Clases CSS para estados de lote
 */
export const BATCH_STATUS_CLASSES: Record<BatchStatus, string> = {
  draft: 'status-draft',
  pending: 'status-pending',
  validated: 'status-validated',
  closed: 'status-closed',
  documents_generated: 'status-documents-generated',
};
