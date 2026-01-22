import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ReportMetadataRequest {
  objetivo?: string;
  finalidad?: string;
  baseLegal?: string;
  alcance?: string;
  generalidades?: string;
  lineamientos?: string;
}

/**
 * Response from checking if a report exists for a project
 */
export interface ReportExistsResponse {
  id: string;
  projectId: string;
  certificateId: string | null;
  documentId?: string;
  documentVersion?: number;
  documentUpdatedAt?: string;
  pdfBlobPath?: string;
  pdfBlobUrl?: string;
  objetivo?: string;
  finalidad?: string;
  baseLegal?: string;
  alcance?: string;
  generalidades?: string;
  lineamientos?: string;
  totalActivities: number;
  totalPhotos: number;
  reportFileSizeBytes: number;
  createdAt?: string;
  createdBy?: string;
  versionNumber: number;
  fileSizeFormatted?: string;
}

/**
 * Response from generating a certified report
 */
export interface CertifiedReportResponse {
  certificateId: string;
  certificateCode: string;
  pdfDownloadUrl: string;
  verificationUrl: string;
  pdfContentHash: string;
  generatedAt: string;
  activityCount: number;
  photoCount: number;
}

/**
 * Service for generating and managing project reports
 */
@Injectable({ providedIn: 'root' })
export class ReportsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/reports`;

  /**
   * Checks if a report exists for the given project
   * Returns metadata of the most recent report if it exists
   *
   * @param projectId - The project ID
   * @returns Observable with report metadata or 404 if not found
   */
  checkReportExists(projectId: string): Observable<ReportExistsResponse> {
    return this.http.get<ReportExistsResponse>(`${this.apiUrl}/projects/${projectId}/exists`);
  }

  /**
   * Generates a certified PDF report for all project activities
   * The PDF is automatically uploaded to Azure Storage by the backend
   *
   * @param projectId - The project ID
   * @param metadata - Report metadata (objetivo, finalidad, etc.)
   * @returns Observable with certificate information and download URL
   */
  generateCertifiedReport(
    projectId: string,
    metadata: ReportMetadataRequest,
  ): Observable<CertifiedReportResponse> {
    return this.http.post<CertifiedReportResponse>(
      `${this.apiUrl}/projects/${projectId}/activities/pdf/certified`,
      metadata,
    );
  }

  /**
   * Generates PDF report for all project activities with metadata
   * @deprecated Use generateCertifiedReport instead for official reports
   *
   * @param projectId - The project ID
   * @param metadata - Optional metadata for the report (objetivo, finalidad, etc.)
   * @returns Observable with PDF file as Blob
   */
  generateProjectActivitiesPdf(
    projectId: string,
    metadata?: ReportMetadataRequest,
  ): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/projects/${projectId}/activities/pdf`, metadata || {}, {
      responseType: 'blob',
    });
  }

  /**
   * Generates a report of all products in the specified format (PDF or XLSX)
   *
   * @param format - Report format: 'pdf' or 'xlsx' (default: 'pdf')
   * @param searchQuery - Optional search filter
   * @returns Observable with file as Blob
   */
  generateProductsReport(format: 'pdf' | 'xlsx' = 'pdf', searchQuery?: string): Observable<Blob> {
    const params: { format: string; q?: string } = { format };
    if (searchQuery) {
      params.q = searchQuery;
    }

    return this.http.get(`${this.apiUrl}/products`, {
      params,
      responseType: 'blob',
    });
  }
}
