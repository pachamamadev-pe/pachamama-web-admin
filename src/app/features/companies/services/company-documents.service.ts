import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of, switchMap } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
// import { BlockBlobClient } from '@azure/storage-blob'; // TODO: Descomentar cuando P2 configure Azure

import { CompanyDocument } from '../models/company-document.model';
import { UploadUrlResponse } from '../models/upload-url-response.model';
import { RequestUploadUrlDto, ConfirmUploadDto } from '../models/company-document-dto.model';

/**
 * Service para gestionar documentos de empresas.
 * Maneja el flujo completo de subida:
 * 1. Solicitar URL firmada (SAS Token) al backend
 * 2. Subir archivo directo a Azure Blob Storage
 * 3. Confirmar subida al backend para registrar metadata
 */
@Injectable({
  providedIn: 'root',
})
export class CompanyDocumentsService {
  private http = inject(HttpClient);
  private readonly apiUrl = '/api/companies'; // TODO: Mover a environment

  /**
   * 1. Solicita una URL firmada (con SAS Token) para subir un archivo a Azure Blob Storage
   */
  getUploadUrl(companyId: string, dto: RequestUploadUrlDto): Observable<UploadUrlResponse> {
    // TODO: Cuando P2 tenga el endpoint listo, descomentar:
    // return this.http.post<UploadUrlResponse>(
    //   `${this.apiUrl}/${companyId}/documents/upload-url`,
    //   dto
    // );

    // MOCK TEMPORAL: Simular response del backend
    console.warn('🚧 MOCK: getUploadUrl - Esperando implementación de P2');
    return of({
      uploadUrl: `https://pachamamastorage.blob.core.windows.net/documents/${companyId}/${dto.fileName}?sv=2021-06-08&se=2025-12-31T23:59:59Z&sp=w&sig=MOCK_SIGNATURE`,
      blobName: `${companyId}/${dto.fileName}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Expira en 1 hora
    });
  }

  /**
   * 2. Sube el archivo directamente a Azure Blob Storage usando el SAS Token
   * Devuelve el progreso de la subida (0-100)
   */
  uploadToAzure(
    _uploadUrl: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Observable<void> {
    return new Observable((observer) => {
      // TODO: Cuando P2 configure Azure, descomentar y usar el SDK real:
      /*
      const blockBlobClient = new BlockBlobClient(_uploadUrl);

      blockBlobClient.uploadData(file, {
        blobHTTPHeaders: { blobContentType: file.type },
        onProgress: (progress) => {
          const percent = Math.round((progress.loadedBytes / file.size) * 100);
          onProgress?.(percent);
        },
      })
      .then(() => {
        observer.next();
        observer.complete();
      })
      .catch((error) => {
        observer.error(error);
      });
      */

      // MOCK TEMPORAL: Simular subida con progreso
      console.warn('🚧 MOCK: uploadToAzure - Esperando configuración de Azure Storage');
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        onProgress?.(progress);

        if (progress >= 100) {
          clearInterval(interval);
          observer.next();
          observer.complete();
        }
      }, 200); // Simula subida progresiva
    });
  }

  /**
   * 3. Confirma al backend que el archivo se subió exitosamente a Azure
   * El backend registra la metadata del documento en la base de datos
   */
  confirmUpload(companyId: string, dto: ConfirmUploadDto): Observable<CompanyDocument> {
    // TODO: Cuando P2 tenga el endpoint listo, descomentar:
    // return this.http.post<CompanyDocument>(
    //   `${this.apiUrl}/${companyId}/documents`,
    //   dto
    // );

    // MOCK TEMPORAL: Simular respuesta del backend
    console.warn('🚧 MOCK: confirmUpload - Esperando implementación de P2');
    const mockDocument: CompanyDocument = {
      id: `doc-${Date.now()}`,
      companyId,
      fileName: dto.fileName,
      originalFileName: dto.originalFileName,
      documentType: dto.documentType,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      blobUrl: `https://pachamamastorage.blob.core.windows.net/documents/${dto.blobName}`,
      uploadedBy: 'current-user-id', // TODO: Obtener del AuthService
      uploadedAt: new Date(),
      status: 'uploaded',
    };

    return of(mockDocument);
  }

  /**
   * 4. Lista todos los documentos de una empresa
   */
  getDocuments(_companyId: string): Observable<CompanyDocument[]> {
    // TODO: Cuando P2 tenga el endpoint listo, descomentar:
    // return this.http.get<CompanyDocument[]>(
    //   `${this.apiUrl}/${_companyId}/documents`
    // );

    // MOCK TEMPORAL: Devolver array vacío
    console.warn('🚧 MOCK: getDocuments - Esperando implementación de P2');
    return of([]);
  }

  /**
   * 5. Elimina un documento (tanto de Azure Storage como de la BD)
   */
  deleteDocument(_companyId: string, _documentId: string): Observable<void> {
    // TODO: Cuando P2 tenga el endpoint listo, descomentar:
    // return this.http.delete<void>(
    //   `${this.apiUrl}/${_companyId}/documents/${_documentId}`
    // );

    // MOCK TEMPORAL: Simular éxito
    console.warn('🚧 MOCK: deleteDocument - Esperando implementación de P2');
    return of(void 0);
  }

  /**
   * 6. Obtiene una URL temporal (con SAS Token de lectura) para descargar/visualizar un documento
   */
  getDownloadUrl(_companyId: string, _documentId: string): Observable<string> {
    // TODO: Cuando P2 tenga el endpoint listo, descomentar:
    // return this.http.get<{ downloadUrl: string }>(
    //   `${this.apiUrl}/${_companyId}/documents/${_documentId}/download-url`
    // ).pipe(map((response) => response.downloadUrl));

    // MOCK TEMPORAL: Devolver URL de placeholder
    console.warn('🚧 MOCK: getDownloadUrl - Esperando implementación de P2');
    return of('https://via.placeholder.com/400x600.png?text=Documento');
  }

  /**
   * Helper: Flujo completo de subida (3 pasos en uno)
   * 1. Solicita URL → 2. Sube a Azure → 3. Confirma al backend
   */
  uploadDocument(
    companyId: string,
    file: File,
    documentType: CompanyDocument['documentType'],
    onProgress?: (percent: number) => void,
  ): Observable<CompanyDocument> {
    const requestDto: RequestUploadUrlDto = {
      fileName: this.sanitizeFileName(file.name),
      fileType: file.type,
      documentType,
    };

    return this.getUploadUrl(companyId, requestDto).pipe(
      // Paso 1: Obtener URL firmada
      tap((response) => console.log('✅ URL de subida obtenida:', response.blobName)),

      // Paso 2: Subir a Azure con progreso
      switchMap((response) =>
        this.uploadToAzure(response.uploadUrl, file, onProgress).pipe(map(() => response)),
      ),

      tap(() => console.log('✅ Archivo subido a Azure')),

      // Paso 3: Confirmar al backend
      switchMap((response) => {
        const confirmDto: ConfirmUploadDto = {
          fileName: response.blobName,
          originalFileName: file.name,
          documentType,
          fileSize: file.size,
          mimeType: file.type,
          blobName: response.blobName,
        };
        return this.confirmUpload(companyId, confirmDto);
      }),

      tap((document) => console.log('✅ Documento confirmado:', document.fileName)),

      catchError((error) => {
        console.error('❌ Error en flujo de subida:', error);
        return throwError(() => new Error('Error al subir el documento. Intenta nuevamente.'));
      }),
    );
  }

  /**
   * Helper: Sanitiza el nombre del archivo para evitar caracteres problemáticos
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .toLowerCase()
      .replace(/\s+/g, '-') // Espacios → guiones
      .replace(/[^a-z0-9.-]/g, '') // Solo letras, números, puntos y guiones
      .replace(/-+/g, '-'); // Múltiples guiones → uno solo
  }
}
