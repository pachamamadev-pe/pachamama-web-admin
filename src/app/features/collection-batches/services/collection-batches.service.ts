import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  CollectionBatch,
  CollectionBatchLight,
  AvailableRequest,
  CreateBatchRequest,
  UpdateBatchRequest,
  BatchDocument,
  BatchDocumentType,
  CollectorsRegisterData,
  OriginCertificateData,
  TransportWaybillData,
} from '../models/collection-batch.model';

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
 * Servicio para gestión de lotes de acopio
 * Consume la API: /api/v1/admin/collection-batches
 */
@Injectable({
  providedIn: 'root',
})
export class CollectionBatchesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/admin/collection-batches`;

  /**
   * Obtiene los lotes de acopio de un proyecto (paginado)
   * GET /by-project/{projectId}
   * @param projectId - ID del proyecto
   * @param page - Número de página (default: 0)
   * @param size - Tamaño de página (default: 20)
   */
  getBatchesByProject(
    projectId: string,
    page = 0,
    size = 20,
  ): Observable<PageDto<CollectionBatch>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    return this.http.get<PageDto<CollectionBatch>>(`${this.apiUrl}/by-project/${projectId}`, {
      params,
    });
  }

  /**
   * Obtiene lotes de acopio livianos de un proyecto (paginado),
   * excluyendo los ya usados en lotes de producción.
   * GET /by-project/{projectId}/light
   */
  getBatchesByProjectLight(
    projectId: string,
    page = 0,
    size = 20,
  ): Observable<PageDto<CollectionBatchLight>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    return this.http.get<PageDto<CollectionBatchLight>>(
      `${this.apiUrl}/by-project/${projectId}/light`,
      {
        params,
      },
    );
  }

  /**
   * Obtiene las solicitudes de recolección disponibles para crear un lote
   * GET /available-requests?projectId={projectId}
   * @param projectId - ID del proyecto
   */
  getAvailableRequests(projectId: string): Observable<AvailableRequest[]> {
    const params = new HttpParams().set('projectId', projectId);

    return this.http.get<AvailableRequest[]>(`${this.apiUrl}/available-requests`, { params });
  }

  /**
   * Crea un nuevo lote de acopio
   * POST /
   * @param data - Datos del lote a crear
   */
  createBatch(data: CreateBatchRequest): Observable<CollectionBatch> {
    return this.http.post<CollectionBatch>(this.apiUrl, data);
  }

  /**
   * Obtiene el detalle de un lote de acopio
   * GET /{id}
   * @param id - UUID del lote
   */
  getBatchById(id: string): Observable<CollectionBatch> {
    return this.http.get<CollectionBatch>(`${this.apiUrl}/${id}`);
  }

  /**
   * Actualiza un lote de acopio (solo en estado draft)
   * PUT /{id}
   * @param id - UUID del lote
   * @param data - Datos a actualizar
   */
  updateBatch(id: string, data: UpdateBatchRequest): Observable<CollectionBatch> {
    return this.http.put<CollectionBatch>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Elimina un lote de acopio
   * DELETE /{id}
   * @param id - UUID del lote
   */
  deleteBatch(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ─── Document endpoints ───────────────────────────────────────────────────

  /**
   * Obtiene los 3 documentos de un lote
   * GET /{batchId}/documents
   */
  getBatchDocuments(batchId: string): Observable<BatchDocument[]> {
    return this.http.get<BatchDocument[]>(`${this.apiUrl}/${batchId}/documents`);
  }

  /**
   * Obtiene un documento específico del lote
   * GET /{batchId}/documents/{type}
   */
  getBatchDocument(batchId: string, type: BatchDocumentType): Observable<BatchDocument> {
    return this.http.get<BatchDocument>(`${this.apiUrl}/${batchId}/documents/${type}`);
  }

  /**
   * Guarda la ficha de registro de manejo, genera el PDF y actualiza el lote
   * POST /{id}/handling-record
   */
  saveHandlingRecord(batchId: string, data: CollectorsRegisterData): Observable<CollectionBatch> {
    return this.http.post<CollectionBatch>(`${this.apiUrl}/${batchId}/handling-record`, data);
  }

  /**
   * Guarda el Certificado de Procedencia, genera el PDF y actualiza el lote
   * POST /{id}/origin-certificate
   */
  saveOriginCertificate(batchId: string, data: OriginCertificateData): Observable<CollectionBatch> {
    return this.http.post<CollectionBatch>(`${this.apiUrl}/${batchId}/origin-certificate`, data);
  }

  /**
   * Guarda la Guía de Transporte, genera el PDF y actualiza el lote
   * POST /{id}/transport-waybill
   */
  saveTransportWaybill(batchId: string, data: TransportWaybillData): Observable<CollectionBatch> {
    return this.http.post<CollectionBatch>(`${this.apiUrl}/${batchId}/transport-waybill`, data);
  }

  /**
   * Genera el PDF de un documento
   * POST /{batchId}/documents/{type}/generate
   */
  generateDocument(batchId: string, type: BatchDocumentType): Observable<BatchDocument> {
    return this.http.post<BatchDocument>(
      `${this.apiUrl}/${batchId}/documents/${type}/generate`,
      {},
    );
  }

  /**
   * Envía el lote a aprobación (requiere los 3 documentos generados)
   * POST /{batchId}/submit
   */
  submitBatch(batchId: string): Observable<CollectionBatch> {
    return this.http.post<CollectionBatch>(`${this.apiUrl}/${batchId}/submit`, {});
  }

  /**
   * Marca el lote como documentos generados
   * PATCH /{id}/documents-generated
   */
  markDocumentsGenerated(batchId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${batchId}/documents-generated`, {});
  }
}
