import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

/**
 * Request para vincular comunidad con proyecto
 */
export interface CommunityProjectLinkRequest {
  communityId: string;
  projectId: string;
}

/**
 * Request para actualizar vínculo existente
 */
export interface UpdateCommunityProjectLinkRequest {
  communityId: string;
}

/**
 * Response del vínculo creado
 */
export interface CommunityProjectLinkResponse {
  id: string;
}

/**
 * Servicio para gestionar vínculos entre comunidades y proyectos
 */
@Injectable({
  providedIn: 'root',
})
export class CommunityProjectLinkService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/community-project-links`;

  /**
   * Crea un vínculo entre una comunidad y un proyecto
   * @param data Datos del vínculo (communityId, projectId)
   */
  createLink(data: CommunityProjectLinkRequest): Observable<CommunityProjectLinkResponse> {
    return this.http.post<CommunityProjectLinkResponse>(this.apiUrl, data);
  }

  /**
   * Actualiza un vínculo existente entre una comunidad y un proyecto
   * @param linkId ID del vínculo a actualizar
   * @param data Nueva comunidad
   */
  updateLink(linkId: string, data: UpdateCommunityProjectLinkRequest): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${linkId}`, data);
  }
}
