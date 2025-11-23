import {
  Component,
  input,
  output,
  signal,
  effect,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FileUploadService, UploadResult } from '@core/services/file-upload.service';
import { NotificationService } from '@core/services/notification.service';

/**
 * Componente para subir imágenes con drag & drop
 * Incluye preview, validaciones y upload a Azure Blob Storage
 *
 * @example
 * ```html
 * <app-image-upload
 *   [maxSizeMB]="5"
 *   [allowedTypes]="['image/jpeg', 'image/png', 'image/svg+xml']"
 *   [directory]="'products'"
 *   [currentImageUrl]="product.icon"
 *   (fileUploaded)="onImageUploaded($event)"
 *   (fileRemoved)="onImageRemoved()"
 * />
 * ```
 */
@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="image-upload-container">
      <!-- Preview de imagen actual o placeholder -->
      <div
        class="upload-area"
        [class.drag-over]="isDragOver()"
        [class.has-image]="previewUrl()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        @if (uploading()) {
          <!-- Estado de carga -->
          <div class="upload-loading">
            <mat-spinner diameter="48" />
            <p class="text-subtitle text-neutral-subheading mt-2">Subiendo imagen...</p>
          </div>
        } @else if (previewUrl()) {
          <!-- Preview de imagen -->
          <div class="image-preview">
            <img [src]="previewUrl()" [alt]="fileName() || 'Preview'" class="preview-img" />
            <div class="image-overlay">
              <button
                mat-icon-button
                class="remove-btn"
                (click)="removeImage($event)"
                type="button"
                aria-label="Eliminar imagen"
              >
                <mat-icon>delete</mat-icon>
              </button>
              <button
                mat-icon-button
                class="change-btn"
                (click)="fileInput.click()"
                type="button"
                aria-label="Cambiar imagen"
              >
                <mat-icon>edit</mat-icon>
              </button>
            </div>
          </div>
        } @else {
          <!-- Placeholder para subir (SOLO esto es clickeable) -->
          <div
            class="upload-placeholder"
            role="button"
            tabindex="0"
            (click)="fileInput.click()"
            (keydown.enter)="fileInput.click()"
            (keydown.space)="fileInput.click(); $event.preventDefault()"
          >
            <mat-icon class="upload-icon">cloud_upload</mat-icon>
            <p class="text-body font-bold text-accent-titles">Subir imagen</p>
            <p class="text-subtitle text-neutral-subheading">
              Arrastra y suelta o haz click para seleccionar
            </p>
            <p class="text-subtitle text-neutral-subheading mt-2">
              Máximo {{ maxSizeMB() }}MB • JPG, PNG o SVG
            </p>
          </div>
        }
      </div>

      <!-- Input file oculto -->
      <input
        #fileInput
        type="file"
        [accept]="allowedTypes().join(',')"
        (change)="onFileSelected($event)"
        class="hidden"
      />

      <!-- Mensaje de ayuda -->
      @if (!previewUrl() && !uploading()) {
        <p class="help-text text-subtitle text-neutral-subheading"></p>
      }
    </div>
  `,
  styles: [
    `
      .image-upload-container {
        @apply w-full;
      }

      .upload-area {
        @apply w-full h-64 border-2 border-dashed border-neutral-border rounded-lg;
        @apply flex items-center justify-center cursor-pointer transition-all;
        @apply hover:border-secondary hover:bg-secondary-light/30;
      }

      .upload-area.drag-over {
        @apply border-secondary bg-secondary-light/50;
      }

      .upload-area.has-image {
        @apply border-solid border-neutral-border p-4;
      }

      .upload-loading {
        @apply flex flex-col items-center justify-center;
      }

      .image-preview {
        @apply w-full h-full relative rounded-lg overflow-hidden;
      }

      .preview-img {
        @apply w-full h-full object-contain;
      }

      .image-overlay {
        @apply absolute inset-0 bg-black/50 flex items-center justify-center gap-2;
        @apply opacity-0 hover:opacity-100 transition-opacity;
      }

      .remove-btn {
        @apply bg-red-600 text-white;

        &:hover {
          @apply bg-red-700;
        }
      }

      .change-btn {
        @apply bg-secondary text-white;

        &:hover {
          @apply bg-secondary/80;
        }
      }

      .upload-placeholder {
        @apply flex flex-col items-center justify-center text-center p-8;
        @apply cursor-pointer;
      }

      .upload-icon {
        @apply text-secondary mb-4;
        font-size: 64px;
        width: 64px;
        height: 64px;
      }

      .help-text {
        @apply mt-2 text-center;
      }

      .hidden {
        @apply sr-only;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageUploadComponent {
  private fileUploadService = inject(FileUploadService);
  private notification = inject(NotificationService);

  // Inputs
  maxSizeMB = input<number>(5);
  allowedTypes = input<string[]>(['image/jpeg', 'image/png', 'image/svg+xml']);
  directory = input.required<string>();
  currentImageUrl = input<string | null>(null);

  // Outputs
  fileUploaded = output<UploadResult>();
  fileRemoved = output<void>();

  // State
  previewUrl = signal<string | null>(null);
  fileName = signal<string | null>(null);
  uploading = signal(false);
  isDragOver = signal(false);
  hasNewUpload = signal(false); // Track si el usuario subió una nueva imagen

  constructor() {
    // ✅ Effect reactivo: Escucha cambios en currentImageUrl
    effect(() => {
      const imageUrl = this.currentImageUrl();

      // Solo mostrar imagen inicial si:
      // 1. Hay URL
      // 2. No estamos subiendo
      // 3. NO hay nuevo upload del usuario (para no sobrescribir)
      if (imageUrl && !this.uploading() && !this.hasNewUpload()) {
        this.previewUrl.set(imageUrl);
        this.fileName.set('Imagen actual');
      }
    });
  }
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  removeImage(event: Event): void {
    event.stopPropagation();
    this.previewUrl.set(null);
    this.fileName.set(null);
    this.hasNewUpload.set(true); // Marcar que hubo cambio (eliminación)
    this.fileRemoved.emit();
  }

  private handleFile(file: File): void {
    try {
      // Validar tamaño
      this.fileUploadService.validateFileSize(file, this.maxSizeMB());

      // Validar tipo
      this.fileUploadService.validateFileType(file, this.allowedTypes());

      // Mostrar preview inmediatamente
      this.showPreview(file);

      // Subir archivo a Azure
      this.uploadFile(file);
    } catch (error) {
      this.notification.error(error instanceof Error ? error.message : 'Error al validar archivo');
    }
  }

  private showPreview(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl.set(reader.result as string);
      this.fileName.set(file.name);
    };
    reader.readAsDataURL(file);
  }

  private uploadFile(file: File): void {
    this.uploading.set(true);
    this.hasNewUpload.set(true); // Marcar que hay nuevo upload

    this.fileUploadService.uploadFile(file, this.directory()).subscribe({
      next: (result) => {
        this.uploading.set(false);
        this.notification.success('Imagen subida exitosamente');
        this.fileUploaded.emit(result);
      },
      error: (error) => {
        this.uploading.set(false);
        this.previewUrl.set(null);
        this.fileName.set(null);
        this.hasNewUpload.set(false); // Reset en caso de error
        this.notification.error('Error al subir la imagen');
        console.error('Upload error:', error);
      },
    });
  }
}
