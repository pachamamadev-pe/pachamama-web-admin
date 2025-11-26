import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  BrigadeAssignment,
  CreateBrigadeAssignmentRequest,
  ReassignBrigadeRequest,
} from '../models/brigade-assignment.model';

/**
 * Servicio para gestionar asignaciones de brigadas a recolectores
 */
@Injectable({
  providedIn: 'root',
})
export class BrigadeAssignmentsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/brigade-assignments`;

  /**
   * Asigna un recolector a una brigada
   */
  createBrigadeAssignment(data: CreateBrigadeAssignmentRequest): Observable<BrigadeAssignment> {
    return this.http.post<BrigadeAssignment>(this.apiUrl, data);
  }

  /**
   * Reasigna un recolector a una nueva brigada
   */
  reassignBrigade(data: ReassignBrigadeRequest): Observable<BrigadeAssignment> {
    return this.http.post<BrigadeAssignment>(`${this.apiUrl}/reassign`, data);
  }
}
