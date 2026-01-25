import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import type {
  Community,
  CreateCommunityRequest,
  UpdateCommunityRequest,
} from '../models/community.model';
import type { CommunityProject } from '../models/community-project.model';

/**
 * Servicio para gestionar comunidades nativas y campesinas
 */
@Injectable({
  providedIn: 'root',
})
export class CommunitiesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/communities`;

  /**
   * Obtiene todas las comunidades
   */
  getCommunities(): Observable<Community[]> {
    return this.http.get<Community[]>(this.apiUrl);
  }

  /**
   * Obtiene una comunidad por su ID
   * @param id UUID de la comunidad
   */
  getCommunityById(id: string): Observable<Community> {
    return this.http.get<Community>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtiene los proyectos asociados a una comunidad
   * @param communityId UUID de la comunidad
   */
  getCommunityProjects(communityId: string): Observable<CommunityProject[]> {
    return this.http.get<CommunityProject[]>(`${this.apiUrl}/${communityId}/projects`);
  }

  /**
   * Crea una nueva comunidad (básico)
   * @param data Datos básicos de la comunidad
   */
  createCommunity(data: CreateCommunityRequest): Observable<Community> {
    return this.http.post<Community>(`${this.apiUrl}/basic`, data);
  }

  /**
   * Actualiza una comunidad existente
   * @param id UUID de la comunidad
   * @param data Datos a actualizar
   */
  updateCommunity(id: string, data: UpdateCommunityRequest): Observable<Community> {
    return this.http.put<Community>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Elimina una comunidad
   * @param id UUID de la comunidad
   */
  deleteCommunity(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
