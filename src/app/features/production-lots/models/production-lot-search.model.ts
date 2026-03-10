/**
 * Modelos para el nuevo endpoint de búsqueda de lotes a nivel empresa
 * GET /api/v1/admin/production-lots/search
 *
 * Los lotes de transformación ya no están vinculados a un solo proyecto,
 * sino que son a nivel empresa.
 */

import {
  TransformationStage,
  ProductionLotStatus,
  ProductionLotSourceBatch,
  ProductionLotSourceLot,
} from '../../projects/models/production-lot.model';
import { TransportInfoRequest } from '../../collection-batches/models/collection-batch.model';

// Re-exportamos los tipos base para que los consumidores de este módulo
// no necesiten importar de dos lugares
export type {
  TransformationStage,
  ProductionLotStatus,
  ProductionLotSourceBatch,
  ProductionLotSourceLot,
};

/**
 * Respuesta del endpoint GET /api/v1/admin/production-lots/search
 * (ProductionLotResponse - nueva estructura a nivel empresa)
 *
 * Diferencias con el modelo anterior (ProductionLot):
 * - Ya NO tiene: projectId, projectName, productId, productName, companyId, sourceCollectionBatchIds, parentLotId, parentLotNumber
 * - AHORA tiene: sourceBatches (para primarios), sourceLots (para secundarios), derivedCompanyName, createdByName
 */
export interface ProductionLotRecord {
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
  lotHash: string | null;
  qrCode: string | null;
  publicUrl: string | null;
  /** Nombre de empresa derivado de los lotes fuente */
  derivedCompanyName: string | null;
  /** Cantidad de lotes de acopio fuente (solo lotes primarios) */
  sourceBatchesCount: number | null;
  /** Cantidad de lotes primarios fuente (solo lotes secundarios) */
  sourceLotsCount: number | null;
  /** Cantidad de documentos generados */
  documentsCount: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string | null;
}

/**
 * Parámetros de búsqueda para GET /api/v1/admin/production-lots/search
 */
export interface ProductionLotSearchParams {
  /** ID de la empresa (obligatorio) */
  companyId: string;
  /** ID del proyecto (opcional) */
  projectId?: string;
  /** ID del producto (opcional) */
  productId?: string;
  /** Página (0-based) */
  page?: number;
  /** Tamaño de página */
  size?: number;
  /** Búsqueda por número de lote */
  q?: string;
}

/**
 * Filtro de etapa para la UI (All + las dos etapas)
 */
export type StageFilter = 'all' | TransformationStage;

/**
 * Labels cortos para la UI (badges, chips)
 */
export const STAGE_SHORT_LABELS: Record<TransformationStage, string> = {
  primaria: 'Primaria',
  secundaria: 'Secundaria',
};

// ────────────────────────────────────────────────────────────────────────────
// REQUEST MODELS — Creación de lote de transformación primaria
// POST /api/v1/admin/production-lots
// ────────────────────────────────────────────────────────────────────────────

/** Lote de acopio fuente — valores inmutables del acopio */
export interface SourceBatchEntry {
  collectionBatchId: string;
  contributedWeightKg?: number | null;
  contributedSacksCount?: number | null;
  contributedJabasCount?: number | null;
}

/** Datos de recepción en planta — editables por el usuario */
export interface ReceptionEntry {
  collectionBatchId: string;
  weightKg?: number | null;
  sacksCount?: number | null;
  jabasCount?: number | null;
  observations?: string | null;
}

/**
 * Request para crear lote secundario multi-fuente
 * POST /api/v1/admin/production-lots/secondary
 */
export interface CreateSecondaryLotMultiRequest {
  sourceLots: SourceLotEntry[];
  quantity?: number | null;
  totalSacksCount?: number | null;
  totalJabasCount?: number | null;
  transformationNotes?: string | null;
  transportInfo: TransportInfoRequest;
}

// ────────────────────────────────────────────────────────────────────────────
// QUERY MODELS — Lotes primarios disponibles para transformación secundaria
// GET /available-for-secondary
// ────────────────────────────────────────────────────────────────────────────

/**
 * Lote de transformación primaria disponible para ser fuente de un secundario
 * (ProductionLotPrimaryAvailableResponse del backend)
 */
export interface PrimaryLotAvailable {
  id: string;
  lotNumber: string;
  productionDate: string; // YYYY-MM-DD
  status: ProductionLotStatus;
  transformationStage: TransformationStage;
  quantity: number | null;
  unit: string | null;
  totalSacksCount: number | null;
  totalJabasCount: number | null;
  transformationNotes: string | null;
  derivedCompanyName: string | null;
  sourceBatchesCount: number | null;
}

/**
 * Contribución de un lote primario al lote secundario
 * (ProductionLotSourceLotRequest del backend)
 */
export interface SourceLotEntry {
  sourcePrimaryLotId: string;
  contributedWeightKg?: number | null;
  contributedSacksCount?: number | null;
  contributedJabasCount?: number | null;
}

export interface CreatePrimaryProductionLotRequest {
  /** Notas opcionales del proceso de transformación */
  transformationNotes?: string | null;
  /** Peso total en KG (si no se envía, el backend lo calcula de receptions) */
  quantity?: number | null;
  /** Total de sacos (calculado automáticamente si se omite) */
  totalSacksCount?: number | null;
  /** Total de jabas (calculado automáticamente si se omite) */
  totalJabasCount?: number | null;
  /** Lotes de acopio fuente con sus valores inmutables de acopio */
  sourceBatches: SourceBatchEntry[];
  /** Datos de recepción en planta por lote (uno por cada entrada en sourceBatches) */
  receptions: ReceptionEntry[];
}
