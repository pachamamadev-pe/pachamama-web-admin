import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  DocumentRequirements,
  ProjectDocument,
  UploadDocumentRequest,
  DocumentValidationResponse,
  DocumentReviewRequest,
} from '../models/project-document.model';
import { ProjectStage } from '../models/project.model';
import { EntityDocument } from '@shared/models/entity-document.model';

/**
 * Servicio para gestión de documentos de proyectos
 */
@Injectable({
  providedIn: 'root',
})
export class ProjectDocumentsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/documents/projects`;

  /**
   * Obtiene los requerimientos de documentos para un proyecto
   * GET /api/v1/admin/projects/{projectId}/documents/requirements
   */
  getDocumentRequirements(projectId: string): Observable<DocumentRequirements> {
    return this.http.get<DocumentRequirements>(
      `${this.apiUrl}/${projectId}/documents/requirements`,
    );
  }

  /**
   * Lista todos los documentos de un proyecto
   * GET /api/v1/admin/projects/{projectId}/documents
   */
  getDocuments(projectId: string, stage?: ProjectStage): Observable<ProjectDocument[]> {
    let params = new HttpParams();
    if (stage) {
      params = params.set('stage', stage);
    }
    return this.http.get<ProjectDocument[]>(`${this.apiUrl}/${projectId}/documents`, { params });
  }

  /**
   * Sube un nuevo documento al proyecto
   * POST /api/v1/admin/projects/{projectId}/documents
   */
  uploadDocument(
    projectId: string,
    request: UploadDocumentRequest,
    file: File,
  ): Observable<ProjectDocument> {
    console.log('el request es ', request);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));

    return this.http.post<ProjectDocument>(`${this.apiUrl}/${projectId}/documents`, formData);
  }

  /**
   * Aprueba un documento
   * PATCH /api/v1/admin/projects/documents/{documentId}/approve
   */
  approveDocument(documentId: string): Observable<DocumentValidationResponse> {
    return this.http.patch<DocumentValidationResponse>(
      `${this.apiUrl}/documents/${documentId}/approve`,
      {},
    );
  }

  /**
   * Observa un documento (requiere correcciones)
   * PATCH /api/v1/admin/projects/documents/{documentId}/observe
   */
  observeDocument(documentId: string, notes?: string): Observable<DocumentValidationResponse> {
    const body: DocumentReviewRequest = notes ? { notes } : {};
    return this.http.patch<DocumentValidationResponse>(
      `${this.apiUrl}/documents/${documentId}/observe`,
      body,
    );
  }

  /**
   * Rechaza un documento definitivamente
   * PATCH /api/v1/admin/projects/documents/{documentId}/reject
   */
  rejectDocument(documentId: string, notes?: string): Observable<DocumentValidationResponse> {
    const body: DocumentReviewRequest = notes ? { notes } : {};
    return this.http.patch<DocumentValidationResponse>(
      `${this.apiUrl}/documents/${documentId}/reject`,
      body,
    );
  }

  /**
   * Resubir un documento observado (nueva versión)
   * POST /api/v1/admin/projects/{projectId}/documents/{documentId}/resubmit
   */
  resubmitDocument(projectId: string, documentId: string, file: File): Observable<ProjectDocument> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ProjectDocument>(
      `${this.apiUrl}/${projectId}/documents/${documentId}/resubmit`,
      formData,
    );
  }

  /**
   * Obtener documento PMF (Plan de Manejo Forestal) de un proyecto
   * GET /api/v1/admin/projects/{projectId}/documents/pmf
   * @param projectId - ID del proyecto
   * @returns Observable con el documento PMF más reciente o error 404 si no existe
   */
  getPMFDocument(projectId: string): Observable<EntityDocument> {
    return this.http.get<EntityDocument>(`${this.apiUrl}/${projectId}/documents/pmf`);
  }

  /**
   * Subir o resubir documento PMF (Plan de Manejo Forestal)
   * POST /api/v1/admin/projects/{projectId}/documents/pmf
   * Si ya existe una versión anterior, crea automáticamente una nueva versión
   * @param projectId - ID del proyecto
   * @param file - Archivo PDF (puede ser File o Blob)
   * @param filename - Nombre del archivo
   * @returns Observable con el documento creado
   */
  uploadOrResubmitPMF(projectId: string, file: Blob, filename: string): Observable<EntityDocument> {
    const formData = new FormData();
    formData.append('file', file, filename);

    return this.http.post<EntityDocument>(`${this.apiUrl}/${projectId}/documents/pmf`, formData);
  }
}
