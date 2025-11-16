import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DocumentType } from '@shared/models/document-type.model';
import { EntityDocument, UploadDocumentDto } from '@shared/models/entity-document.model';
import { DocumentCompliance } from '@shared/models/document-compliance.model';

/**
 * Servicio genérico para gestión de documentos
 * Puede ser usado por cualquier entidad: empresas, proyectos, colectores, etc.
 */
@Injectable({
  providedIn: 'root',
})
export class DocumentsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/admin`;

  /**
   * Obtener tipos de documentos aplicables a una entidad
   * @param applicableTo - "companies", "projects", "collectors", etc.
   */
  getDocumentTypes(applicableTo: string): Observable<DocumentType[]> {
    return this.http.get<DocumentType[]>(
      `${this.apiUrl}/document-types/applicable/${applicableTo}`,
    );
  }

  /**
   * Obtener documentos de una entidad específica
   * @param entityType - "companies", "projects", etc.
   * @param entityId - UUID de la entidad
   */
  getEntityDocuments(entityType: string, entityId: string): Observable<EntityDocument[]> {
    return this.http.get<EntityDocument[]>(`${this.apiUrl}/documents/${entityType}/${entityId}`);
  }

  /**
   * Verificar cumplimiento de documentos
   * @param entityType - "companies", "projects", etc.
   * @param entityId - UUID de la entidad
   */
  getDocumentCompliance(entityType: string, entityId: string): Observable<DocumentCompliance> {
    return this.http.get<DocumentCompliance>(
      `${this.apiUrl}/documents/${entityType}/${entityId}/compliance`,
    );
  }

  /**
   * Subir un documento
   * @param dto - Datos del documento
   * @param file - Archivo a subir
   */
  uploadDocument(dto: UploadDocumentDto, file: File): Observable<EntityDocument> {
    const formData = new FormData();

    const requestBlob = new Blob([JSON.stringify(dto)], { type: 'application/json' });

    formData.append('request', requestBlob);
    formData.append('file', file);

    return this.http.post<EntityDocument>(`${this.apiUrl}/documents`, formData);
  }

  /**
   * Obtener historial de versiones de un documento
   * @param entityType - "companies", "projects", etc.
   * @param entityId - UUID de la entidad
   * @param documentTypeId - UUID del tipo de documento
   */
  getDocumentHistory(
    entityType: string,
    entityId: string,
    documentTypeId: string,
  ): Observable<EntityDocument[]> {
    return this.http.get<EntityDocument[]>(
      `${this.apiUrl}/documents/${entityType}/${entityId}/history/${documentTypeId}`,
    );
  }

  /**
   * Validar un documento (aprobar/rechazar)
   * @param documentId - UUID del documento
   * @param status - "APPROVED" | "REJECTED"
   * @param notes - Notas opcionales
   */
  validateDocument(
    documentId: string,
    status: 'APPROVED' | 'REJECTED',
    notes?: string,
  ): Observable<EntityDocument> {
    return this.http.patch<EntityDocument>(`${this.apiUrl}/documents/${documentId}/validate`, {
      status,
      notes,
    });
  }

  /**
   * Eliminar un documento físicamente
   * @param documentId - UUID del documento a eliminar
   */
  deleteDocument(documentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/documents/${documentId}`);
  }

  /**
   * Helper para construir URL de descarga del documento
   * (Asume que Azure Storage devuelve la URL directa)
   */
  getDownloadUrl(document: EntityDocument): string {
    return document.blobUrl;
  }
}
