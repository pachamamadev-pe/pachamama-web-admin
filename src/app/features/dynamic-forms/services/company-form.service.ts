import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  FormSchemaResponse,
  FormSchemaUpsertRequest,
  FormPublishRequest,
  ProjectStage,
} from '../models/dynamic-form.model';
import { FormCopyRequest } from '../models/form-copy-request.dto';
import { PageDto } from '@features/projects/models/project.model';

/**
 * Servicio para gestionar formularios dinámicos a nivel empresa
 * Usa los nuevos endpoints /api/v1/admin/company/forms
 */
@Injectable({
  providedIn: 'root',
})
export class CompanyFormService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/admin/company/forms`;

  /**
   * Lista formularios de empresa con paginación y filtros
   * @param page Página (0-based)
   * @param size Tamaño de página
   * @param q Búsqueda general (opcional)
   * @param productId Filtrar por producto (opcional)
   * @param stage Filtrar por etapa (opcional)
   * @param projectId Filtrar por proyecto (opcional)
   */
  listFormsPaged(
    page = 0,
    size = 20,
    q?: string,
    productId?: string,
    stage?: ProjectStage,
    projectId?: string,
  ): Observable<PageDto<FormSchemaResponse>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (q) {
      params = params.set('q', q);
    }
    if (productId) {
      params = params.set('productId', productId);
    }
    if (stage) {
      params = params.set('stage', stage);
    }
    if (projectId) {
      params = params.set('projectId', projectId);
    }

    return this.http.get<PageDto<FormSchemaResponse>>(this.apiUrl, { params });
  }

  /**
   * Obtiene un formulario por ID
   * @param formId ID del formulario
   */
  getFormById(formId: string): Observable<FormSchemaResponse> {
    return this.http.get<FormSchemaResponse>(`${this.apiUrl}/${formId}`);
  }

  /**
   * Crea o actualiza formulario (endpoint unificado)
   * - Si formId es null/undefined: CREA nuevo formulario
   * - Si formId tiene valor: ACTUALIZA formulario existente
   * - Si projectId tiene valor: formulario a nivel proyecto
   * - Si projectId es null/undefined: formulario a nivel empresa
   *
   * @param productId ID del producto (REQUERIDO como query param)
   * @param data Datos del formulario
   * @param formId ID del formulario (opcional, para edición)
   * @param projectId ID del proyecto (opcional, para formularios de proyecto)
   */
  upsertForm(
    productId: string,
    data: FormSchemaUpsertRequest,
    formId?: string | null,
    projectId?: string | null,
  ): Observable<FormSchemaResponse> {
    let params = new HttpParams().set('productId', productId);

    if (formId) {
      params = params.set('formId', formId);
    }
    if (projectId) {
      params = params.set('projectId', projectId);
    }

    return this.http.post<FormSchemaResponse>(`${this.apiUrl}/upsert`, data, { params });
  }

  /**
   * Publica un formulario con fechas de vigencia
   * @param formId ID del formulario
   * @param validFrom Fecha desde la cual es válido (formato ISO)
   * @param validUntil Fecha hasta la cual es válido (formato ISO)
   */
  publishForm(
    formId: string,
    validFrom: string,
    validUntil: string,
  ): Observable<FormSchemaResponse> {
    const request: FormPublishRequest = { validFrom, validUntil };
    return this.http.patch<FormSchemaResponse>(`${this.apiUrl}/${formId}/publish`, request);
  }

  /**
   * Despublica un formulario
   * @param formId ID del formulario
   */
  unpublishForm(formId: string): Observable<FormSchemaResponse> {
    return this.http.patch<FormSchemaResponse>(`${this.apiUrl}/${formId}/unpublish`, {});
  }

  /**
   * Archiva un formulario
   * Solo permite archivar formularios que han expirado o no están publicados
   * @param formId ID del formulario
   */
  archiveForm(formId: string): Observable<FormSchemaResponse> {
    return this.http.patch<FormSchemaResponse>(`${this.apiUrl}/${formId}/archive`, {});
  }

  /**
   * Obtiene el historial de versiones de un formulario
   * @param formId ID del formulario
   */
  getFormHistory(formId: string): Observable<FormSchemaResponse[]> {
    return this.http.get<FormSchemaResponse[]>(`${this.apiUrl}/${formId}/history`);
  }

  /**
   * Copia un formulario existente
   * Crea una nueva versión en draft con personalización opcional
   * @param formId ID del formulario a copiar
   * @param request Datos de personalización (nombre, descripción, logo, proyecto destino)
   */
  copyForm(formId: string, request: FormCopyRequest): Observable<FormSchemaResponse> {
    return this.http.post<FormSchemaResponse>(`${this.apiUrl}/${formId}/copy`, request);
  }
}
