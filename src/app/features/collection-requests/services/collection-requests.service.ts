import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  CollectionRequest,
  CollectionRequestsPageDto,
  CreateCollectionRequestDto,
  UpdateCollectionRequestDto,
  CollectionRequestFilters,
  CollectionRequestHistoryDto,
} from '../models/collection-request.model';

/**
 * Servicio para gestionar solicitudes de recolección
 */
@Injectable({
  providedIn: 'root',
})
export class CollectionRequestsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/admin/collection-requests`;

  /**
   * Listar solicitudes con paginación y filtros
   */
  getCollectionRequests(filters?: CollectionRequestFilters): Observable<CollectionRequestsPageDto> {
    let params = new HttpParams();

    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.page !== undefined) {
      params = params.set('page', filters.page.toString());
    }
    if (filters?.size !== undefined) {
      params = params.set('size', filters.size.toString());
    }

    return this.http.get<CollectionRequestsPageDto>(this.apiUrl, { params });
  }

  /**
   * Obtener solicitud por ID
   */
  getCollectionRequestById(id: string): Observable<CollectionRequest> {
    return this.http.get<CollectionRequest>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear nueva solicitud de recolección
   */
  createCollectionRequest(data: CreateCollectionRequestDto): Observable<CollectionRequest> {
    return this.http.post<CollectionRequest>(this.apiUrl, data);
  }

  /**
   * Actualizar solicitud observada
   */
  updateCollectionRequest(
    id: string,
    data: UpdateCollectionRequestDto,
  ): Observable<CollectionRequest> {
    return this.http.put<CollectionRequest>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Listar solicitudes por proyecto
   */
  getCollectionRequestsByProject(projectId: string): Observable<CollectionRequest[]> {
    return this.http.get<CollectionRequest[]>(`${this.apiUrl}/project/${projectId}`);
  }

  /**
   * Listar solicitudes observadas
   */
  getObservedRequests(): Observable<CollectionRequest[]> {
    return this.http.get<CollectionRequest[]>(`${this.apiUrl}/observed`);
  }

  /**
   * Aprobar solicitud
   */
  approveRequest(requestId: string, reviewNotes: string): Observable<CollectionRequest> {
    return this.http.post<CollectionRequest>(`${this.apiUrl}/${requestId}/approve`, {
      reviewNotes,
      observationNotes: null,
    });
  }

  /**
   * Rechazar solicitud
   */
  rejectRequest(requestId: string, reviewNotes: string): Observable<CollectionRequest> {
    return this.http.post<CollectionRequest>(`${this.apiUrl}/${requestId}/reject`, {
      reviewNotes,
      observationNotes: null,
    });
  }

  /**
   * Observar solicitud
   */
  observeRequest(
    requestId: string,
    reviewNotes: string,
    observationNotes: string,
  ): Observable<CollectionRequest> {
    return this.http.post<CollectionRequest>(`${this.apiUrl}/${requestId}/observe`, {
      reviewNotes,
      observationNotes,
    });
  }

  /**
   * Obtener historial de cambios de una solicitud
   */
  getRequestHistory(requestId: string): Observable<CollectionRequestHistoryDto[]> {
    return this.http.get<CollectionRequestHistoryDto[]>(`${this.apiUrl}/${requestId}/history`);
  }
}
