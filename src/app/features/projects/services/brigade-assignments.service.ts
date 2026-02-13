import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  BrigadeAssignment,
  CreateBrigadeAssignmentRequest,
  CompleteBrigadeAssignmentRequest,
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

  /**
   * Activa o inactiva un recolector en una asignación de brigada
   * @param assignmentId - ID de la asignación
   * @param status - Estado: 'active' o 'inactive'
   */
  toggleAssignmentStatus(
    assignmentId: string,
    status: 'active' | 'inactive',
  ): Observable<BrigadeAssignment> {
    return this.http.patch<BrigadeAssignment>(
      `${this.apiUrl}/${assignmentId}/toggle-status?status=${status}`,
      {},
    );
  }

  /**
   * Obtiene el historial de asignaciones de un recolector
   */
  getCollectorHistory(collectorId: string): Observable<BrigadeAssignment[]> {
    return this.http.get<BrigadeAssignment[]>(`${this.apiUrl}/collector/${collectorId}/history`);
  }

  /**
   * Finaliza una asignacion antes de su fecha fin
   */
  completeAssignment(
    assignmentId: string,
    data: CompleteBrigadeAssignmentRequest,
  ): Observable<BrigadeAssignment> {
    return this.http.patch<BrigadeAssignment>(`${this.apiUrl}/${assignmentId}/complete`, data);
  }
}
