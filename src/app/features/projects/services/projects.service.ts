import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectStageUpdateDto,
  PageDto,
} from '../models/project.model';

/**
 * Servicio para gestionar proyectos
 * Consume la API: /api/v1/admin/projects
 */
@Injectable({
  providedIn: 'root',
})
export class ProjectsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/admin/projects`;

  /**
   * Obtiene la lista paginada de proyectos por companyId
   * @param companyId - ID de la empresa (tenantId)
   * @param page - Número de página (default: 0)
   * @param size - Tamaño de página (default: 20)
   * @param q - Query de búsqueda (opcional)
   */
  getProjects(companyId: string, page = 0, size = 20, q?: string): Observable<PageDto<Project>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (q) {
      params = params.set('q', q);
    }

    return this.http.get<PageDto<Project>>(`${this.apiUrl}/by-company/${companyId}`, { params });
  }

  /**
   * Obtiene la lista paginada de proyectos por productId
   * GET /api/v1/admin/projects/by-product/{productId}
   * @param productId - ID del producto
   * @param page - Número de página (default: 0)
   * @param size - Tamaño de página (default: 20)
   * @param q - Query de búsqueda (opcional)
   */
  getProjectsByProduct(
    productId: string,
    page = 0,
    size = 20,
    q?: string,
  ): Observable<PageDto<Project>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (q) {
      params = params.set('q', q);
    }

    return this.http.get<PageDto<Project>>(`${this.apiUrl}/by-product/${productId}`, { params });
  }

  /**
   * Obtiene la lista paginada de proyectos por productId y companyId
   * GET /api/v1/admin/projects/by-product/{productId}/by-company/{companyId}
   * @param productId - ID del producto
   * @param companyId - ID de la compañía
   * @param page - Número de página (default: 0)
   * @param size - Tamaño de página (default: 20)
   * @param q - Query de búsqueda (opcional)
   */
  getProjectsByProductAndCompany(
    productId: string,
    companyId: string,
    page = 0,
    size = 20,
    q?: string,
  ): Observable<PageDto<Project>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (q) {
      params = params.set('q', q);
    }

    return this.http.get<PageDto<Project>>(
      `${this.apiUrl}/by-product/${productId}/by-company/${companyId}`,
      { params },
    );
  }

  /**
   * Búsqueda avanzada de proyectos con filtros múltiples
   * @param page - Número de página (default: 0)
   * @param size - Tamaño de página (default: 20)
   * @param q - Query de búsqueda (opcional)
   * @param productId - ID del producto (opcional)
   * @param communityId - ID de la comunidad (opcional)
   * @param status - Estado del proyecto: active, inactive, archived (opcional)
   */
  getProjectsAdvanced(
    page = 0,
    size = 20,
    q?: string,
    productId?: string,
    communityId?: string,
    status?: string,
  ): Observable<PageDto<Project>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (q) params = params.set('q', q);
    if (productId) params = params.set('productId', productId);
    if (communityId) params = params.set('communityId', communityId);
    if (status) params = params.set('status', status);

    return this.http.get<PageDto<Project>>(`${this.apiUrl}/advanced`, { params });
  }

  /**
   * Crea un nuevo proyecto
   * @param data - Datos del proyecto a crear
   */
  createProject(data: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, data);
  }

  /**
   * Obtiene el detalle de un proyecto por ID
   * @param id - UUID del proyecto
   */
  getProjectById(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`);
  }

  /**
   * Actualiza un proyecto existente
   * @param id - UUID del proyecto
   * @param data - Datos del proyecto a actualizar
   */
  updateProject(id: string, data: UpdateProjectRequest): Observable<Project> {
    return this.http.patch<Project>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Inicia la etapa de inventario del proyecto (transición backend específica)
   * PATCH /projects/{id}/start-inventory
   */
  startInventory(id: string): Observable<Project> {
    // No body requerido; backend determina cambio de etapa
    return this.http.patch<Project>(`${this.apiUrl}/${id}/start-inventory`, {});
  }

  /**
   * Inicia la etapa de acopio del proyecto (transición backend específica)
   * PATCH /projects/{id}/start-acopio
   * Transiciona el proyecto a 'ctp_entry' si existen solicitudes y actividades aprobadas
   */
  startAcopio(id: string): Observable<Project> {
    // No body requerido; backend valida solicitudes y actividades aprobadas
    return this.http.patch<Project>(`${this.apiUrl}/${id}/start-acopio`, {});
  }

  /**
   * Actualiza la etapa de un proyecto
   * PATCH /projects/{id}/stage
   * @param id - UUID del proyecto
   * @param stage - Nueva etapa del proyecto
   */
  updateProjectStage(id: string, stage: string): Observable<Project> {
    const body: ProjectStageUpdateDto = { stage };
    return this.http.patch<Project>(`${this.apiUrl}/${id}/stage`, body);
  }

  /**
   * Elimina un proyecto
   * @param id - UUID del proyecto
   */
  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
