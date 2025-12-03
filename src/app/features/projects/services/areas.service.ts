import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  GeoJSONFeatureCollection,
  AreaImportResponse,
  AreaImportStatus,
} from '../models/area.model';

/**
 * Servicio para gestionar áreas y mapas de proyectos
 */
@Injectable({
  providedIn: 'root',
})
export class AreasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/projects`;

  /**
   * Obtiene las coordenadas actuales (GeoJSON) de un proyecto
   * @param projectId UUID del proyecto
   */
  getCurrentAreaGeoJSON(projectId: string): Observable<GeoJSONFeatureCollection> {
    return this.http.get<GeoJSONFeatureCollection>(
      `${this.apiUrl}/${projectId}/areas/current/geojson`,
    );
  }

  /**
   * Importa uno o más archivos de áreas para un proyecto
   * Soporta:
   * - ZIP/RAR con shapefiles o GeoJSON
   * - Múltiples archivos .shp + acompañantes (.dbf, .shx, .prj, etc.)
   * - Múltiples archivos .geojson/.json
   * - Combinaciones de los anteriores
   *
   * @param projectId UUID del proyecto
   * @param files Array de archivos a importar (o un solo archivo)
   * @param name Nombre descriptivo de la importación
   * @param source Fuente del mapa (ej: "GPS", "Satellite")
   */
  importAreaFiles(
    projectId: string,
    files: File | File[],
    name: string,
    source: string,
  ): Observable<AreaImportResponse> {
    const formData = new FormData();

    // Soportar tanto File único como File[]
    const fileArray = Array.isArray(files) ? files : [files];

    // Agregar cada archivo con el nombre 'files' (plural)
    fileArray.forEach((file) => {
      formData.append('files', file);
    });

    formData.append('name', name);
    formData.append('source', source);

    return this.http.post<AreaImportResponse>(
      `${this.apiUrl}/${projectId}/areas/import/multi`,
      formData,
    );
  }

  /**
   * Consulta el estado de una importación en progreso
   * @param projectId UUID del proyecto
   * @param importId UUID de la importación
   */
  getImportStatus(projectId: string, importId: string): Observable<AreaImportStatus> {
    return this.http.get<AreaImportStatus>(`${this.apiUrl}/${projectId}/areas/imports/${importId}`);
  }
}
