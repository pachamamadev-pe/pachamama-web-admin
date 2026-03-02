import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  ProductionLot,
  ProductionLotStatus,
  ProductionLotDocumentCode,
  CreateProductionLotRequest,
  ProductionLotBatchReception,
  UpdateBatchReceptionRequest,
  GenerateFruitReceptionRecordRequest,
  GeneratePulpProcessingRecordRequest,
  ProductionLotProcessingRecord,
  SavePackagingRecordRequest,
  SaveStorageRecordRequest,
} from '../models/production-lot.model';

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
  getLotById(id: string): Observable<ProductionLot> {
    return this.http.get<ProductionLot>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea un nuevo lote de producción a partir de lotes de acopio
   * POST /
   */
  createLot(request: CreateProductionLotRequest): Observable<ProductionLot> {
    return this.http.post<ProductionLot>(this.apiUrl, request);
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

  /**
   * Obtiene el registro de procesamiento para envasado o almacenamiento
   * GET /{id}/processing-record?processingStage=PACKAGING_RECORD | STORAGE_CONTROL_RECORD
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
   * Guarda/actualiza el registro de envasado y regenera el PDF
   * POST /{id}/packaging-record
   */
  savePackagingRecord(
    lotId: string,
    request: SavePackagingRecordRequest,
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
}
