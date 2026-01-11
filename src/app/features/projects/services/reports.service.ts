import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Service for generating and managing project reports
 */
@Injectable({ providedIn: 'root' })
export class ReportsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/reports`;

  /**
   * Generates PDF report for all project activities
   *
   * @param projectId - The project ID
   * @returns Observable with PDF file as Blob
   */
  generateProjectActivitiesPdf(projectId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/projects/${projectId}/activities/pdf`, {
      responseType: 'blob',
    });
  }
}
