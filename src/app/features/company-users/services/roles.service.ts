import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { Role } from '../models/role.model';

/**
 * Servicio para gestionar roles del sistema
 */
@Injectable({
  providedIn: 'root',
})
export class RolesService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1/roles`;

  /**
   * Obtiene todos los roles de sistema disponibles
   * Excluye ADMIN_PACHAMAMA para que no pueda ser asignado
   * @returns Observable con la lista de roles
   */
  getSystemRoles(): Observable<Role[]> {
    return this.http
      .get<Role[]>(this.apiUrl)
      .pipe(map((roles) => roles.filter((role) => role.code !== 'ADMIN_PACHAMAMA')));
  }
}
