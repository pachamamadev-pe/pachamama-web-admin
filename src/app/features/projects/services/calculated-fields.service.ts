import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  CalculatedField,
  CreateCalculatedFieldRequest,
  UpdateCalculatedFieldRequest,
  CalculatedValue,
  ProjectAggregation,
  RecalculateResponse,
  DomainAttribute,
} from '../models/calculated-field.model';

/**
 * Servicio para gestionar columnas calculadas y agregaciones
 */
@Injectable({
  providedIn: 'root',
})
export class CalculatedFieldsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/admin/calculated-fields`;
  private validationsUrl = `${environment.apiUrl}/api/v1/admin/section-validations`;

  /**
   * Obtiene los atributos de dominio disponibles para agregaciones
   * @param projectId ID del proyecto
   */
  getAvailableAttributes(projectId: string): Observable<DomainAttribute[]> {
    return this.http.get<DomainAttribute[]>(`${this.apiUrl}/project/${projectId}/aggregations`);
  }

  /**
   * Lista todas las fórmulas/agregaciones de un proyecto
   * @param projectId ID del proyecto
   */
  getCalculatedFieldsByProject(projectId: string): Observable<CalculatedField[]> {
    return this.http.get<CalculatedField[]>(`${this.apiUrl}/project/${projectId}`);
  }

  /**
   * Obtiene un campo calculado por su ID
   * @param fieldId ID del campo calculado
   */
  getCalculatedFieldById(fieldId: string): Observable<CalculatedField> {
    return this.http.get<CalculatedField>(`${this.apiUrl}/${fieldId}`);
  }

  /**
   * Crea una nueva fórmula o agregación
   * @param request Datos del campo calculado
   */
  createCalculatedField(request: CreateCalculatedFieldRequest): Observable<CalculatedField> {
    return this.http.post<CalculatedField>(this.apiUrl, request);
  }

  /**
   * Actualiza una fórmula o agregación existente
   * @param fieldId ID del campo calculado
   * @param request Datos a actualizar
   */
  updateCalculatedField(
    fieldId: string,
    request: UpdateCalculatedFieldRequest,
  ): Observable<CalculatedField> {
    return this.http.put<CalculatedField>(`${this.apiUrl}/${fieldId}`, request);
  }

  /**
   * Archiva una fórmula (no se aplicará a nuevas actividades)
   * @param fieldId ID del campo calculado
   */
  archiveCalculatedField(fieldId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${fieldId}`);
  }

  /**
   * Obtiene los valores calculados de una actividad
   * @param activityId ID de la actividad
   */
  getActivityCalculatedValues(activityId: string): Observable<CalculatedValue[]> {
    return this.http.get<CalculatedValue[]>(`${this.apiUrl}/activity/${activityId}/values`);
  }

  /**
   * Obtiene las agregaciones a nivel proyecto
   * @param projectId ID del proyecto
   */
  getProjectAggregations(projectId: string): Observable<ProjectAggregation[]> {
    return this.http.get<ProjectAggregation[]>(`${this.apiUrl}/project/${projectId}/aggregations`);
  }

  /**
   * Recalcula todas las actividades aprobadas del proyecto
   * @param projectId ID del proyecto
   */
  recalculateProject(projectId: string): Observable<RecalculateResponse> {
    return this.http.post<RecalculateResponse>(
      `${this.validationsUrl}/project/${projectId}/recalculate`,
      {},
    );
  }
}
