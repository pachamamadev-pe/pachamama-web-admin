import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { catchError, of, switchMap, tap } from 'rxjs';
import { ReportsService, ReportExistsResponse } from '../../services/reports.service';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { NotificationService } from '@core/services/notification.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import {
  ReportMetadataDialogComponent,
  ReportMetadata,
} from '../report-metadata-dialog/report-metadata-dialog.component';

type PmfState =
  | 'loading-existing'
  | 'viewing-existing'
  | 'initial'
  | 'generating'
  | 'uploading'
  | 'ready'
  | 'error';

/**
 * Component for generating and viewing PMF (Plan de Manejo Forestal) documents
 * Uses lazy loading: only loads existing PMF when shouldLoad input becomes true
 */
@Component({
  selector: 'app-pmf-generation',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    NgxExtendedPdfViewerModule,
    EmptyStateComponent,
  ],
  templateUrl: './pmf-generation.component.html',
  styleUrl: './pmf-generation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PmfGenerationComponent {
  private reportsService = inject(ReportsService);
  private azureStorage = inject(AzureStorageService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);

  // Inputs
  projectId = input.required<string>();
  shouldLoad = input(false); // Lazy loading trigger
  currentStage = input<string>(''); // Stage actual del proyecto

  // Outputs
  reportGenerated = output<void>();
  stageAdvanced = output<void>(); // Emite cuando se debe avanzar a serfor_evaluation

  // State management
  state = signal<PmfState>('initial');
  existingReportMetadata = signal<ReportExistsResponse | null>(null);
  pdfBlob = signal<Blob | null>(null);
  pdfUrl = signal<string>('');
  errorMessage = signal<string>('');
  private hasLoaded = signal(false);

  // Computed state checks
  isLoadingExisting = computed(() => this.state() === 'loading-existing');
  isViewingExisting = computed(() => this.state() === 'viewing-existing');
  isInitial = computed(() => this.state() === 'initial');
  isGenerating = computed(() => this.state() === 'generating');
  isUploading = computed(() => this.state() === 'uploading');
  isReady = computed(() => this.state() === 'ready');
  isError = computed(() => this.state() === 'error');
  canRegeneratePMF = computed(() => this.currentStage() === 'pmf_development');

  constructor() {
    // Load existing PMF when shouldLoad becomes true (only once)
    effect(() => {
      if (this.shouldLoad() && !this.hasLoaded()) {
        this.hasLoaded.set(true);
        this.loadExistingPMF();
      }
    });
  }

  /**
   * Loads existing PMF document if available
   * Checks if a report exists and uses pdfBlobUrl to get SAS token
   */
  private loadExistingPMF(): void {
    const projectId = this.projectId();
    if (!projectId) {
      this.state.set('error');
      this.errorMessage.set('ID de proyecto no disponible');
      return;
    }

    this.state.set('loading-existing');

    // Check if report exists using new endpoint
    this.reportsService
      .checkReportExists(projectId)
      .pipe(
        tap((reportMetadata) => {
          // Store metadata for potential preloading in dialog
          this.existingReportMetadata.set(reportMetadata);
          console.log('Report exists:', reportMetadata);
        }),
        switchMap((reportMetadata) => {
          // Check if the report is certified (has pdfBlobUrl)
          if (!reportMetadata.pdfBlobUrl) {
            // Report exists but is not certified yet
            this.state.set('initial');
            this.errorMessage.set(
              'El reporte no está certificado. Por favor, genere un nuevo reporte certificado.',
            );
            return of(null);
          }

          // Get Azure Storage URL using SAS token from pdfBlobUrl
          return this.azureStorage.getFileUrl(reportMetadata.pdfBlobUrl);
        }),
        catchError((error) => {
          // 404 means no report exists yet - this is expected, not an error
          if (error.status === 404) {
            this.existingReportMetadata.set(null);
            this.state.set('initial');
            // Silently continue - no error message needed
            return of(null);
          }
          // Only log and show errors for actual problems (5xx, network errors, etc.)
          console.error('Error loading existing PMF:', error);
          this.state.set('error');
          this.errorMessage.set('Error al cargar documento PMF existente');
          return of(null);
        }),
      )
      .subscribe({
        next: (url) => {
          console.log('PDF URL received:', url);
          console.log('Current state:', this.state());
          console.log('Existing metadata:', this.existingReportMetadata());
          if (url) {
            this.pdfUrl.set(url);
            this.state.set('viewing-existing');
            console.log('State set to viewing-existing');
          }
        },
      });
  }

  /**
   * First opens a dialog to collect metadata, then generates the report
   * Preloads metadata if a report already exists
   */
  generatePmf(): void {
    const projectId = this.projectId();
    if (!projectId) {
      this.notification.error('ID de proyecto no disponible');
      return;
    }

    // Get existing metadata to preload in dialog
    const existingMetadata = this.existingReportMetadata();

    // Abrir diálogo para capturar metadatos (con precarga si existe)
    const dialogRef = this.dialog.open(ReportMetadataDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: true,
      data: existingMetadata
        ? {
            objetivo: existingMetadata.objetivo || '',
            finalidad: existingMetadata.finalidad || '',
            baseLegal: existingMetadata.baseLegal || '',
            alcance: existingMetadata.alcance || '',
            generalidades: existingMetadata.generalidades || '',
            lineamientos: existingMetadata.lineamientos || '',
          }
        : null,
    });

    dialogRef.afterClosed().subscribe((metadata: ReportMetadata | null) => {
      // Si el usuario cancela, no generar reporte
      if (!metadata) {
        return;
      }

      // Generar el reporte certificado con los metadatos
      this.generateReportWithMetadata(projectId, metadata);
    });
  }

  /**
   * Generates the certified report with provided metadata
   * The backend handles PDF generation and upload to Azure Storage
   * After generation, reloads the report metadata to get complete info
   */
  private generateReportWithMetadata(projectId: string, metadata: ReportMetadata): void {
    this.state.set('generating');
    this.errorMessage.set('');

    this.reportsService
      .generateCertifiedReport(projectId, metadata)
      .pipe(
        tap((certificate) => {
          console.log('Certified report generated:', certificate);
          this.notification.success(
            `Reporte certificado generado exitosamente. Código: ${certificate.certificateCode}`,
          );
        }),
        switchMap(() => {
          // After generating, reload the report metadata to get complete info including pdfBlobUrl
          this.state.set('uploading'); // Reusing state for "loading metadata"
          return this.reportsService.checkReportExists(projectId);
        }),
        tap((reportMetadata) => {
          // Store complete metadata
          this.existingReportMetadata.set(reportMetadata);
          console.log('Report metadata reloaded:', reportMetadata);
        }),
        switchMap((reportMetadata) => {
          // Get Azure Storage URL using SAS token from pdfBlobUrl
          if (!reportMetadata.pdfBlobUrl) {
            throw new Error('pdfBlobUrl not found in report metadata');
          }
          return this.azureStorage.getFileUrl(reportMetadata.pdfBlobUrl);
        }),
        catchError((error) => {
          console.error('Error in certified report generation:', error);
          this.state.set('error');
          this.errorMessage.set(
            'Error al generar el Plan de Manejo Forestal certificado. Por favor, intente nuevamente.',
          );
          this.notification.error('Error al generar reporte certificado');
          return of(null);
        }),
      )
      .subscribe({
        next: (url) => {
          if (url) {
            // Set PDF URL for viewer
            this.pdfUrl.set(url);
            console.log('PDF URL set:', url);
            console.log('Existing metadata:', this.existingReportMetadata());

            // Show PDF viewer with the newly generated report
            this.state.set('viewing-existing');
            console.log('State set to viewing-existing');

            // Notify parent component to reload documents
            this.reportGenerated.emit();

            // Si estamos en pmf_development, avanzar a serfor_evaluation
            if (this.currentStage() === 'pmf_development') {
              this.stageAdvanced.emit();
            }
          }
        },
      });
  }

  /**
   * Retries PMF generation after an error
   */
  retry(): void {
    this.generatePmf();
  }

  /**
   * Downloads the generated PDF
   */
  downloadPdf(): void {
    const reportMetadata = this.existingReportMetadata();
    if (!reportMetadata || !reportMetadata.pdfBlobUrl) {
      this.notification.error('No hay documento disponible para descargar');
      return;
    }

    // Get Azure URL directly for download (downloads don't have CORS issues)
    this.azureStorage.getFileUrl(reportMetadata.pdfBlobUrl).subscribe({
      next: (azureUrl) => {
        const projectId = this.projectId();
        const filename = `PMF-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

        // Create temporary link to download from Azure URL
        const link = window.document.createElement('a');
        link.href = azureUrl;
        link.download = filename;
        link.target = '_blank';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);

        this.notification.success('Documento descargado correctamente');
      },
      error: (error) => {
        console.error('Error getting download URL:', error);
        this.notification.error('Error al obtener URL de descarga');
      },
    });
  }

  /**
   * Formats file size in MB
   */
  formatFileSize(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  /**
   * Formats date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
