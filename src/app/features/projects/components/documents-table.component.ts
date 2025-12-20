import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectDocument } from '../models/project-document.model';
import { ProjectStage } from '../models/project.model';
import { getProjectStageLabel } from '../models/project.model';

/**
 * Componente tabla de documentos del proyecto
 */
@Component({
  selector: 'app-documents-table',
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './documents-table.component.html',
  styleUrl: './documents-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsTableComponent {
  documents = input.required<ProjectDocument[]>();
  canReview = input<boolean>(false); // Si puede aprobar/observar/rechazar
  loading = input<boolean>(false);

  // Outputs
  reviewDocument = output<ProjectDocument>();
  resubmitDocument = output<ProjectDocument>();
  downloadDocument = output<ProjectDocument>();

  // Estado local
  searchTerm = signal('');
  selectedStage = signal<ProjectStage | 'all'>('all');
  pageSize = signal(10);
  pageIndex = signal(0);

  // Columnas de la tabla
  displayedColumns: string[] = [
    'documentType',
    'fileName',
    'uploadedAt',
    'projectStage',
    'validationStatus',
    'actions',
  ];

  // Documentos filtrados
  filteredDocuments = computed(() => {
    let docs = this.documents();
    const search = this.searchTerm().toLowerCase().trim();
    const stage = this.selectedStage();

    // Filtro por búsqueda
    if (search) {
      docs = docs.filter(
        (doc) =>
          doc.documentType.name.toLowerCase().includes(search) ||
          doc.fileName.toLowerCase().includes(search) ||
          doc.documentType.code.toLowerCase().includes(search),
      );
    }

    // Filtro por etapa
    if (stage !== 'all') {
      docs = docs.filter((doc) => doc.projectStage === stage);
    }

    return docs;
  });

  // Documentos paginados
  paginatedDocuments = computed(() => {
    const docs = this.filteredDocuments();
    const startIndex = this.pageIndex() * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return docs.slice(startIndex, endIndex);
  });

  // Helper
  getProjectStageLabel = getProjectStageLabel;

  /**
   * Maneja cambio en el campo de búsqueda
   */
  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.pageIndex.set(0); // Reset página
  }

  /**
   * Limpia la búsqueda
   */
  clearSearch(): void {
    this.searchTerm.set('');
  }

  /**
   * Maneja cambio de filtro de etapa
   */
  onStageFilterChange(stage: ProjectStage | 'all'): void {
    this.selectedStage.set(stage);
    this.pageIndex.set(0); // Reset página
  }

  /**
   * Maneja cambio de página
   */
  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  /**
   * Obtiene el color del badge de estado
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'approved':
        return 'doc-status-approved';
      case 'pending':
        return 'doc-status-pending';
      case 'observed':
        return 'doc-status-observed';
      case 'rejected':
        return 'doc-status-rejected';
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
   * Verifica si el documento puede ser resubido
   */
  canResubmit(document: ProjectDocument): boolean {
    return document.validationStatus === 'observed';
  }

  /**
   * Verifica si el documento puede ser revisado
   */
  canBeReviewed(document: ProjectDocument): boolean {
    return (
      this.canReview() &&
      (document.validationStatus === 'pending' || document.validationStatus === 'observed')
    );
  }
}
