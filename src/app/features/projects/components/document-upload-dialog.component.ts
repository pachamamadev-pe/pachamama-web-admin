import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '@core/services/notification.service';
import { ProjectDocumentsService } from '../services/project-documents.service';
import {
  DocumentRequirements,
  DocumentTypeRequirement,
  UploadDocumentRequest,
} from '../models/project-document.model';

export interface DocumentUploadDialogData {
  projectId: string;
  requirements: DocumentRequirements;
}

/** Image MIME types that allow camera capture */
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

/** Conservative smartphone detection via user-agent */
function detectSmartphone(): boolean {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

/**
 * Dialog para subir documentos del proyecto
 * Muestra documentos obligatorios y opcionales
 */
@Component({
  selector: 'app-document-upload-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: './document-upload-dialog.component.html',
  styleUrl: './document-upload-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentUploadDialogComponent {
  private dialogRef = inject(MatDialogRef<DocumentUploadDialogComponent>);
  private documentsService = inject(ProjectDocumentsService);
  private notification = inject(NotificationService);
  data = inject<DocumentUploadDialogData>(MAT_DIALOG_DATA);

  /** True when running on a smartphone (detected once on load) */
  isSmartphone = signal<boolean>(detectSmartphone());

  // Estado de subida
  uploadingFiles = signal<Set<string>>(new Set());

  // Documentos obligatorios pendientes
  requiredDocuments = computed(() => {
    return this.data.requirements.documentTypes.filter((doc) => doc.isRequired && !doc.isUploaded);
  });

  // Documentos obligatorios ya subidos
  requiredUploadedDocuments = computed(() => {
    return this.data.requirements.documentTypes.filter((doc) => doc.isRequired && doc.isUploaded);
  });

  // Documentos opcionales
  optionalDocuments = computed(() => {
    return this.data.requirements.documentTypes.filter((doc) => !doc.isRequired);
  });

  /**
   * Returns true if the document type accepts JPG or PNG (enables camera capture).
   */
  supportsImageCapture(documentType: DocumentTypeRequirement): boolean {
    return IMAGE_MIME_TYPES.some((mime) => documentType.allowedMimeTypes.includes(mime));
  }

  /**
   * Opens a file picker for the given document type.
   * useCamera=true adds capture="environment" and restricts to images (smartphone only).
   * useCamera=false uses all allowed MIME types without capture.
   */
  openFilePicker(documentType: DocumentTypeRequirement, useCamera: boolean): void {
    const input = document.createElement('input');
    input.type = 'file';
    if (useCamera) {
      input.accept = IMAGE_MIME_TYPES.join(',');
      input.setAttribute('capture', 'environment');
    } else {
      input.accept = documentType.allowedMimeTypes.join(',');
    }
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.uploadFile(documentType, file);
      }
    };
    input.click();
  }

  /**
   * Sube un archivo
   */
  private uploadFile(documentType: DocumentTypeRequirement, file: File): void {
    if (!this.validateFileForUpload(documentType, file)) return;

    // Iniciar subida
    const docTypeId = documentType.documentTypeId!;
    this.uploadingFiles.update((set) => new Set(set).add(docTypeId));

    const request: UploadDocumentRequest = {
      documentTypeId: docTypeId,
      projectStage: this.data.requirements.currentStage,
    };

    this.documentsService.uploadDocument(this.data.projectId, request, file).subscribe({
      next: (document) => {
        this.uploadingFiles.update((set) => {
          const next = new Set(set);
          next.delete(docTypeId);
          return next;
        });

        const statusLabel = document.validationStatus === 'approved' ? 'aprobado' : 'subido';
        this.notification.success(`Documento ${statusLabel} correctamente`);

        // Cerrar el dialog y retornar éxito
        this.dialogRef.close({ success: true });
      },
      error: (error) => {
        console.error('Error uploading document:', error);
        this.uploadingFiles.update((set) => {
          const next = new Set(set);
          next.delete(docTypeId);
          return next;
        });
      },
    });
  }

  /** Returns false and emits a notification if the file fails size or MIME validation. */
  private validateFileForUpload(documentType: DocumentTypeRequirement, file: File): boolean {
    const maxSizeBytes = documentType.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      this.notification.error(
        `El archivo excede el tamaño máximo de ${documentType.maxFileSizeMb}MB`,
      );
      return false;
    }
    if (!documentType.allowedMimeTypes.includes(file.type)) {
      this.notification.error(
        `Tipo de archivo no permitido. Formatos aceptados: ${this.getFormatsLabel(documentType.allowedMimeTypes)}`,
      );
      return false;
    }
    return true;
  }

  /**
   * Verifica si un documento está siendo subido
   */
  isUploading(documentTypeId: string): boolean {
    return this.uploadingFiles().has(documentTypeId);
  }

  /**
   * Formatea los tipos MIME a etiquetas legibles
   */
  getFormatsLabel(mimeTypes: string[]): string {
    const formats = mimeTypes.map((mime) => {
      if (mime === 'application/pdf') return 'PDF';
      if (mime === 'image/jpeg') return 'JPG';
      if (mime === 'image/png') return 'PNG';
      if (mime.includes('word')) return 'Word';
      if (mime.includes('excel')) return 'Excel';
      return mime;
    });
    return formats.join(', ');
  }

  /**
   * Obtiene el color del badge de estado
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'pending':
        return 'status-pending';
      case 'observed':
        return 'status-observed';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  }

  /**
   * Obtiene el icono del estado
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'approved':
        return 'check_circle';
      case 'pending':
        return 'schedule';
      case 'observed':
        return 'visibility';
      case 'rejected':
        return 'cancel';
      default:
        return 'help';
    }
  }

  /**
   * Obtiene la etiqueta del estado
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case 'approved':
        return 'Aprobado';
      case 'pending':
        return 'Pendiente';
      case 'observed':
        return 'Observado';
      case 'rejected':
        return 'Rechazado';
      default:
        return status;
    }
  }

  /**
   * Cierra el dialog
   */
  close(): void {
    this.dialogRef.close();
  }
}
