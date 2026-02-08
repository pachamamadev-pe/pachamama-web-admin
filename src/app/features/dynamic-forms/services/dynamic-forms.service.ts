import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  FormSchemaResponse,
  FormSchemaUpsertRequest,
  FormPublishRequest,
  ProjectStage,
  STAGE_CODES,
} from '../models/dynamic-form.model';

/**
 * Servicio para gestionar formularios dinámicos de empresa/proyecto
 */
@Injectable({
  providedIn: 'root',
})
export class DynamicFormsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/admin/products`;

  /**
   * Lista formularios del producto (nivel empresa)
   * Filtra automáticamente por companyId del token
   */
  listForms(productId: string): Observable<FormSchemaResponse[]> {
    return this.http.get<FormSchemaResponse[]>(`${this.apiUrl}/${productId}/forms`);
  }

  /**
   * Lista formularios de un proyecto específico
   */
  listFormsByProject(productId: string, projectId: string): Observable<FormSchemaResponse[]> {
    return this.http.get<FormSchemaResponse[]>(
      `${this.apiUrl}/${productId}/forms/by-project/${projectId}`,
    );
  }

  /**
   * Obtiene formulario por ID
   */
  getFormById(productId: string, formId: string): Observable<FormSchemaResponse> {
    return this.http.get<FormSchemaResponse>(`${this.apiUrl}/${productId}/forms/${formId}`);
  }

  /**
   * Obtiene el formulario activo para un proyecto y etapa (aplicando jerarquía)
   */
  getActiveForm(
    productId: string,
    projectId: string,
    stage: ProjectStage,
  ): Observable<FormSchemaResponse> {
    return this.http.get<FormSchemaResponse>(
      `${this.apiUrl}/${productId}/forms/by-project/${projectId}/active`,
      { params: { stage: stage.toUpperCase() } },
    );
  }

  /**
   * Crea o actualiza formulario (endpoint unificado)
   * - Si formId es null/undefined: CREA nuevo formulario
   * - Si formId tiene valor: ACTUALIZA formulario existente
   * - Si projectId tiene valor: formulario a nivel proyecto
   * - Si projectId es null/undefined: formulario a nivel empresa
   */
  upsertForm(
    productId: string,
    data: FormSchemaUpsertRequest,
    formId?: string | null,
    projectId?: string | null,
  ): Observable<FormSchemaResponse> {
    // Construir query params
    const params: Record<string, string> = {};
    if (formId) {
      params['formId'] = formId;
    }
    if (projectId) {
      params['projectId'] = projectId;
    }

    return this.http.post<FormSchemaResponse>(`${this.apiUrl}/${productId}/forms/upsert`, data, {
      params,
    });
  }

  /**
   * Publica formulario
   */
  publishForm(
    productId: string,
    formId: string,
    validFrom: string,
    validUntil: string,
  ): Observable<FormSchemaResponse> {
    const request: FormPublishRequest = { validFrom, validUntil };
    return this.http.patch<FormSchemaResponse>(
      `${this.apiUrl}/${productId}/forms/${formId}/publish`,
      request,
    );
  }

  /**
   * Despublica formulario
   */
  unpublishForm(productId: string, formId: string): Observable<FormSchemaResponse> {
    return this.http.patch<FormSchemaResponse>(
      `${this.apiUrl}/${productId}/forms/${formId}/unpublish`,
      {},
    );
  }

  /**
   * Archiva formulario
   */
  archiveForm(productId: string, formId: string): Observable<FormSchemaResponse> {
    return this.http.patch<FormSchemaResponse>(
      `${this.apiUrl}/${productId}/forms/${formId}/archive`,
      {},
    );
  }

  /**
   * Obtiene historial de versiones
   */
  getFormHistory(
    productId: string,
    formId: string,
    stage?: ProjectStage,
  ): Observable<FormSchemaResponse[]> {
    const params = stage ? { stage: STAGE_CODES[stage] } : undefined;
    return this.http.get<FormSchemaResponse[]>(
      `${this.apiUrl}/${productId}/forms/${formId}/history`,
      params ? { params } : {},
    );
  }

  /**
   * Lista etapas con formularios (nivel empresa)
   */
  getFormStages(productId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/${productId}/forms/stages`);
  }

  /**
   * Lista etapas con formularios para proyecto (aplicando jerarquía)
   */
  getFormStagesByProject(productId: string, projectId: string): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.apiUrl}/${productId}/forms/by-project/${projectId}/stages`,
    );
  }
}
