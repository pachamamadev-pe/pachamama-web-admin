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
  ProjectActivityTypeKpiResponse,
  CollectorsGenderKpiResponse,
  ActivityValidationStatusKpiResponse,
  SyncSuccessRateKpiResponse,
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
   * @param statuses - Lista de estados del proyecto: active, inactive, archived (opcional)
   */
  getProjectsAdvanced(
    page = 0,
    size = 20,
    q?: string,
    productId?: string,
    communityId?: string,
    statuses?: string[],
  ): Observable<PageDto<Project>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (q) params = params.set('q', q);
    if (productId) params = params.set('productId', productId);
    if (communityId) params = params.set('communityId', communityId);
    if (statuses && statuses.length > 0) {
      for (const s of statuses) {
        params = params.append('statuses', s);
      }
    }

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
   * Inicia la transformación primaria del proyecto (transición backend específica)
   * PATCH /projects/{id}/start-primary-transformation
   * Requiere al menos un lote de acopio en estado 'documents_generated' con los 3 documentos
   */
  startPrimaryTransformation(id: string): Observable<Project> {
    return this.http.patch<Project>(`${this.apiUrl}/${id}/start-primary-transformation`, {});
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
   * Activa un proyecto (pasa de inactive a active)
   * PATCH /api/v1/admin/projects/{projectId}/activate
   * @param id - UUID del proyecto
   */
  activateProject(id: string): Observable<Project> {
    return this.http.patch<Project>(`${this.apiUrl}/${id}/activate`, {});
  }

  /**
   * Elimina un proyecto
   * @param id - UUID del proyecto
   */
  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtiene KPIs sincronizados por tipo de actividad para un proyecto
   * GET /api/v1/admin/kpis/sync/by-activity-type?projectId={projectId}
   */
  getActivityTypeKpis(projectId: string): Observable<ProjectActivityTypeKpiResponse> {
    const params = new HttpParams().set('projectId', projectId);
    return this.http.get<ProjectActivityTypeKpiResponse>(
      `${environment.apiUrl}/api/v1/admin/kpis/sync/by-activity-type`,
      { params },
    );
  }

  /**
   * Obtiene KPIs de participación por género de recolectores para un proyecto
   * GET /api/v1/admin/kpis/sync/collectors/gender/by-project/{projectId}
   */
  getCollectorsGenderKpis(projectId: string): Observable<CollectorsGenderKpiResponse> {
    return this.http.get<CollectorsGenderKpiResponse>(
      `${environment.apiUrl}/api/v1/admin/kpis/sync/collectors/gender/by-project/${projectId}`,
    );
  }

  /**
   * Obtiene KPIs de estado de validación de actividades por tipo para un proyecto
   * GET /api/v1/admin/kpis/sync/activities/validation-status/by-project/{projectId}
   */
  getActivityValidationStatusKpis(
    projectId: string,
  ): Observable<ActivityValidationStatusKpiResponse> {
    return this.http.get<ActivityValidationStatusKpiResponse>(
      `${environment.apiUrl}/api/v1/admin/kpis/sync/activities/validation-status/by-project/${projectId}`,
    );
  }

  /**
   * Obtiene la tasa de éxito de sincronización de actividades para un proyecto
   * GET /api/v1/admin/kpis/sync/by-project/{projectId}/success-rate
   */
  getSyncSuccessRateKpi(projectId: string): Observable<SyncSuccessRateKpiResponse> {
    return this.http.get<SyncSuccessRateKpiResponse>(
      `${environment.apiUrl}/api/v1/admin/kpis/sync/by-project/${projectId}/success-rate`,
    );
  }
}
