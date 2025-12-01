import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

/**
 * Respuesta de la API de generación de invitación
 */
export interface ProjectInvitationResponse {
  qrCodeContent: string;
  onboardingCode: string;
  expiresAt: string;
}

/**
 * Servicio para gestionar invitaciones de onboarding por proyecto/comunidad
 */
@Injectable({
  providedIn: 'root',
})
export class ProjectInvitationsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/admin/projects`;

  /**
   * Genera una invitación de onboarding para un proyecto/comunidad
   * POST /api/v1/admin/projects/{projectId}/communities/{communityId}/invitations
   */
  generateInvitation(
    projectId: string,
    communityId: string,
  ): Observable<ProjectInvitationResponse> {
    return this.http.post<ProjectInvitationResponse>(
      `${this.apiUrl}/${projectId}/communities/${communityId}/invitations`,
      {},
    );
  }
}
