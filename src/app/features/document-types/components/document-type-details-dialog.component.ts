import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { DocumentType, DocumentTypeStatus } from '@shared/models/document-type.model';
import { getProjectWorkflowStageLabel } from '../../projects/models/project-stages.constants';
import { getMimeTypeLabel } from '../models/mime-types.constants';

/**
 * Diálogo para mostrar detalles de un tipo de documento en modo solo lectura.
 */
@Component({
  selector: 'app-document-type-details-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    DatePipe,
  ],
  templateUrl: './document-type-details-dialog.component.html',
  styleUrl: './document-type-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentTypeDetailsDialogComponent {
  dialogRef = inject(MatDialogRef<DocumentTypeDetailsDialogComponent>);
  data = inject<DocumentType>(MAT_DIALOG_DATA);

  /**
   * Obtener label del estado
   */
  getStatusLabel(status: DocumentTypeStatus): string {
    switch (status) {
      case DocumentTypeStatus.active:
        return 'Activo';
      case DocumentTypeStatus.inactive:
        return 'Inactivo';
      case DocumentTypeStatus.archived:
        return 'Archivado';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Obtener clase CSS del estado
   */
  getStatusClass(status: DocumentTypeStatus): string {
    switch (status) {
      case DocumentTypeStatus.active:
        return 'status-active';
      case DocumentTypeStatus.inactive:
        return 'status-inactive';
      case DocumentTypeStatus.archived:
        return 'status-archived';
      default:
        return '';
    }
  }

  /**
   * Verificar si es un documento global
   */
  isGlobal(): boolean {
    return this.data.companyId === null;
  }

  /**
   * Obtener label visible de la etapa usando su key
   */
  getProjectStageLabel(stageKey: string): string {
    return getProjectWorkflowStageLabel(stageKey);
  }

  getMimeTypeLabel(value: string): string {
    return getMimeTypeLabel(value);
  }

  /**
   * Cerrar diálogo
   */
  close(): void {
    this.dialogRef.close();
  }
}
