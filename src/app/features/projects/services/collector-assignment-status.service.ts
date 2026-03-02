import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  CollectorAssignmentStatusHistoryItem,
  UpdateCollectorAssignmentStatusRequest,
  UpdateCollectorAssignmentStatusResponse,
} from '../models/collector-assignment-status.model';

@Injectable({
  providedIn: 'root',
})
export class CollectorAssignmentStatusService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/admin/collector-assignment-status`;

  updateStatus(
    projectCommunityCollectorId: string,
    payload: UpdateCollectorAssignmentStatusRequest,
  ): Observable<UpdateCollectorAssignmentStatusResponse> {
    return this.http.patch<UpdateCollectorAssignmentStatusResponse>(
      `${this.apiUrl}/${projectCommunityCollectorId}/status`,
      payload,
    );
  }

  getHistory(
    projectCommunityCollectorId: string,
  ): Observable<CollectorAssignmentStatusHistoryItem[]> {
    return this.http.get<CollectorAssignmentStatusHistoryItem[]>(
      `${this.apiUrl}/${projectCommunityCollectorId}/history`,
    );
  }
}
