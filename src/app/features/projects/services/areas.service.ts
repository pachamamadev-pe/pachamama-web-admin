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
   * Importa un shapefile (.zip) para un proyecto
   * @param projectId UUID del proyecto
   * @param file Archivo .zip con el shapefile
   * @param name Nombre descriptivo de la importación
   * @param source Fuente del mapa (ej: "GPS")
   */
  importAreaShapefile(
    projectId: string,
    file: File,
    name: string,
    source: string,
  ): Observable<AreaImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('source', source);

    return this.http.post<AreaImportResponse>(`${this.apiUrl}/${projectId}/areas/import`, formData);
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
