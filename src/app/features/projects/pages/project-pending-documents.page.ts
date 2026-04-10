import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProjectDocumentsService } from '../services/project-documents.service';
import { NotificationService } from '@core/services/notification.service';
import {
  DocumentRequirements,
  DocumentTypeRequirement,
  UploadDocumentRequest,
} from '../models/project-document.model';

/** MIME types supported in the file capture prototype */
const PROTOTYPE_SUPPORTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

@Component({
  selector: 'app-project-pending-documents-page',
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './project-pending-documents.page.html',
  styleUrl: './project-pending-documents.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectPendingDocumentsPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private documentsService = inject(ProjectDocumentsService);
  private notification = inject(NotificationService);

  // IDs
  projectId = signal<string>('');

  // State
  loading = signal(true);
  requirements = signal<DocumentRequirements | null>(null);

  // ── Prototype state ─────────────────────────────────────────────────────────
  /** Document types that accept at least one of the supported prototype MIME types */
  prototypeCompatibleDocuments = computed(() => {
    const req = this.requirements();
    if (!req) return [];
    return req.documentTypes.filter((doc) =>
      PROTOTYPE_SUPPORTED_MIME_TYPES.some((mime) => doc.allowedMimeTypes.includes(mime)),
    );
  });

  protoSelectedDoc = signal<DocumentTypeRequirement | null>(null);
  protoFile = signal<File | null>(null);
  protoPreviewUrl = signal<string | null>(null);
  protoUploading = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notification.error('Proyecto no encontrado');
      this.router.navigate(['/projects']);
      return;
    }
    this.projectId.set(id);
    this.loadRequirements();
  }

  ngOnDestroy(): void {
    // Prevent memory leaks from unreleased object URLs
    this.revokePreviousPreview();
  }

  private loadRequirements(): void {
    this.loading.set(true);
    this.documentsService.getDocumentRequirements(this.projectId()).subscribe({
      next: (requirements) => {
        this.requirements.set(requirements);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading document requirements:', error);
        this.notification.error('Error al cargar los requisitos de documentos');
        this.requirements.set(null);
        this.loading.set(false);
      },
    });
  }

  getFormatsLabel(mimeTypes: string[]): string {
    return mimeTypes
      .map((mime) => {
        if (mime === 'application/pdf') return 'PDF';
        if (mime === 'image/jpeg') return 'JPG';
        if (mime === 'image/png') return 'PNG';
        if (mime.includes('word')) return 'Word';
        if (mime.includes('excel')) return 'Excel';
        return mime;
      })
      .join(', ');
  }

  formatFileSizeMb(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(2);
  }

  // ── Prototype methods ────────────────────────────────────────────────────────

  /**
   * Opens a file picker for the prototype section.
   * - useCamera=true: restricts to JPG/PNG and adds capture="environment" so mobile
   *   browsers may offer the back camera directly.
   * - useCamera=false: uses the MIME types allowed by the selected document type,
   *   enabling PDF and other formats without forcing the camera/gallery picker.
   */
  selectFileForPrototype(documentType: DocumentTypeRequirement, useCamera: boolean): void {
    const input = document.createElement('input');
    input.type = 'file';
    if (useCamera) {
      input.accept = 'image/jpeg,image/png';
      input.setAttribute('capture', 'environment');
    } else {
      input.accept = documentType.allowedMimeTypes.join(',');
    }
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!this.validateFileForUpload(documentType, file)) return;

      this.revokePreviousPreview();
      this.protoFile.set(file);
      // Only generate an object URL for images; PDF has no inline preview
      const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
      this.protoPreviewUrl.set(isImage ? URL.createObjectURL(file) : null);
    };
    input.click();
  }

  /** Uploads the prototype file to the backend using the selected document type */
  uploadPrototypeFile(): void {
    const doc = this.protoSelectedDoc();
    const file = this.protoFile();
    if (!doc || !file) {
      this.notification.error('Selecciona un tipo de documento y un archivo primero.');
      return;
    }

    this.protoUploading.set(true);
    const request: UploadDocumentRequest = {
      documentTypeId: doc.documentTypeId!,
      projectStage: this.requirements()!.currentStage,
    };

    this.documentsService.uploadDocument(this.projectId(), request, file).subscribe({
      next: (document) => {
        this.protoUploading.set(false);
        const statusLabel = document.validationStatus === 'approved' ? 'aprobado' : 'subido';
        this.notification.success(`Archivo ${statusLabel} correctamente`);
        this.clearPrototype();
        this.loadRequirements();
      },
      error: (error) => {
        console.error('Error uploading prototype file:', error);
        this.protoUploading.set(false);
      },
    });
  }

  clearPrototype(): void {
    this.revokePreviousPreview();
    this.protoFile.set(null);
    this.protoSelectedDoc.set(null);
  }

  private revokePreviousPreview(): void {
    const url = this.protoPreviewUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.protoPreviewUrl.set(null);
    }
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId()]);
  }

  // ── Private validation helper ─────────────────────────────────────────────
  /** Returns false and emits a notification if the file fails size or MIME validation */
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
}
