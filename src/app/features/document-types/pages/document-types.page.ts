import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { DocumentTypesService } from '@core/services/document-types.service';
import { NotificationService } from '@core/services/notification.service';
import { LoadingService } from '@core/services/loading.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { DocumentType, DocumentTypeStatus } from '@shared/models/document-type.model';
import { DocumentTypeDetailsDialogComponent } from '../components/document-type-details-dialog.component';
import { DocumentTypeEditDialogComponent } from '../components/document-type-edit-dialog.component';
import {
  DocumentTypeCreateModeDialogComponent,
  CreateModeResult,
} from '../components/document-type-create-mode-dialog.component';

@Component({
  selector: 'app-document-types-page',
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatButtonToggleModule,
    EmptyStateComponent,
  ],
  templateUrl: './document-types.page.html',
  styleUrl: './document-types.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentTypesPage implements OnInit {
  private documentTypesService = inject(DocumentTypesService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private loadingService = inject(LoadingService);

  // Search and filtering
  searchTerm = signal('');
  statusFilter = signal<'all' | 'active' | 'archived'>('active');

  // Pagination
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);

  // Data
  documentTypes = signal<DocumentType[]>([]);
  loading = signal(true);

  // Filtered document types based on search and status
  filteredDocumentTypes = computed(() => {
    let filtered = this.documentTypes();

    // Filtrar por estado
    const status = this.statusFilter();
    if (status !== 'all') {
      filtered = filtered.filter((docType) => docType.status === status);
    }

    // Filtrar por búsqueda
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      filtered = filtered.filter((docType) => {
        return (
          docType.name.toLowerCase().includes(search) ||
          (docType.description?.toLowerCase().includes(search) ?? false) ||
          docType.code.toLowerCase().includes(search) ||
          (docType.category?.toLowerCase().includes(search) ?? false)
        );
      });
    }

    return filtered;
  });

  // Required: displayedColumns array
  displayedColumns: string[] = [
    'code',
    'name',
    'description',
    'isRequired',
    'requiredForProjectStages',
    'status',
    'actions',
  ];

  ngOnInit(): void {
    this.loadDocumentTypes();
  }

  /**
   * Cargar tipos de documento aplicables a proyectos para el tenant actual
   */
  loadDocumentTypes(): void {
    this.loading.set(true);
    this.documentTypesService.getApplicableDocumentTypesForTenant('projects').subscribe({
      next: (response) => {
        this.documentTypes.set(response ?? []);
        this.totalElements.set(response.length ?? 0);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading document types:', error);
        this.notification.error('Error al cargar tipos de documento');
        this.documentTypes.set([]);
        this.totalElements.set(0);
        this.loading.set(false);
      },
    });
  }

  /**
   * Abrir diálogo para crear nuevo tipo de documento
   * Primero abre modal selector, luego el formulario según la opción elegida
   */
  openCreateDialog(): void {
    // Abrir modal selector
    const selectorDialogRef = this.dialog.open(DocumentTypeCreateModeDialogComponent, {
      width: '100%',
      maxWidth: '700px',
      disableClose: false,
      autoFocus: false,
    });

    selectorDialogRef.afterClosed().subscribe((result: CreateModeResult) => {
      if (!result) return;

      if (result.mode === 'blank') {
        // Crear desde cero: abrir formulario con datos mínimos
        this.openCreateFormDialog(this.getBlankDocumentTypeData());
      } else if (result.mode === 'template' && result.template) {
        // Usar plantilla: preparar datos y abrir formulario precargado
        this.openCreateFormDialog(this.prepareTemplateData(result.template));
      }
    });
  }

  /**
   * Abrir formulario de creación con datos iniciales
   */
  private openCreateFormDialog(initialData: Partial<DocumentType>): void {
    const dialogRef = this.dialog.open(DocumentTypeEditDialogComponent, {
      width: '100%',
      maxWidth: '800px',
      data: initialData,
      disableClose: true,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((createdDocumentType) => {
      if (createdDocumentType) {
        this.loadDocumentTypes();
      }
    });
  }

  /**
   * Obtener datos mínimos para crear desde cero
   */
  private getBlankDocumentTypeData(): Partial<DocumentType> {
    return {
      code: '',
      name: '',
      description: '',
      applicableTo: ['projects'],
      isRequired: false,
      maxFileSizeMb: 10,
      allowedMimeTypes: ['application/pdf'],
      hasExpiration: false,
      displayOrder: 0,
      status: DocumentTypeStatus.active,
      requiresApproval: false,
      requiresValidationAttachment: false,
    };
  }

  /**
   * Preparar datos de plantilla para creación
   * Limpia campos que no deben copiarse y asegura valores correctos
   */
  private prepareTemplateData(template: DocumentType): Partial<DocumentType> {
    return {
      // Campos que se copian de la plantilla
      code: template.code, // Editable para evitar conflictos
      name: template.name,
      description: template.description,
      isRequired: template.isRequired,
      requiredForLicense: template.requiredForLicense,
      maxFileSizeMb: template.maxFileSizeMb,
      allowedMimeTypes: template.allowedMimeTypes,
      hasExpiration: template.hasExpiration,
      expirationWarningDays: template.expirationWarningDays,
      displayOrder: template.displayOrder,
      category: template.category,
      icon: template.icon,
      requiredForProjectStages: template.requiredForProjectStages,
      requiresApproval: template.requiresApproval,
      requiresValidationAttachment: template.requiresValidationAttachment,
      validationAttachmentMimeTypes: template.validationAttachmentMimeTypes,
      validationAttachmentMaxSizeMb: template.validationAttachmentMaxSizeMb,

      // Campos forzados para el nuevo documento
      applicableTo: ['projects'], // Siempre proyectos
      status: DocumentTypeStatus.active, // Siempre activo al crear

      // Campos que NO se copian (se autogeneran o no aplican)
      // id, companyId, createdAt se omiten
    };
  }

  /**
   * Abrir diálogo para editar tipo de documento
   * Carga los detalles desde el backend y abre el diálogo de edición
   */
  openEditDialog(docType: DocumentType): void {
    // Mostrar loading global
    this.loadingService.show();

    // Cargar detalles completos desde el backend
    this.documentTypesService.getDocumentTypeById(docType.id).subscribe({
      next: (documentTypeDetails) => {
        this.loadingService.hide();

        // Abrir diálogo de edición con los datos completos
        const dialogRef = this.dialog.open(DocumentTypeEditDialogComponent, {
          width: '100%',
          maxWidth: '800px',
          data: documentTypeDetails,
          disableClose: true,
          autoFocus: false,
        });

        // Actualizar lista si se guardaron cambios
        dialogRef.afterClosed().subscribe((updatedDocumentType) => {
          if (updatedDocumentType) {
            this.loadDocumentTypes();
          }
        });
      },
      error: (error) => {
        this.loadingService.hide();
        console.error('Error loading document type for edit:', error);
        this.notification.error('Error al cargar tipo de documento para edición');
      },
    });
  }

  /**
   * Ver detalles del tipo de documento
   * Carga los detalles desde el backend y abre un diálogo modal
   */
  viewDetails(docType: DocumentType): void {
    // Mostrar loading global
    this.loadingService.show();

    // Cargar detalles completos desde el backend
    this.documentTypesService.getDocumentTypeById(docType.id).subscribe({
      next: (documentTypeDetails) => {
        this.loadingService.hide();
        // Abrir diálogo con los datos completos
        this.dialog.open(DocumentTypeDetailsDialogComponent, {
          width: '100%',
          maxWidth: '800px',
          data: documentTypeDetails,
          autoFocus: false,
        });
      },
      error: (error) => {
        this.loadingService.hide();
        console.error('Error loading document type details:', error);
        this.notification.error('Error al cargar detalles del tipo de documento');
      },
    });
  }

  /**
   * Archivar tipo de documento
   */
  archiveDocumentType(docType: DocumentType): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Archivar tipo de documento?',
        message: `Esta acción archivará el tipo de documento "${docType.name}".\nUna vez archivado, no podrá ser editado. Podrá recuperarlo posteriormente si es necesario.`,
        confirmText: 'Archivar',
        type: 'warning',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.performArchive(docType);
      }
    });
  }

  /**
   * Buscar tipos de documento
   */
  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  /**
   * Limpiar búsqueda
   */
  clearSearch(): void {
    this.searchTerm.set('');
  }

  /**
   * Cambiar filtro de estado
   */
  onStatusFilterChange(status: 'all' | 'active' | 'archived'): void {
    this.statusFilter.set(status);
  }

  /**
   * Obtener título del empty state según filtro
   */
  getFilterEmptyStateTitle(): string {
    const status = this.statusFilter();
    switch (status) {
      case 'active':
        return 'No hay tipos de documento activos';
      case 'archived':
        return 'No hay tipos de documento archivados';
      default:
        return 'No hay tipos de documento configurados';
    }
  }

  /**
   * Obtener descripción del empty state según filtro
   */
  getFilterEmptyStateDescription(): string {
    const status = this.statusFilter();
    switch (status) {
      case 'active':
        return 'Actualmente no tienes tipos de documento activos configurados.';
      case 'archived':
        return 'No existen tipos de documento archivados.';
      default:
        return 'Comienza creando tipos de documento para requerir en tus proyectos';
    }
  }

  /**
   * Cambio de página
   */
  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    // Future: implementar paginación en backend
  }

  /**
   * Obtener label de estado
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
   * Obtener clase CSS de estado
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
   * Formatear array de etapas del proyecto
   */
  formatProjectStages(stages: string[] | null | undefined): string {
    if (!stages || stages.length === 0) {
      return '-';
    }
    return stages.join(', ');
  }

  /**
   * Truncar texto largo
   */
  truncateText(text: string | undefined, maxLength = 50): string {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Ejecutar archivado del tipo de documento
   * Construye el payload completo manteniendo todos los campos
   * y solo cambiando el status a 'archived'
   */
  private performArchive(docType: DocumentType): void {
    // Construir payload completo con todos los campos del objeto actual
    const payload: Partial<DocumentType> = {
      code: docType.code,
      name: docType.name,
      description: docType.description,
      applicableTo: docType.applicableTo,
      isRequired: docType.isRequired,
      requiredForLicense: docType.requiredForLicense ?? undefined,
      maxFileSizeMb: docType.maxFileSizeMb,
      allowedMimeTypes: docType.allowedMimeTypes,
      hasExpiration: docType.hasExpiration,
      expirationWarningDays: docType.expirationWarningDays,
      displayOrder: docType.displayOrder,
      category: docType.category,
      icon: docType.icon,
      status: DocumentTypeStatus.archived, // Solo cambiamos el status
      requiredForProjectStages: docType.requiredForProjectStages ?? undefined,
      requiresApproval: docType.requiresApproval,
      requiresValidationAttachment: docType.requiresValidationAttachment,
      validationAttachmentMimeTypes: docType.validationAttachmentMimeTypes ?? undefined,
      validationAttachmentMaxSizeMb: docType.validationAttachmentMaxSizeMb ?? undefined,
    };

    this.documentTypesService.updateDocumentType(docType.id, payload).subscribe({
      next: () => {
        this.notification.success('Tipo de documento archivado correctamente');
        this.loadDocumentTypes();
      },
      error: (error) => {
        console.error('Error archiving document type:', error);
        this.notification.error('Error al archivar tipo de documento');
      },
    });
  }
}
