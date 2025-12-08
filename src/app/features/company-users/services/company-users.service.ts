import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  CompanyUser,
  CompanyUsersPageResponse,
  CreateCompanyUserRequest,
  UpdateCompanyUserRequest,
} from '../models/company-user.model';
import { AssignRoleRequest } from '../models/role.model';

/**
 * Servicio para gestionar usuarios de empresa
 */
@Injectable({
  providedIn: 'root',
})
export class CompanyUsersService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1/companies`;

  /**
   * Obtiene los usuarios de una empresa con paginación
   * @param companyId UUID de la empresa
   * @param page Número de página (0-indexed)
   * @param size Tamaño de página
   * @returns Observable con la respuesta paginada
   */
  getUsers(companyId: string, page = 0, size = 10): Observable<CompanyUsersPageResponse> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    return this.http.get<CompanyUsersPageResponse>(`${this.apiUrl}/${companyId}/users`, {
      params,
    });
  }

  /**
   * Crea un nuevo usuario en una empresa
   * @param companyId UUID de la empresa
   * @param data Datos del usuario a crear
   * @returns Observable con el usuario creado
   */
  createUser(companyId: string, data: CreateCompanyUserRequest): Observable<CompanyUser> {
    return this.http.post<CompanyUser>(`${this.apiUrl}/${companyId}/users`, data);
  }

  /**
   * Actualiza los datos de un usuario de empresa
   * No permite cambiar email ni rol
   * @param companyId UUID de la empresa
   * @param userId UUID del usuario
   * @param data Datos a actualizar
   * @returns Observable con el usuario actualizado
   */
  updateUser(
    companyId: string,
    userId: string,
    data: UpdateCompanyUserRequest,
  ): Observable<CompanyUser> {
    return this.http.put<CompanyUser>(`${this.apiUrl}/${companyId}/users/${userId}`, data);
  }

  /**
   * Desactiva un usuario de la empresa
   * @param companyId UUID de la empresa
   * @param userId UUID del usuario
   * @returns Observable void
   */
  deleteUser(companyId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${companyId}/users/${userId}`);
  }

  /**
   * Asigna o cambia el rol de un usuario
   * @param companyId UUID de la empresa
   * @param userId UUID del usuario
   * @param roleCode Código del nuevo rol
   * @returns Observable void
   */
  assignRole(companyId: string, userId: string, roleCode: string): Observable<void> {
    const request: AssignRoleRequest = { roleCode };
    return this.http.post<void>(`${this.apiUrl}/${companyId}/users/${userId}/roles`, request);
  }
}
