import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialog,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { finalize } from 'rxjs/operators';

import { Company } from '../models/company.model';
import { DocumentsService } from '@shared/services/documents.service';
import { DocumentType } from '@shared/models/document-type.model';
import {
  EntityDocument,
  UploadDocumentDto,
  EntityDocumentStatus,
} from '@shared/models/entity-document.model';
import {
  DocumentCompliance,
  getCompliancePercentage,
} from '@shared/models/document-compliance.model';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

export interface CompanyDocumentsDialogData {
  company: Company;
}

/**
 * Dialog para gestionar documentos de una empresa (Paso 2 después de crear empresa).
 * Permite:
 * - Ver documentos requeridos y opcionales
 * - Subir documentos uno por uno
 * - Ver estado de compliance
 * - Auto-activar empresa cuando todos los documentos obligatorios estén subidos
 */
@Component({
  selector: 'app-company-documents-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './company-documents-dialog.component.html',
  styleUrl: './company-documents-dialog.component.scss',
})
export class CompanyDocumentsDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<CompanyDocumentsDialogComponent>);
  private documentsService = inject(DocumentsService);
  private azureStorage = inject(AzureStorageService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);

  data = inject<CompanyDocumentsDialogData>(MAT_DIALOG_DATA);

  // State signals
  documentTypes = signal<DocumentType[]>([]);
  uploadedDocuments = signal<EntityDocument[]>([]);
  compliance = signal<DocumentCompliance | null>(null);
  loading = signal<boolean>(true);
  uploadingDocId = signal<string | null>(null); // ID del tipo de documento que se está subiendo
  downloadingDocId = signal<string | null>(null); // ID del documento que se está descargando
  deletingDocId = signal<string | null>(null); // ID del documento que se está eliminando

  // Computed
  compliancePercentage = signal<number>(0);
  isCompliant = signal<boolean>(false);

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Cargar tipos de documentos, documentos subidos y compliance
   */
  private loadData(): void {
    this.loading.set(true);

    // Cargar tipos de documentos aplicables a empresas
    this.documentsService.getDocumentTypes('companies').subscribe({
      next: (types) => {
        this.documentTypes.set(types);
        this.loadUploadedDocuments();
      },
      error: (err) => {
        console.error('Error al cargar tipos de documentos:', err);
        this.notification.error('Error al cargar tipos de documentos');
        this.loading.set(false);
      },
    });
  }

  /**
   * Cargar documentos ya subidos
   */
  private loadUploadedDocuments(): void {
    this.documentsService.getEntityDocuments('companies', this.data.company.id).subscribe({
      next: (documents) => {
        this.uploadedDocuments.set(documents);
        this.loadCompliance();
      },
      error: (err) => {
        console.error('Error al cargar documentos subidos:', err);
        this.notification.error('Error al cargar documentos');
        this.loading.set(false);
      },
    });
  }

  /**
   * Cargar estado de compliance
   */
  private loadCompliance(): void {
    this.documentsService.getDocumentCompliance('companies', this.data.company.id).subscribe({
      next: (compliance) => {
        this.compliance.set(compliance);
        this.compliancePercentage.set(getCompliancePercentage(compliance));
        this.isCompliant.set(compliance.isCompliant);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar compliance:', err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Verificar si un tipo de documento ya está subido
   */
  isDocumentUploaded(documentTypeId: string): boolean {
    return this.uploadedDocuments().some(
      (doc) => doc.documentType.id === documentTypeId && doc.status === EntityDocumentStatus.ACTIVE,
    );
  }

  /**
   * Obtener documento subido por tipo
   */
  getUploadedDocument(documentTypeId: string): EntityDocument | undefined {
    return this.uploadedDocuments().find(
      (doc) => doc.documentType.id === documentTypeId && doc.status === EntityDocumentStatus.ACTIVE,
    );
  }

  /**
   * Trigger del input file para seleccionar archivo
   */
  triggerFileInput(documentTypeId: string): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = this.getAcceptedFileTypes(documentTypeId);

    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        this.uploadDocument(documentTypeId, file);
      }
    };

    input.click();
  }

  /**
   * Obtener tipos de archivo aceptados para un tipo de documento
   */
  private getAcceptedFileTypes(documentTypeId: string): string {
    const docType = this.documentTypes().find((dt) => dt.id === documentTypeId);
    if (!docType || !docType.allowedMimeTypes || docType.allowedMimeTypes.length === 0) {
      return '*/*';
    }
    return docType.allowedMimeTypes.join(',');
  }

  /**
   * Subir un documento
   */
  private uploadDocument(documentTypeId: string, file: File): void {
    // Validar tamaño del archivo
    const docType = this.documentTypes().find((dt) => dt.id === documentTypeId);
    if (docType && docType.maxFileSizeMb) {
      const maxSizeBytes = docType.maxFileSizeMb * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        this.notification.warning(
          `El archivo excede el tamaño máximo permitido (${docType.maxFileSizeMb} MB)`,
        );
        return;
      }
    }

    this.uploadingDocId.set(documentTypeId);

    const dto: UploadDocumentDto = {
      documentTypeId,
      entityType: 'companies',
      entityId: this.data.company.id,
    };
    console.log('Uploading document with DTO:', dto, 'and file:', file);

    this.documentsService
      .uploadDocument(dto, file)
      .pipe(finalize(() => this.uploadingDocId.set(null)))
      .subscribe({
        next: (document) => {
          this.uploadedDocuments.update((docs) => [...docs, document]);
          this.notification.success('Documento subido correctamente');

          // Recargar compliance
          this.loadCompliance();
        },
        error: (err) => {
          console.error('Error al subir documento:', err);
          this.notification.error('Error al subir documento');
        },
      });
  }

  /**
   * Descargar un documento usando Azure Storage con SAS token
   */
  downloadDocument(document: EntityDocument): void {
    if (!document.blobName) {
      this.notification.error('No se pudo obtener la referencia del archivo');
      return;
    }

    this.downloadingDocId.set(document.id);

    // Obtener URL con SAS token desde Azure Storage
    this.azureStorage
      .getFileUrl(document.blobName, 5)
      .pipe(finalize(() => this.downloadingDocId.set(null)))
      .subscribe({
        next: (url) => {
          // Abrir URL en nueva pestaña para descargar
          window.open(url, '_blank');
        },
        error: (err) => {
          console.error('Error al obtener URL de descarga:', err);
          this.notification.error('Error al descargar el documento');
        },
      });
  }

  /**
   * Eliminar un documento físicamente (elimina de BD y Azure Storage)
   */
  deleteDocument(document: EntityDocument): void {
    if (!document.blobName) {
      this.notification.error('No se pudo obtener la referencia del archivo');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Eliminar documento?',
        message: `Esta acción eliminará permanentemente el documento "${document.fileName}".`,
        confirmText: 'Eliminar',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.deletingDocId.set(document.id);

      // Paso 1: Eliminar de la base de datos
      this.documentsService
        .deleteDocument(document.id)
        .pipe(finalize(() => this.deletingDocId.set(null)))
        .subscribe({
          next: () => {
            // Paso 2: Eliminar archivo de Azure Storage
            this.azureStorage.deleteFiles([document.blobName!]).subscribe({
              next: () => {
                // Actualizar lista de documentos localmente
                this.uploadedDocuments.update((docs) => docs.filter((d) => d.id !== document.id));

                this.notification.success('Documento eliminado correctamente');

                // Recargar compliance
                this.loadCompliance();
              },
              error: (err) => {
                console.error('Error al eliminar archivo de Azure Storage:', err);
                // Aun si falla Azure, el documento ya fue eliminado de BD
                this.uploadedDocuments.update((docs) => docs.filter((d) => d.id !== document.id));
                this.notification.warning(
                  'Documento eliminado de la base de datos (error al eliminar archivo)',
                );
                this.loadCompliance();
              },
            });
          },
          error: (err) => {
            console.error('Error al eliminar documento:', err);
            this.notification.error('Error al eliminar el documento');
          },
        });
    });
  }

  /**
   * Obtener label de tipos de archivo permitidos
   */
  getFileTypesLabel(mimeTypes: string[]): string {
    const extensions = mimeTypes.map((mime) => {
      // Mapeo simple de MIME types a extensiones
      const mimeMap: Record<string, string> = {
        'application/pdf': 'PDF',
        'image/jpeg': 'JPG',
        'image/png': 'PNG',
        'image/jpg': 'JPG',
        'application/msword': 'DOC',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      };
      return mimeMap[mime] || mime.split('/')[1]?.toUpperCase() || mime;
    });

    return extensions.slice(0, 3).join(', ') + (extensions.length > 3 ? '...' : '');
  }

  /**
   * Cerrar diálogo
   */
  close(): void {
    this.dialogRef.close(this.isCompliant());
  }
}
