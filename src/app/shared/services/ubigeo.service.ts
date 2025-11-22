import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import type { Department, Province, District } from '@shared/models/ubigeo.model';

/**
 * Servicio para gestionar ubigeos (departamentos, provincias, distritos) del Perú
 */
@Injectable({
  providedIn: 'root',
})
export class UbigeoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/ubigeo`;

  /**
   * Obtiene todos los departamentos con sus provincias y distritos
   */
  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.apiUrl}/departments`);
  }

  /**
   * Obtiene las provincias de un departamento específico
   * @param departmentCode Código del departamento (ej: "01")
   */
  getProvinces(departmentCode: string): Observable<Province[]> {
    return this.http.get<Province[]>(`${this.apiUrl}/departments/${departmentCode}/provinces`);
  }

  /**
   * Obtiene los distritos de una provincia específica
   * @param provinceCode Código de la provincia (ej: "0101")
   */
  getDistricts(provinceCode: string): Observable<District[]> {
    return this.http.get<District[]>(`${this.apiUrl}/provinces/${provinceCode}/districts`);
  }
}
