import {
  ChangeDetectionStrategy,
  Component,
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
import { ProjectDocumentsService } from '../services/project-documents.service';
import { NotificationService } from '@core/services/notification.service';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { PmHasPermissionDirective } from '@core/directives/pm-has-permission.directive';
import { PERMISSIONS } from '@core/auth/permissions';
import { DocumentRequirements, ProjectDocument } from '../models/project-document.model';
import { DocumentsProgressCardComponent } from '../components/documents-progress-card.component';
import { DocumentsTableComponent } from '../components/documents-table.component';

@Component({
  selector: 'app-documents-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PmHasPermissionDirective,
    DocumentsProgressCardComponent,
    DocumentsTableComponent,
  ],
  template: `
    <div class="documents-container">
      @if (loading()) {
        <!-- Loading State -->
        <div class="loading-container">
          <mat-spinner diameter="48" />
          <p class="text-body text-neutral-subheading mt-4">Cargando documentos...</p>
        </div>
      } @else {
        <!-- Progress Card -->
        <app-documents-progress-card
          [requirements]="documentRequirements()"
          [documents]="documents()"
        />

        <!-- Header con botón de subir -->
        <div class="documents-header">
          <h2 class="text-body font-bold text-accent-titles">Documentos del Proyecto</h2>
          <button
            *appPmHasPermission="PERMISSIONS.DOCUMENT.UPLOAD"
            mat-raised-button
            class="btn-primary"
            (click)="onUploadDocument()"
            [disabled]="loadingRequirements()"
          >
            <mat-icon>upload_file</mat-icon>
            <span class="upload-text-desktop">Subir Documentos</span>
            <span class="upload-text-mobile">Subir</span>
          </button>
        </div>

        <!-- Tabla de Documentos -->
        <app-documents-table
          [documents]="documents()"
          [canReview]="true"
          [loading]="loadingDocuments()"
          (reviewDocument)="onReviewDocument($event)"
          (resubmitDocument)="onResubmitDocument($event)"
          (downloadDocument)="onDownloadDocument($event)"
        />
      }
    </div>
  `,
  styles: `
    .documents-container {
      padding: 1rem;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
    }

    .documents-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      margin-top: 1.5rem;
    }

    .btn-primary {
      background-color: #218358;
      color: white;
    }

    .btn-primary mat-icon {
      margin-right: 4px;
    }

    /* Mostrar texto completo solo en desktop */
    .upload-text-desktop {
      display: none;
    }

    @media (min-width: 640px) {
      .upload-text-desktop {
        display: inline;
      }

      .upload-text-mobile {
        display: none;
      }
    }

    /* Mostrar texto corto solo en mobile */
    .upload-text-mobile {
      display: inline;
    }

    @media (min-width: 640px) {
      .upload-text-mobile {
        display: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsTabComponent {
  private projectDocumentsService = inject(ProjectDocumentsService);
  private notification = inject(NotificationService);
  private azureStorage = inject(AzureStorageService);

  protected readonly PERMISSIONS = PERMISSIONS;

  // Inputs
  projectId = input.required<string>();
  shouldLoad = input(false); // Lazy loading trigger

  // Outputs
  uploadDocument = output<void>();
  reviewDocument = output<ProjectDocument>();
  resubmitDocument = output<ProjectDocument>();
  requirementsLoaded = output<DocumentRequirements>(); // Nuevo: emitir cuando se cargan los requirements

  // State
  documents = signal<ProjectDocument[]>([]);
  documentRequirements = signal<DocumentRequirements | null>(null);
  loading = signal(false);
  loadingDocuments = signal(false);
  loadingRequirements = signal(false);
  private hasLoaded = signal(false);

  constructor() {
    // Load documents when shouldLoad becomes true (only once)
    effect(() => {
      if (this.shouldLoad() && !this.hasLoaded()) {
        this.hasLoaded.set(true);
        this.loadData();
      }
    });
  }

  private loadData(): void {
    this.loading.set(true);
    const projectId = this.projectId();

    // Load requirements and documents in parallel
    this.loadDocumentRequirements(projectId);
    this.loadDocuments(projectId);
  }

  private loadDocumentRequirements(projectId: string): void {
    this.loadingRequirements.set(true);
    this.projectDocumentsService.getDocumentRequirements(projectId).subscribe({
      next: (requirements) => {
        this.documentRequirements.set(requirements);
        this.requirementsLoaded.emit(requirements); // Emitir al parent
        this.loadingRequirements.set(false);
        this.checkLoadingComplete();
      },
      error: (error) => {
        console.error('Error loading document requirements:', error);
        this.documentRequirements.set(null);
        this.loadingRequirements.set(false);
        this.checkLoadingComplete();
      },
    });
  }

  private loadDocuments(projectId: string): void {
    this.loadingDocuments.set(true);
    this.projectDocumentsService.getDocuments(projectId).subscribe({
      next: (documents) => {
        this.documents.set(documents);
        this.loadingDocuments.set(false);
        this.checkLoadingComplete();
      },
      error: (error) => {
        console.error('Error loading documents:', error);
        this.documents.set([]);
        this.loadingDocuments.set(false);
        this.checkLoadingComplete();
      },
    });
  }

  private checkLoadingComplete(): void {
    if (!this.loadingRequirements() && !this.loadingDocuments()) {
      this.loading.set(false);
    }
  }

  onUploadDocument(): void {
    this.uploadDocument.emit();
  }

  onReviewDocument(document: ProjectDocument): void {
    this.reviewDocument.emit(document);
  }

  onResubmitDocument(document: ProjectDocument): void {
    this.resubmitDocument.emit(document);
  }

  onDownloadDocument(document: ProjectDocument): void {
    // Handle download directly
    this.azureStorage.getFileUrl(document.blobName).subscribe({
      next: (url) => {
        window.open(url, '_blank');
      },
      error: (error) => {
        console.error('Error getting download URL:', error);
        this.notification.error('Error al obtener URL de descarga');
      },
    });
  }

  /**
   * Método público para recargar datos (llamado desde el parent cuando se sube/actualiza un documento)
   */
  reload(): void {
    this.loadData();
  }
}
