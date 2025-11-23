import { ChangeDetectionStrategy, Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';

import {
  CompanyDocument,
  CompanyDocumentType,
  UploadingFile,
} from '../../../features/companies/models/company-document.model';

/**
 * Componente reutilizable para subida de archivos con drag & drop.
 * Características:
 * - Drag & drop visual
 * - Click para seleccionar archivos
 * - Validación de tipo y tamaño
 * - Progress bar durante la subida
 * - Preview de archivos con acciones (ver, descargar, eliminar)
 */
@Component({
  standalone: true,
  selector: 'app-file-upload',
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressBarModule, MatCardModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadComponent {
  // Inputs
  companyId = input.required<string>();
  documentType = input.required<CompanyDocumentType>();
  accept = input<string>('.pdf,.jpg,.jpeg,.png');
  maxSize = input<number>(10); // MB
  multiple = input<boolean>(true);
  label = input<string>('Arrastra archivos aquí o haz clic para seleccionar');
  required = input<boolean>(false);

  // Outputs
  fileUploaded = output<CompanyDocument>();
  fileDeleted = output<string>(); // documentId
  uploadError = output<string>();

  // Estado interno
  isDragOver = signal<boolean>(false);
  uploadingFiles = signal<UploadingFile[]>([]);
  uploadedDocuments = signal<CompanyDocument[]>([]);

  // Computed
  hasFiles = computed(() => this.uploadedDocuments().length > 0);
  isUploading = computed(() => this.uploadingFiles().some((f) => f.status === 'uploading'));

  /**
   * Maneja el evento dragover del área de drop
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  /**
   * Maneja el evento dragleave del área de drop
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  /**
   * Maneja el evento drop cuando se suelta un archivo
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(Array.from(files));
    }
  }

  /**
   * Maneja el clic en el área de upload para abrir el selector de archivos
   */
  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
      input.value = ''; // Reset input para permitir subir el mismo archivo otra vez
    }
  }

  /**
   * Procesa los archivos seleccionados/arrastrados
   */
  private handleFiles(files: File[]): void {
    const filesToProcess = this.multiple() ? files : [files[0]];

    for (const file of filesToProcess) {
      const validation = this.validateFile(file);

      if (!validation.valid) {
        this.uploadError.emit(validation.error || 'Archivo inválido');
        continue;
      }

      // Crear entrada de archivo en proceso de subida
      const uploadingFile: UploadingFile = {
        file,
        documentType: this.documentType(),
        progress: 0,
        status: 'uploading',
      };

      this.uploadingFiles.update((files) => [...files, uploadingFile]);
    }
  }

  /**
   * Valida un archivo antes de subirlo
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    // Validar tamaño
    const maxSizeBytes = this.maxSize() * 1024 * 1024; // MB a bytes
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `El archivo "${file.name}" excede el tamaño máximo de ${this.maxSize()} MB`,
      };
    }

    // Validar tipo
    const acceptedTypes = this.accept()
      .split(',')
      .map((t) => t.trim());
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const isValidType = acceptedTypes.some(
      (type) => type === fileExtension || file.type.match(type.replace('*', '.*')),
    );

    if (!isValidType) {
      return {
        valid: false,
        error: `El archivo "${file.name}" no tiene un formato válido. Formatos aceptados: ${this.accept()}`,
      };
    }

    return { valid: true };
  }

  /**
   * Elimina un documento subido
   */
  onDeleteDocument(documentId: string): void {
    this.uploadedDocuments.update((docs) => docs.filter((d) => d.id !== documentId));
    this.fileDeleted.emit(documentId);
  }

  /**
   * Descarga un documento
   */
  onDownloadDocument(document: CompanyDocument): void {
    // TODO: Implementar descarga real
    window.open(document.blobUrl, '_blank');
  }

  /**
   * Visualiza un documento
   */
  onViewDocument(document: CompanyDocument): void {
    // TODO: Implementar visualización en modal
    window.open(document.blobUrl, '_blank');
  }

  /**
   * Formatea el tamaño de archivo de bytes a KB/MB
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
