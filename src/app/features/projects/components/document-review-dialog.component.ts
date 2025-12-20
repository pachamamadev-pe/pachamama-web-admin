import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { NotificationService } from '@core/services/notification.service';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { ProjectDocumentsService } from '../services/project-documents.service';
import { ProjectDocument } from '../models/project-document.model';

export interface DocumentReviewDialogData {
  document: ProjectDocument;
}

/**
 * Dialog para revisar un documento (aprobar/observar/rechazar)
 */
@Component({
  selector: 'app-document-review-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatDividerModule,
  ],
  templateUrl: './document-review-dialog.component.html',
  styleUrl: './document-review-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentReviewDialogComponent {
  private dialogRef = inject(MatDialogRef<DocumentReviewDialogComponent>);
  private projectDocumentsService = inject(ProjectDocumentsService);
  private azureStorage = inject(AzureStorageService);
  private notification = inject(NotificationService);
  data = inject<DocumentReviewDialogData>(MAT_DIALOG_DATA);

  // Estado
  observationNotes = signal('');
  rejectionNotes = signal('');
  processing = signal(false);
  showObserveForm = signal(false);
  showRejectForm = signal(false);

  /**
   * Aprueba el documento
   */
  approve(): void {
    this.processing.set(true);
    this.projectDocumentsService.approveDocument(this.data.document.id).subscribe({
      next: () => {
        this.notification.success('Documento aprobado correctamente');
        this.dialogRef.close({ action: 'approved' });
      },
      error: (error) => {
        console.error('Error approving document:', error);
        this.processing.set(false);
        // Error manejado por interceptor
      },
    });
  }

  /**
   * Observa el documento
   */
  observe(): void {
    this.processing.set(true);
    const notes = this.observationNotes().trim();

    this.projectDocumentsService
      .observeDocument(this.data.document.id, notes || undefined)
      .subscribe({
        next: () => {
          this.notification.success('Documento observado correctamente');
          this.dialogRef.close({ action: 'observed' });
        },
        error: (error) => {
          console.error('Error observing document:', error);
          this.processing.set(false);
          // Error manejado por interceptor
        },
      });
  }

  /**
   * Rechaza el documento
   */
  reject(): void {
    this.processing.set(true);
    const notes = this.rejectionNotes().trim();

    this.projectDocumentsService
      .rejectDocument(this.data.document.id, notes || undefined)
      .subscribe({
        next: () => {
          this.notification.success('Documento rechazado');
          this.dialogRef.close({ action: 'rejected' });
        },
        error: (error) => {
          console.error('Error rejecting document:', error);
          this.processing.set(false);
          // Error manejado por interceptor
        },
      });
  }

  /**
   * Muestra el formulario de observación
   */
  toggleObserveForm(): void {
    this.showObserveForm.update((v) => !v);
    this.showRejectForm.set(false);
  }

  /**
   * Muestra el formulario de rechazo
   */
  toggleRejectForm(): void {
    this.showRejectForm.update((v) => !v);
    this.showObserveForm.set(false);
  }

  /**
   * Descarga el documento
   */
  downloadDocument(): void {
    this.azureStorage.getFileUrl(this.data.document.blobName).subscribe({
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
   * Muestra el documento en una nueva pestaña
   */
  viewDocument(): void {
    this.azureStorage.getFileUrl(this.data.document.blobName).subscribe({
      next: (url) => {
        window.open(url, '_blank');
      },
      error: (error) => {
        console.error('Error getting view URL:', error);
        this.notification.error('Error al obtener URL de vista previa');
      },
    });
  }

  /**
   * Formatea la fecha
   */
  formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Formatea el tamaño del archivo
   */
  formatFileSize(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  /**
   * Cierra el dialog
   */
  close(): void {
    this.dialogRef.close();
  }
}
