import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ActivityResponse, ActivityEvaluationUpdateRequest } from '../models/activity.model';
import { PageDto } from '../models/project.model';

/**
 * Servicio para gestionar actividades de recolección
 */
@Injectable({
  providedIn: 'root',
})
export class ActivitiesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/collectors/activities`;

  /**
   * Obtiene las actividades de un proyecto (paginado)
   * @param projectId ID del proyecto
   * @param page Número de página (0-based)
   * @param size Tamaño de página
   */
  getActivitiesByProject(
    projectId: string,
    page = 0,
    size = 20,
  ): Observable<PageDto<ActivityResponse>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PageDto<ActivityResponse>>(
      `${this.apiUrl}/by-project/${projectId}/paged`,
      {
        params,
      },
    );
  }

  /**
   * Obtiene una actividad por su ID
   */
  getActivityById(activityId: string): Observable<ActivityResponse> {
    return this.http.get<ActivityResponse>(`${this.apiUrl}/${activityId}`);
  }

  /**
   * Actualiza la evaluación de una actividad
   * @param activityId ID de la actividad
   * @param request Datos de evaluación (formData, overallValidationStatus, validationNotes)
   */
  updateActivityEvaluation(
    activityId: string,
    request: ActivityEvaluationUpdateRequest,
  ): Observable<ActivityResponse> {
    return this.http.put<ActivityResponse>(`${this.apiUrl}/${activityId}/evaluation`, request);
  }
}
