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
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProjectDocumentsService } from '../services/project-documents.service';
import { NotificationService } from '@core/services/notification.service';
import { PmHasPermissionDirective } from '@core/directives/pm-has-permission.directive';
import { PERMISSIONS } from '@core/auth/permissions';
import { DocumentsProgressCardComponent } from '../components/documents-progress-card.component';
import {
  DocumentRequirements,
  DocumentTypeRequirement,
  UploadDocumentRequest,
} from '../models/project-document.model';

/** Image MIME types supported in the capture prototype */
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

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
    MatChipsModule,
    MatTooltipModule,
    PmHasPermissionDirective,
    DocumentsProgressCardComponent,
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

  protected readonly PERMISSIONS = PERMISSIONS;

  // IDs
  projectId = signal<string>('');

  // State
  loading = signal(true);
  requirements = signal<DocumentRequirements | null>(null);
  uploadingFiles = signal<Set<string>>(new Set());

  // Computed sections
  requiredDocuments = computed(() => {
    const req = this.requirements();
    if (!req) return [];
    return req.documentTypes.filter((doc) => doc.isRequired && !doc.isUploaded);
  });

  requiredUploadedDocuments = computed(() => {
    const req = this.requirements();
    if (!req) return [];
    return req.documentTypes.filter((doc) => doc.isRequired && doc.isUploaded);
  });

  optionalDocuments = computed(() => {
    const req = this.requirements();
    if (!req) return [];
    return req.documentTypes.filter((doc) => !doc.isRequired);
  });

  hasNoDocuments = computed(() => {
    const req = this.requirements();
    if (!req) return false;
    return req.documentTypes.length === 0;
  });

  // ── Prototype state ─────────────────────────────────────────────────────────
  /** Document types in the current stage that accept at least one image MIME type */
  imageCompatibleDocuments = computed(() => {
    const req = this.requirements();
    if (!req) return [];
    return req.documentTypes.filter((doc) =>
      IMAGE_MIME_TYPES.some((mime) => doc.allowedMimeTypes.includes(mime)),
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

  selectFile(documentType: DocumentTypeRequirement): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = documentType.allowedMimeTypes.join(',');
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.uploadFile(documentType, file);
      }
    };
    input.click();
  }

  private uploadFile(documentType: DocumentTypeRequirement, file: File): void {
    if (!this.validateFileForUpload(documentType, file)) return;

    const docTypeId = documentType.documentTypeId!;
    this.uploadingFiles.update((set) => new Set(set).add(docTypeId));

    const request: UploadDocumentRequest = {
      documentTypeId: docTypeId,
      projectStage: this.requirements()!.currentStage,
    };

    this.documentsService.uploadDocument(this.projectId(), request, file).subscribe({
      next: (document) => {
        this.uploadingFiles.update((set) => {
          const next = new Set(set);
          next.delete(docTypeId);
          return next;
        });
        const statusLabel = document.validationStatus === 'approved' ? 'aprobado' : 'subido';
        this.notification.success(`Documento ${statusLabel} correctamente`);
        this.loadRequirements();
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

  isUploading(documentTypeId: string): boolean {
    return this.uploadingFiles().has(documentTypeId);
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
  selectImageForPrototype(documentType: DocumentTypeRequirement, useCamera: boolean): void {
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

  /** Uploads the prototype image to the backend using the selected document type */
  uploadPrototypeImage(): void {
    const doc = this.protoSelectedDoc();
    const file = this.protoFile();
    if (!doc || !file) {
      this.notification.error('Selecciona un tipo de documento y una imagen primero.');
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
        console.error('Error uploading prototype image:', error);
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
