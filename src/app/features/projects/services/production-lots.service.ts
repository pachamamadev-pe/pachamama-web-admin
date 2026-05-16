import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  ProductionLot,
  ProductionLotClientCodesUpdateRequest,
  ProductionLotDetail,
  ProductionLotStatus,
  ProductionLotDocumentCode,
  CreateProductionLotRequest,
  CreateSecondaryProductionLotRequest,
  ProductionLotBatchReception,
  UpdateBatchReceptionRequest,
  GenerateFruitReceptionRecordRequest,
  GeneratePulpProcessingRecordRequest,
  ProductionLotProcessingRecord,
  ProductionLotPackagingRecordRequest,
  SaveStorageRecordRequest,
  SaveSecondaryTransportRequest,
  SecondaryReceptionRecordRequest,
} from '../models/production-lot.model';
import {
  ProductionLotRecord,
  ProductionLotSearchParams,
  CreatePrimaryProductionLotRequest,
  PrimaryLotAvailable,
  CreateSecondaryLotMultiRequest,
} from '../../production-lots/models/production-lot-search.model';

/**
 * Response paginado genérico
 */
export interface PageDto<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

/**
 * Servicio para gestión de lotes de producción (Transformación Primaria)
 * Consume la API: /api/v1/admin/production-lots
 */
