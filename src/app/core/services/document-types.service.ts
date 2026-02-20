import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DocumentType } from '@shared/models/document-type.model';

/**
 * Respuesta del endpoint de validación de código
 */
export interface ValidateCodeResponse {
  code: string;
  available: boolean;
  scope: 'tenant' | 'global';
  reason: 'CODE_ALREADY_EXISTS' | null;
}

/**
 * Servicio para administración del catálogo de tipos de documentos.
 * Gestiona la configuración de document_types a nivel de empresa/tenant.
 *
 * NOTA: Este servicio es diferente de DocumentsService:
 * - DocumentsService: maneja documentos subidos, compliance, validación (instancias)
 * - DocumentTypesService: maneja el catálogo/configuración de tipos (definiciones)
 */
@Injectable({ providedIn: 'root' })
export class DocumentTypesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1/admin/document-types`;

  /**
   * Obtener tipos de documentos aplicables para el tenant autenticado.
   * Retorna los document types configurados para una entidad específica del tenant actual.
   *
   * @param entityType - Tipo de entidad ("projects", "companies", "collectors", etc.)
   * @returns Observable con array de DocumentType aplicables al tenant
   */
  getApplicableDocumentTypesForTenant(entityType: string): Observable<DocumentType[]> {
    return this.http.get<DocumentType[]>(`${this.apiUrl}/applicable/${entityType}/tenant`);
  }

  /**
   * Obtener plantillas globales de tipos de documentos para una entidad.
   * Retorna plantillas base configuradas por Pachamama.
   *
   * @param entityType - Tipo de entidad ("projects", "companies", "collectors", etc.)
   * @returns Observable con array de DocumentType templates
   */
  getTemplatesForEntity(entityType: string): Observable<DocumentType[]> {
    return this.http.get<DocumentType[]>(`${this.apiUrl}/templates/${entityType}`);
  }

  /**
   * Obtener un tipo de documento por su ID.
   *
   * @param id - UUID del tipo de documento
   * @returns Observable con el DocumentType
   */
  getDocumentTypeById(id: string): Observable<DocumentType> {
    return this.http.get<DocumentType>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear un nuevo tipo de documento para el tenant.
   *
   * @param data - Datos del tipo de documento a crear
   * @returns Observable con el DocumentType creado
   */
  createDocumentType(data: Partial<DocumentType>): Observable<DocumentType> {
    return this.http.post<DocumentType>(`${this.apiUrl}/tenant`, data);
  }

  /**
   * Actualizar un tipo de documento existente.
   *
   * @param id - UUID del tipo de documento
   * @param data - Datos parciales a actualizar
   * @returns Observable con el DocumentType actualizado
   */
  updateDocumentType(id: string, data: Partial<DocumentType>): Observable<DocumentType> {
    return this.http.put<DocumentType>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Eliminar (archivar) un tipo de documento.
   *
   * @param id - UUID del tipo de documento
   * @returns Observable void
   */
  deleteDocumentType(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Validar si un código está disponible.
   * Verifica que no exista otro tipo de documento con el mismo código en el scope actual.
   *
   * @param code - Código a validar
   * @param excludeId - ID opcional a excluir de la búsqueda (para modo edición)
   * @returns Observable con resultado de validación
   */
  validateCode(code: string, excludeId?: string): Observable<ValidateCodeResponse> {
    let params = new HttpParams().set('code', code);
    if (excludeId) {
      params = params.set('excludeId', excludeId);
    }
    return this.http.get<ValidateCodeResponse>(`${this.apiUrl}/validate-code`, { params });
  }
}
