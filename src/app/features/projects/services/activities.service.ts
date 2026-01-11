import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ActivityResponse, ActivityEvaluationUpdateRequest } from '../models/activity.model';

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
   * Obtiene todas las actividades de un proyecto
   */
  getActivitiesByProject(projectId: string): Observable<ActivityResponse[]> {
    return this.http.get<ActivityResponse[]>(`${this.apiUrl}/by-project/${projectId}`);
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