@Injectable({
  providedIn: 'root',
})
export class ProductionLotsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/admin/production-lots`;

  /**
   * Obtiene los lotes de producción de un proyecto (paginado)
   * GET /by-project/{projectId}
   */
  getLotsByProject(projectId: string, page = 0, size = 50): Observable<PageDto<ProductionLot>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PageDto<ProductionLot>>(`${this.apiUrl}/by-project/${projectId}`, {
      params,
    });
  }

  /**
   * Obtiene el detalle de un lote de producción por ID
   * GET /{id}
   */
  getLotById(id: string): Observable<ProductionLotDetail> {
    return this.http.get<ProductionLotDetail>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea un nuevo lote de producción a partir de lotes de acopio
   * POST /
   */
  createLot(request: CreateProductionLotRequest): Observable<ProductionLot> {
    return this.http.post<ProductionLot>(this.apiUrl, request);
  }

  /**
   * Crea un lote de transformación PRIMARIA a nivel empresa (nuevo flujo multi-proyecto)
   * POST /
   * Usa el nuevo modelo CreatePrimaryProductionLotRequest con sourceBatches + receptions
   */
  createPrimaryLot(request: CreatePrimaryProductionLotRequest): Observable<ProductionLotRecord> {
    return this.http.post<ProductionLotRecord>(this.apiUrl, request);
  }

  /**
   * Crea un nuevo lote de producción secundaria a partir de un lote primario finalizado
   * POST /secondary
   */
  createSecondaryLot(request: CreateSecondaryProductionLotRequest): Observable<ProductionLot> {
    return this.http.post<ProductionLot>(`${this.apiUrl}/secondary`, request);
  }

  /**
   * Lista los lotes primarios disponibles para transformación secundaria (paginado)
   * GET /available-for-secondary?companyId=...&page=...&size=...
   */
  getAvailablePrimaryLots(
    companyId: string,
    page = 0,
    size = 10,
  ): Observable<PageDto<PrimaryLotAvailable>> {
    const params = new HttpParams()
      .set('companyId', companyId)
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<PageDto<PrimaryLotAvailable>>(`${this.apiUrl}/available-for-secondary`, {
      params,
    });
  }

  /**
   * Crea un lote de transformación secundaria multi-fuente (nuevo endpoint)
   * POST /secondary
   */
  createSecondaryLotMulti(
    request: CreateSecondaryLotMultiRequest,
  ): Observable<ProductionLotDetail> {
    return this.http.post<ProductionLotDetail>(`${this.apiUrl}/secondary`, request);
  }

  /**
   * Obtiene las recepciones de lotes de acopio de un lote de producción
   * GET /{id}/batch-receptions?documentCode=...
   */
  getBatchReceptions(
    lotId: string,
    documentCode: ProductionLotDocumentCode,
  ): Observable<ProductionLotBatchReception[]> {
    const params = new HttpParams().set('documentCode', documentCode);
    return this.http.get<ProductionLotBatchReception[]>(
      `${this.apiUrl}/${lotId}/batch-receptions`,
      { params },
    );
  }

  /**
   * Actualiza una recepción de lote de acopio
   * PATCH /{id}/batch-receptions/{receptionId}
   */
  updateBatchReception(
    lotId: string,
    receptionId: string,
    data: UpdateBatchReceptionRequest,
  ): Observable<ProductionLotBatchReception> {
    return this.http.patch<ProductionLotBatchReception>(
      `${this.apiUrl}/${lotId}/batch-receptions/${receptionId}`,
      data,
    );
  }

  /**
   * Genera la ficha de recepción de frutos (registra recepciones y genera el PDF)
   * POST /{id}/fruit-reception-record
   */
  generateFruitReceptionRecord(
    lotId: string,
    request: GenerateFruitReceptionRecordRequest,
  ): Observable<ProductionLot> {
    return this.http.post<ProductionLot>(`${this.apiUrl}/${lotId}/fruit-reception-record`, request);
  }

  /**
   * Genera el registro de procesamiento de pulpa
   * POST /{id}/pulp-processing-record
   */
  generatePulpProcessingRecord(
    lotId: string,
    request: GeneratePulpProcessingRecordRequest,
  ): Observable<ProductionLot> {
    return this.http.post<ProductionLot>(`${this.apiUrl}/${lotId}/pulp-processing-record`, request);
  }

  /**
   * Actualiza el estado del lote (avanza a la siguiente etapa)
   * PATCH /{id}/status
   */
  updateLotStatus(lotId: string, status: ProductionLotStatus): Observable<ProductionLot> {
    return this.http.patch<ProductionLot>(`${this.apiUrl}/${lotId}/status`, { status });
  }

  updateClientCodes(
    lotId: string,
    request: ProductionLotClientCodesUpdateRequest,
  ): Observable<ProductionLotDetail> {
    return this.http.patch<ProductionLotDetail>(`${this.apiUrl}/${lotId}/client-codes`, request);
  }

  /**
   * Obtiene el registro de procesamiento para envasado o almacenamiento (single, legado)
   * GET /{id}/processing-record?processingStage=STORAGE_CONTROL_RECORD
   */
  getProcessingRecord(
    lotId: string,
    processingStage: ProductionLotDocumentCode,
  ): Observable<ProductionLotProcessingRecord> {
    const params = new HttpParams().set('processingStage', processingStage);
    return this.http.get<ProductionLotProcessingRecord>(
      `${this.apiUrl}/${lotId}/processing-record`,
      { params },
    );
  }

  /**
   * Lista todos los registros de procesamiento por etapa
   * GET /{id}/processing-records?processingStage=PACKAGING_RECORD | ...
   */
  listProcessingRecords(
    lotId: string,
    processingStage: ProductionLotDocumentCode,
  ): Observable<ProductionLotProcessingRecord[]> {
    const params = new HttpParams().set('processingStage', processingStage);
    return this.http.get<ProductionLotProcessingRecord[]>(
      `${this.apiUrl}/${lotId}/processing-records`,
      { params },
    );
  }

  /**
   * Guarda/actualiza el registro de envasado con lista de filas y regenera el PDF
   * POST /{id}/packaging-record
   */
  savePackagingRecord(
    lotId: string,
    request: ProductionLotPackagingRecordRequest,
  ): Observable<ProductionLot> {
    return this.http.post<ProductionLot>(`${this.apiUrl}/${lotId}/packaging-record`, request);
  }

  /**
   * Guarda/actualiza el registro de almacenamiento y regenera el PDF
   * POST /{id}/storage-control-record
   */
  saveStorageRecord(lotId: string, request: SaveStorageRecordRequest): Observable<ProductionLot> {
    return this.http.post<ProductionLot>(`${this.apiUrl}/${lotId}/storage-control-record`, request);
  }

  /**
   * Guarda la información de transporte y genera la guía de transporte (PDF)
   * POST /{id}/transport-waybill
   */
  saveTransportWaybill(
    lotId: string,
    request: SaveSecondaryTransportRequest,
  ): Observable<ProductionLot> {
    return this.http.post<ProductionLot>(`${this.apiUrl}/${lotId}/transport-waybill`, request);
  }

  /**
   * Genera la ficha de recepción para transformación secundaria
   * POST /{id}/secondary-fruit-reception-record
   */
  generateSecondaryFruitReceptionRecord(
    lotId: string,
    requests: SecondaryReceptionRecordRequest[],
  ): Observable<ProductionLot> {
    return this.http.post<ProductionLot>(
      `${this.apiUrl}/${lotId}/secondary-fruit-reception-record`,
      requests,
    );
  }

  /**
   * Busca lotes de transformación a nivel empresa con filtros opcionales.
   * GET /search?companyId=...&projectId=...&productId=...&q=...&page=...&size=...
   */
  search(params: ProductionLotSearchParams): Observable<PageDto<ProductionLotRecord>> {
    let httpParams = new HttpParams().set('companyId', params.companyId);

    if (params.projectId) httpParams = httpParams.set('projectId', params.projectId);
    if (params.productId) httpParams = httpParams.set('productId', params.productId);
    if (params.transformationStage)
      httpParams = httpParams.set('transformationStage', params.transformationStage);
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    if (params.q?.trim()) httpParams = httpParams.set('q', params.q.trim());

    return this.http.get<PageDto<ProductionLotRecord>>(`${this.apiUrl}/search`, {
      params: httpParams,
    });
  }
}
