import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Collector } from '../models/collector.model';

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
   * Obtiene la lista de recolectores por projectCommunityId
   * @param projectCommunityId - ID del vínculo proyecto-comunidad
   */
  getCollectorsByProjectCommunity(projectCommunityId: string): Observable<Collector[]> {
    const params = new HttpParams().set('projectCommunityId', projectCommunityId);
    return this.http.get<Collector[]>(this.apiUrl, { params });
  }
}
