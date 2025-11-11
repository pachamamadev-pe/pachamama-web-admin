import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Resultado de la subida de archivo
 */
export interface UploadResult {
  /** Path relativo del archivo en Azure Storage (ej: products/1762741023058-5g7629kq.jpg) */
  relativePath: string;
  /** Nombre del archivo */
  fileName: string;
  /** Tamaño del archivo en bytes */
  size: number;
}

/**
 * Respuesta del backend al subir archivo
 */
interface BackendUploadResponse {
  url: string;
}

/**
 * Servicio para subir archivos a Azure Blob Storage
 * Usa el backend como proxy para la subida segura
 *
 * El backend maneja:
 * - Credenciales de Azure Storage
 * - Generación de nombres únicos
 * - Subida al contenedor admin-uploads
 * - Retorna el path relativo del archivo
 */
@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  private http = inject(HttpClient);
  private readonly uploadApiUrl = `${environment.apiUrl}/api/v1/storage/upload`;

  /**
   * Sube un archivo a Azure Blob Storage a través del backend
   * @param file - Archivo a subir
   * @param directory - Directorio dentro del contenedor (ej: 'products', 'communities')
   * @returns Observable<UploadResult> con el path relativo del archivo
   *
   * @example
   * ```typescript
   * this.fileUploadService.uploadFile(file, 'products').subscribe(
   *   result => console.log('Archivo subido:', result.relativePath)
   * );
   * ```
   */
  uploadFile(file: File, directory: string): Observable<UploadResult> {
    // Generar nombre único para el archivo
    const fileExtension = this.getFileExtension(file.name);
    const uniqueFileName = this.generateUniqueFileName(fileExtension);

    // Renombrar el archivo con el nombre único
    // El backend concatenará: path + nombre_del_archivo_en_formdata
    // Si path="products" y file.name="1762796962258-nti3ijgo.jpg"
    // Resultado: products/1762796962258-nti3ijgo.jpg ✅
    const renamedFile = new File([file], uniqueFileName, { type: file.type });

    const formData = new FormData();
    formData.append('file', renamedFile);

    // Enviar SOLO el directorio (sin el nombre del archivo)
    // El backend concatenará: directory + "/" + renamedFile.name
    const params = new HttpParams().set('path', directory);

    return this.http.post<BackendUploadResponse>(this.uploadApiUrl, formData, { params }).pipe(
      map((response) => {
        // El backend devuelve la URL completa
        // Ejemplo: https://sapachamama001.blob.core.windows.net/admin-uploads/products%2F1762796962258.jpg
        // Extraemos: products/1762796962258.jpg (decodificado)
        const relativePath = this.extractRelativePath(response.url);

        return {
          relativePath,
          fileName: uniqueFileName,
          size: file.size,
        };
      }),
    );
  }

  /**
   * Valida el tamaño del archivo
   * @param file - Archivo a validar
   * @param maxSizeMB - Tamaño máximo en MB (default: 5MB)
   * @returns true si es válido
   * @throws Error si excede el tamaño
   */
  validateFileSize(file: File, maxSizeMB = 5): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new Error(`El archivo excede el tamaño máximo de ${maxSizeMB}MB`);
    }
    return true;
  }

  /**
   * Valida el tipo de archivo
   * @param file - Archivo a validar
   * @param allowedTypes - Tipos MIME permitidos
   * @returns true si es válido
   * @throws Error si el tipo no está permitido
   */
  validateFileType(file: File, allowedTypes: string[]): boolean {
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Tipo de archivo no permitido. Solo se permiten: ${allowedTypes.join(', ')}`);
    }
    return true;
  }

  /**
   * Genera un nombre único para el archivo usando timestamp y cadena aleatoria
   * @param extension - Extensión del archivo (ej: '.png')
   * @returns Nombre único (ej: '1731234567-a3b5c7d9.png')
   */
  private generateUniqueFileName(extension: string): string {
    const timestamp = Date.now();
    const randomStr = this.generateRandomString(8);
    return `${timestamp}-${randomStr}${extension}`;
  }

  /**
   * Genera una cadena aleatoria
   * @param length - Longitud de la cadena
   * @returns Cadena aleatoria (ej: 'a3b5c7d9')
   */
  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Obtiene la extensión del archivo
   * @param fileName - Nombre del archivo (ej: 'imagen.png')
   * @returns Extensión con punto (ej: '.png')
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.substring(lastDot);
  }

  /**
   * Extrae el nombre del archivo de un path
   * @param filePath - Path completo (ej: products/123-abc.png)
   * @returns Nombre del archivo (ej: 123-abc.png)
   */
  private extractFileName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Extrae el path relativo de una URL completa de Azure Blob Storage
   * @param url - URL completa (ej: https://sapachamama001.blob.core.windows.net/admin-uploads/products%2F1762741023058.jpg)
   * @returns Path relativo decodificado (ej: products/1762741023058.jpg)
   *
   * @example
   * Input:  "https://sapachamama001.blob.core.windows.net/admin-uploads/products%2F1762741023058.jpg"
   * Output: "products/1762741023058.jpg"
   */
  private extractRelativePath(url: string): string {
    try {
      const urlObj = new URL(url);
      // pathname: /admin-uploads/products%2F1762741023058.jpg
      const pathname = urlObj.pathname;

      // Remover el contenedor del inicio (/admin-uploads/)
      const pathWithoutContainer = pathname.replace(/^\/[^/]+\//, '');

      // Decodificar URL encoding (%2F → /)
      return decodeURIComponent(pathWithoutContainer);
    } catch (error) {
      console.error('Error parsing URL:', url, error);
      // Fallback: si no es URL válida, asumir que ya es path relativo
      return url;
    }
  }
}
