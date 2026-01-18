import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { NotificationService } from '@core/services/notification.service';
import { ProjectDocumentsService } from '../services/project-documents.service';
import { ProjectDocument } from '../models/project-document.model';

export interface DocumentResubmitDialogData {
  projectId: string;
  document: ProjectDocument;
}

/**
 * Dialog para resubir un documento observado
 */
@Component({
  selector: 'app-document-resubmit-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule,
    MatDividerModule,
  ],
  templateUrl: './document-resubmit-dialog.component.html',
  styleUrl: './document-resubmit-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentResubmitDialogComponent {
  private dialogRef = inject(MatDialogRef<DocumentResubmitDialogComponent>);
  private documentsService = inject(ProjectDocumentsService);
  private notification = inject(NotificationService);
  data = inject<DocumentResubmitDialogData>(MAT_DIALOG_DATA);

  // Estado
  uploading = signal(false);
  selectedFile = signal<File | null>(null);

  // Verificar si el documento es PMF
  isPMFDocument = computed(() => this.data.document.documentType.code === 'PMF');

  /**
   * Dispara el input de archivo
   */
  selectFile(): void {
    const input = document.createElement('input');
    input.type = 'file';

    // Usar los mismos tipos MIME permitidos del tipo de documento
    const mimeTypes = this.getMimeTypesForDocument();
    if (mimeTypes.length > 0) {
      input.accept = mimeTypes.join(',');
    }

    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.selectedFile.set(file);
      }
    };
    input.click();
  }

  /**
   * Sube el archivo seleccionado
   */
  uploadFile(): void {
    const file = this.selectedFile();
    if (!file) {
      this.notification.warning('Por favor selecciona un archivo');
      return;
    }

    // Validar tamaño (asumir max 10MB si no hay info)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB default
    if (file.size > maxSizeBytes) {
      this.notification.error(`El archivo excede el tamaño máximo de 10MB`);
      return;
    }

    this.uploading.set(true);

    this.documentsService
      .resubmitDocument(this.data.projectId, this.data.document.id, file)
      .subscribe({
        next: (document) => {
          this.notification.success(
            'Documento resubido correctamente (nueva versión pendiente de revisión)',
          );
          this.dialogRef.close({ success: true, document });
        },
        error: (error) => {
          console.error('Error resubmitting document:', error);
          this.uploading.set(false);
          // Error manejado por interceptor
        },
      });
  }

  /**
   * Obtiene los tipos MIME permitidos (basado en el tipo de documento)
   * Por defecto permite PDF, Word, imágenes
   */
  private getMimeTypesForDocument(): string[] {
    // Por defecto, permitir los tipos más comunes
    return [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
  }

  /**
   * Formatea el tamaño del archivo
   */
  formatFileSize(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
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
    });
  }

  /**
   * Cancela y cierra el dialog
   */
  cancel(): void {
    this.dialogRef.close();
  }
}
