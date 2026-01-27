import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Collector } from '../models/collector.model';
import { PageDto } from '../models/project.model';

/**
 * Servicio para gestionar recolectores
 * Consume la API: /api/v1/collectors
 */
@Injectable({
  providedIn: 'root',
})
export class CollectorsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/collectors`;

  /**
   * Obtiene la lista paginada de recolectores por projectCommunityId
   * @param projectCommunityId - ID del vínculo proyecto-comunidad
   * @param page - Página (default 0)
   * @param size - Tamaño de página (default 20)
   */
  getCollectorsByProjectCommunity(
    projectCommunityId: string,
    page = 0,
    size = 20,
  ): Observable<PageDto<Collector>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PageDto<Collector>>(
      `${this.apiUrl}/project-community/${projectCommunityId}/paged`,
      { params },
    );
  }

  /**
   * Actualiza el estado de un recolector
   * @param collectorId - ID del recolector
   * @param status - Estado: 'active' o 'inactive'
   */
  updateCollectorStatus(collectorId: string, status: 'active' | 'inactive'): Observable<Collector> {
    return this.http.patch<Collector>(`${this.apiUrl}/${collectorId}/status`, { status });
  }
}
