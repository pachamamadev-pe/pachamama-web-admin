import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { catchError, of, switchMap } from 'rxjs';
import { ReportsService } from '../../services/reports.service';
import { ProjectDocumentsService } from '../../services/project-documents.service';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { NotificationService } from '@core/services/notification.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { EntityDocument } from '@shared/models/entity-document.model';

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
 */
@Component({
  selector: 'app-pmf-generation',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NgxExtendedPdfViewerModule,
    EmptyStateComponent,
  ],
  templateUrl: './pmf-generation.component.html',
  styleUrl: './pmf-generation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PmfGenerationComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private projectDocumentsService = inject(ProjectDocumentsService);
  private azureStorage = inject(AzureStorageService);
  private notification = inject(NotificationService);

  // Inputs
  projectId = input.required<string>();

  // State management
  state = signal<PmfState>('loading-existing');
  existingDocument = signal<EntityDocument | null>(null);
  pdfBlob = signal<Blob | null>(null);
  pdfUrl = signal<string>('');
  errorMessage = signal<string>('');

  // Computed state checks
  isLoadingExisting = computed(() => this.state() === 'loading-existing');
  isViewingExisting = computed(() => this.state() === 'viewing-existing');
  isInitial = computed(() => this.state() === 'initial');
  isGenerating = computed(() => this.state() === 'generating');
  isUploading = computed(() => this.state() === 'uploading');
  isReady = computed(() => this.state() === 'ready');
  isError = computed(() => this.state() === 'error');

  ngOnInit(): void {
    this.loadExistingPMF();
  }

  /**
   * Loads existing PMF document if available
   */
  private loadExistingPMF(): void {
    const projectId = this.projectId();
    if (!projectId) {
      this.state.set('error');
      this.errorMessage.set('ID de proyecto no disponible');
      return;
    }

    this.state.set('loading-existing');

    this.projectDocumentsService
      .getPMFDocument(projectId)
      .pipe(
        switchMap((document) => {
          // If document is null, show generate button
          if (!document) {
            this.state.set('initial');
            return of(null);
          }

          this.existingDocument.set(document);
          console.log(document);
          // Get Azure Storage URL and pass directly to viewer
          return this.azureStorage.getFileUrl(document.blobName);
        }),
        catchError((error) => {
          // 404 means no PMF document exists yet - this is OK
          if (error.status === 404) {
            this.state.set('initial');
            return of(null);
          }
          // Other errors are real errors
          console.error('Error loading existing PMF:', error);
          this.state.set('error');
          this.errorMessage.set('Error al cargar documento PMF existente');
          return of(null);
        }),
      )
      .subscribe({
        next: (url) => {
          if (url) {
            this.pdfUrl.set(url);
            this.state.set('viewing-existing');
          }
        },
      });
  }

  /**
   * Generates the PMF PDF document
   */
  generatePmf(): void {
    const projectId = this.projectId();
    if (!projectId) {
      this.notification.error('ID de proyecto no disponible');
      return;
    }

    this.state.set('generating');
    this.errorMessage.set('');

    this.reportsService
      .generateProjectActivitiesPdf(projectId)
      .pipe(
        switchMap((blob) => {
          this.pdfBlob.set(blob);
          this.state.set('uploading');

          // Upload the generated PDF to backend
          const filename = `PMF-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;
          return this.projectDocumentsService.uploadOrResubmitPMF(projectId, blob, filename);
        }),
        switchMap((document) => {
          this.existingDocument.set(document);
          // Get Azure Storage URL and pass directly to viewer
          return this.azureStorage.getFileUrl(document.blobName);
        }),
        catchError((error) => {
          console.error('Error in PMF generation/upload flow:', error);
          this.state.set('error');
          this.errorMessage.set(
            'Error al generar o subir el Plan de Manejo Forestal. Por favor, intente nuevamente.',
          );
          this.notification.error('Error al procesar el documento PMF');
          return of(null);
        }),
      )
      .subscribe({
        next: (url) => {
          if (url) {
            this.pdfUrl.set(url);
            this.state.set('ready');
            this.notification.success('Plan de Manejo Forestal generado y guardado correctamente');
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
    const pmfDocument = this.existingDocument();
    if (!pmfDocument) {
      this.notification.error('No hay documento disponible para descargar');
      return;
    }

    // Get Azure URL directly for download (downloads don't have CORS issues)
    this.azureStorage.getFileUrl(pmfDocument.blobName).subscribe({
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
