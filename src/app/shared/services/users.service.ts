import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CreateUserRequest, User } from '../models/create-user.dto';
import { environment } from '@environments/environment';

/**
 * Respuesta paginada del API
 */
interface PaginatedResponse<T> {
  page: number;
  size: number;
  total: number;
  items: T[];
}

/**
 * Servicio para gestionar usuarios del sistema
 */
@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1/users/`;
  private readonly companiesUrl = `${environment.apiUrl}/api/v1/companies`;

  /**
   * Crea un nuevo usuario en el sistema
   * @param request Datos del usuario a crear
   * @returns Observable con el usuario creado
   */
  createUser(request: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}company`, request, {
      headers: { 'X-Company-Id': request.tenantId },
    });
  }

  /**
   * Obtiene los usuarios asociados a una empresa
   * @param companyId UUID de la empresa
   * @returns Observable con la lista de usuarios
   */
  getCompanyUsers(companyId: string): Observable<User[]> {
    return this.http
      .get<PaginatedResponse<User>>(`${this.companiesUrl}/${companyId}/users`)
      .pipe(map((response) => response.items));
  }

  /**
   * Elimina un usuario del sistema
   * @param userId UUID del usuario
   * @returns Observable void
   */
  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`);
  }
}
