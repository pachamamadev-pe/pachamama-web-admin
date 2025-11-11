import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

/**
 * Respuesta del Azure Function SAS
 */
interface SasTokenResponse {
  url: string;
  expiresOn: string;
  permissions: string;
}

/**
 * Request para obtener SAS token
 */
interface SasTokenRequest {
  path: string;
  mode: 'read' | 'write';
  ttlMinutes: number;
}

/**
 * Entrada en caché con expiración
 */
interface CacheEntry {
  url: string;
  expiresOn: Date;
  observable?: Observable<string>;
}

/**
 * Servicio para gestionar archivos en Azure Storage
 *
 * Endpoints utilizados:
 * - Azure Function (directo): POST azureSasUrl - Obtener URL con SAS token
 * - Backend API: POST /api/v1/storage/delete - Eliminar archivos
 * - Backend API: POST /api/v1/storage/upload - Subir archivos (ver FileUploadService)
 *
 * Implementa caché inteligente para evitar solicitudes repetidas de SAS tokens
 */
@Injectable({
  providedIn: 'root',
})
export class AzureStorageService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly sasUrl = environment.azureSasUrl;

  // Caché de URLs con SAS token (key: path, value: CacheEntry)
  private cache = new Map<string, CacheEntry>();

  /**
   * Obtiene la URL con SAS token para un archivo en Azure Storage
   * Endpoint: Azure Function (directo) - POST azureSasUrl
   *
   * Implementa caché para evitar solicitudes innecesarias:
   * - Valida expiración (refresca si expira en < 1 minuto)
   * - Usa shareReplay para evitar requests duplicados simultáneos
   *
   * @param path - Path relativo del archivo (ej: products/1762741023058.jpg)
   * @param ttlMinutes - Tiempo de vida del token en minutos (default: 5)
   * @returns Observable<string> con la URL completa con SAS token
   *
   * @example
   * ```typescript
   * this.azureStorage.getFileUrl('products/abc123.jpg').subscribe(
   *   url => this.imageUrl = url
   * );
   * ```
   */
  getFileUrl(path: string, ttlMinutes = 5): Observable<string> {
    // Verificar si existe en caché y no ha expirado
    const cached = this.cache.get(path);
    if (cached) {
      const now = new Date();
      const expiresOn = cached.expiresOn;

      // Si expira en más de 1 minuto, usar caché
      const timeUntilExpiry = expiresOn.getTime() - now.getTime();
      const oneMinuteMs = 60 * 1000;

      if (timeUntilExpiry > oneMinuteMs) {
        // Si hay un observable en proceso, reutilizarlo (evita requests duplicados)
        if (cached.observable) {
          return cached.observable;
        }
        // Retornar URL cacheada
        return of(cached.url);
      }

      // Si está cerca de expirar o ya expiró, remover del caché
      this.cache.delete(path);
    }

    // Crear nuevo request
    const request: SasTokenRequest = {
      path,
      mode: 'read',
      ttlMinutes,
    };

    // Crear observable y cachearlo (shareReplay evita múltiples requests)
    // Skipear loading global para peticiones de SAS token (son rápidas y en background)
    const observable = this.http
      .post<SasTokenResponse>(this.sasUrl, request, {
        headers: { 'X-Skip-Loading': 'true' },
      })
      .pipe(
        map((response) => {
          // Guardar en caché
          this.cache.set(path, {
            url: response.url,
            expiresOn: new Date(response.expiresOn),
          });

          return response.url;
        }),
        shareReplay(1), // Compartir resultado entre múltiples suscriptores
      );

    // Guardar observable en caché temporal
    this.cache.set(path, {
      url: '',
      expiresOn: new Date(Date.now() + ttlMinutes * 60 * 1000),
      observable,
    });

    return observable;
  }

  /**
   * Elimina archivos de Azure Storage
   * Endpoint: POST /api/v1/storage/delete
   *
   * Body: ["https://sapachamama001.blob.core.windows.net/admin-uploads/products/file.jpg"]
   *
   * @param paths - Array de paths relativos a eliminar (ej: ["products/abc123.jpg"])
   * @returns Observable<void>
   *
   * @example
   * ```typescript
   * this.azureStorage.deleteFiles(['products/old-image.jpg']).subscribe({
   *   next: () => console.log('Files deleted'),
   *   error: (err) => console.error('Delete failed', err)
   * });
   * ```
   */
  deleteFiles(paths: string[]): Observable<void> {
    if (!paths || paths.length === 0) {
      return of(void 0);
    }

    // Construir URLs completas para el backend
    const fullUrls = paths.map((path) => `${environment.azureStorageBaseUrl}/${path}`);

    // Usar apiUrl base + ruta del controlador
    const deleteUrl = `${this.apiUrl}/api/v1/storage/delete`;

    return this.http
      .post<void>(deleteUrl, fullUrls, {
        headers: { 'X-Skip-Loading': 'true' }, // Skip loading global
      })
      .pipe(
        map(() => {
          // Limpiar caché de archivos eliminados
          paths.forEach((path) => this.cache.delete(path));
        }),
      );
  }

  /**
   * Limpia el caché completo
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Limpia una entrada específica del caché
   */
  clearCacheEntry(path: string): void {
    this.cache.delete(path);
  }
}
