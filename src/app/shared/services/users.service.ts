import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateUserRequest, User } from '../models/create-user.dto';
import { UserDetails, UpdateUserRequest } from '../models/user-details.model';
import { environment } from '@environments/environment';

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
   * Elimina un usuario del sistema con opciones avanzadas
   * @param userId UUID del usuario
   * @param options Opciones de eliminación
   * @returns Observable void
   */
  deleteUser(
    userId: string,
    options?: { soft?: boolean; logical?: boolean; physicalFirebase?: boolean },
  ): Observable<void> {
    const params: Record<string, boolean> = {};
    if (options?.soft) params['soft'] = options.soft;
    if (options?.logical) params['logical'] = options.logical;
    if (options?.physicalFirebase) params['physicalFirebase'] = options.physicalFirebase;

    return this.http.delete<void>(`${this.apiUrl}${userId}`, { params });
  }

  /**
   * Verifica el email del usuario autenticado
   * @returns Observable void
   */
  verifyEmail(): Observable<void> {
    return this.http.get<void>(`${this.apiUrl}verify-email`);
  }

  /**
   * Marca la contraseña como cambiada para el usuario autenticado
   * @returns Observable void
   */
  markPasswordChanged(): Observable<void> {
    return this.http.get<void>(`${this.apiUrl}password-changed`);
  }

  /**
   * Obtiene los detalles completos de un usuario
   * @param userId UUID del usuario
   * @returns Observable con los detalles del usuario
   */
  getUserDetails(userId: string): Observable<UserDetails> {
    return this.http.get<UserDetails>(`${this.apiUrl}${userId}/details`);
  }

  /**
   * Actualiza los datos personales de un usuario
   * @param userId UUID del usuario
   * @param data Datos a actualizar
   * @returns Observable void
   */
  updateUser(userId: string, data: UpdateUserRequest): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}${userId}`, data);
  }

  /**
   * Actualiza el avatar de un usuario
   * @param userId UUID del usuario
   * @param avatarPath Ruta relativa del avatar en Azure Storage
   * @returns Observable void
   */
  updateAvatar(userId: string, avatarPath: string | null): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}${userId}/avatar`, {
      avatarUrl: avatarPath,
    });
  }
}
