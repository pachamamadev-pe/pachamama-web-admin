import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Brigade, BrigadePageDto } from '../models/brigade.model';
import { CreateBrigadeRequest } from '../models/create-brigade.request';
import { BrigadeCollectorsPageDto } from '../models/brigade-collector.model';

/**
 * Servicio para gestionar brigadas
 * Consume la API: /api/v1/brigades
 */
@Injectable({
  providedIn: 'root',
})
export class BrigadesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/brigades`;

  /**
   * Obtiene la lista paginada de brigadas por projectCommunityId
   * @param projectCommunityId - ID del vínculo proyecto-comunidad
   * @param page - Número de página (default: 0)
   * @param size - Tamaño de página (default: 10)
   */
  getBrigadesByProjectCommunity(
    projectCommunityId: string,
    page = 0,
    size = 10,
  ): Observable<BrigadePageDto> {
    const params = new HttpParams()
      .set('projectCommunityId', projectCommunityId)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<BrigadePageDto>(this.apiUrl, { params });
  }

  /**
   * Obtiene los recolectores asignados a una brigada
   * @param brigadeId - ID de la brigada
   */
  getBrigadeCollectors(brigadeId: string): Observable<BrigadeCollectorsPageDto> {
    return this.http.get<BrigadeCollectorsPageDto>(`${this.apiUrl}/${brigadeId}/collectors`);
  }

  /**
   * Crea una nueva brigada
   * @param data datos de creación
   */
  createBrigade(data: CreateBrigadeRequest) {
    return this.http.post<Brigade>(`${this.apiUrl}`, data);
  }

  /**
   * Actualiza una brigada existente
   * @param id - ID de la brigada
   * @param data - Datos a actualizar (name, description, status)
   */
  updateBrigade(id: string, data: { name?: string; description?: string; status?: string }) {
    return this.http.put<Brigade>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Agrega recolectores a una brigada existente
   */
  addMembers(
    brigadeId: string,
    data: { collectorIds: string[]; startDate?: string; endDate?: string },
  ): Observable<Brigade> {
    return this.http.post<Brigade>(`${this.apiUrl}/${brigadeId}/members`, data);
  }
}
