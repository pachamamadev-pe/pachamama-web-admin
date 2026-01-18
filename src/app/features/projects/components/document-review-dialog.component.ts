import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
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
  approvalNotes = signal(''); // Notas para aprobar (ahora obligatorias)
  approvalAttachment = signal<File | null>(null);
  observationNotes = signal('');
  observationAttachment = signal<File | null>(null);
  rejectionNotes = signal('');
  rejectionAttachment = signal<File | null>(null);
  processing = signal(false);
  showApproveForm = signal(false);
  showObserveForm = signal(false);
  showRejectForm = signal(false);

  /**
   * Verifica si el documento ya está aprobado (solo lectura)
   */
  isDocumentApproved = computed(() => this.data.document.validationStatus === 'approved');

  /**
   * Verifica si el tipo de documento requiere adjunto de validación
   */
  get requiresValidationAttachment(): boolean {
    return this.data.document.documentType.requiresValidationAttachment || false;
  }

  /**
   * Obtiene los tipos MIME permitidos
   */
  get allowedMimeTypes(): string {
    return this.data.document.documentType.validationAttachmentMimeTypes?.join(',') || '*';
  }

  /**
   * Obtiene el tamaño máximo en MB
   */
  get maxSizeMb(): number {
    return this.data.document.documentType.validationAttachmentMaxSizeMb || 10;
  }

  /**
   * Maneja la selección de archivo para aprobación
   */
  onApprovalFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validar tamaño
      const maxSizeBytes = this.maxSizeMb * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        this.notification.error(`El archivo no debe superar ${this.maxSizeMb}MB`);
        return;
      }

      this.approvalAttachment.set(file);
    }
  }

  /**
   * Maneja la selección de archivo para observación
   */
  onObservationFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const maxSizeBytes = this.maxSizeMb * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        this.notification.error(`El archivo no debe superar ${this.maxSizeMb}MB`);
        return;
      }

      this.observationAttachment.set(file);
    }
  }

  /**
   * Maneja la selección de archivo para rechazo
   */
  onRejectionFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const maxSizeBytes = this.maxSizeMb * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        this.notification.error(`El archivo no debe superar ${this.maxSizeMb}MB`);
        return;
      }

      this.rejectionAttachment.set(file);
    }
  }

  /**
   * Muestra el formulario de aprobación
   */
  toggleApproveForm(): void {
    this.showApproveForm.update((v) => !v);
    this.showObserveForm.set(false);
    this.showRejectForm.set(false);
  }

  /**
   * Aprueba el documento
   */
  approve(): void {
    const notes = this.approvalNotes().trim();

    // Validar notas obligatorias
    if (!notes) {
      this.notification.error('Las notas de validación son obligatorias');
      return;
    }

    this.processing.set(true);
    this.projectDocumentsService
      .approveDocument(this.data.document.id, notes, this.approvalAttachment() || undefined)
      .subscribe({
        next: () => {
          this.notification.success('Documento aprobado correctamente');
          this.dialogRef.close({ action: 'approved' });
        },
        error: (error) => {
          console.error('Error approving document:', error);
          this.processing.set(false);
        },
      });
  }

  /**
   * Observa el documento
   */
  observe(): void {
    const notes = this.observationNotes().trim();

    // Validar notas obligatorias
    if (!notes) {
      this.notification.error('Las notas de observación son obligatorias');
      return;
    }

    this.processing.set(true);
    this.projectDocumentsService
      .observeDocument(this.data.document.id, notes, this.observationAttachment() || undefined)
      .subscribe({
        next: () => {
          this.notification.success('Documento observado correctamente');
          this.dialogRef.close({ action: 'observed' });
        },
        error: (error) => {
          console.error('Error observing document:', error);
          this.processing.set(false);
        },
      });
  }

  /**
   * Rechaza el documento
   */
  reject(): void {
    const notes = this.rejectionNotes().trim();

    // Validar notas obligatorias
    if (!notes) {
      this.notification.error('Las notas de rechazo son obligatorias');
      return;
    }

    this.processing.set(true);
    this.projectDocumentsService
      .rejectDocument(this.data.document.id, notes, this.rejectionAttachment() || undefined)
      .subscribe({
        next: () => {
          this.notification.success('Documento rechazado');
          this.dialogRef.close({ action: 'rejected' });
        },
        error: (error) => {
          console.error('Error rejecting document:', error);
          this.processing.set(false);
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
   * Descarga el archivo adjunto de validación
   */
  downloadValidationAttachment(): void {
    if (this.data.document.validationAttachmentUrl == null) {
      this.notification.error('No hay archivo adjunto de validación disponible');
      return;
    }
    this.azureStorage.getFileUrl(this.data.document.validationAttachmentUrl).subscribe({
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
