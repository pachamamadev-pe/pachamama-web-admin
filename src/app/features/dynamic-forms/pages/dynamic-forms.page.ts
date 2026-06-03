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
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatNativeDateModule } from '@angular/material/core';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { ProductsService } from '@features/products/services/products.service';
import { ProjectsService } from '@features/projects/services/projects.service';
import { CompanyFormService } from '../services/company-form.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { parseDateValue } from '@shared/utils/date-helpers';
import {
  PublishFormDialogComponent,
  PublishFormDialogResult,
} from '../components/publish-form-dialog.component';
import {
  FormHistoryDialogComponent,
  FormHistoryDialogData,
} from '../components/form-history-dialog.component';
import {
  CopyFormDialogComponent,
  CopyFormDialogData,
} from '../components/copy-form-dialog.component';
import {
  FormListItem,
  FormScope,
  FormStatus,
  ProjectStage,
  STAGE_LABELS,
  ALL_STAGES,
} from '../models/dynamic-form.model';
import { Product } from '@features/products/models/product.model';
import { Project } from '@features/projects/models/project.model';

import { PmHasPermissionDirective } from '@core/directives/pm-has-permission.directive';
import { SidebarService } from '@core/services/sidebar.service';
import { PERMISSIONS } from '@core/auth/permissions';

/**
 * Página principal de gestión de formularios dinámicos
 */
@Component({
  selector: 'app-dynamic-forms-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTabsModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatDialogModule,
    MatNativeDateModule,
    EmptyStateComponent,
    PmHasPermissionDirective,
  ],
  templateUrl: './dynamic-forms.page.html',
  styleUrl: './dynamic-forms.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicFormsPage implements OnInit {
  private companyFormService = inject(CompanyFormService);
  private productsService = inject(ProductsService);
  private projectsService = inject(ProjectsService);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  readonly sidebarService = inject(SidebarService);
  protected readonly PERMISSIONS = PERMISSIONS;

  // Estado
  loading = signal(true);
  products = signal<Product[]>([]);
  projects = signal<Project[]>([]);
  allForms = signal<FormListItem[]>([]);

  // Paginación
  currentPage = signal(0);
  pageSize = signal(20);
  totalElements = signal(0);

  // Filtros
  selectedProductId = signal<string>('all');
  selectedStage = signal<ProjectStage | 'all'>('all');
  searchTerm = signal('');
  selectedScope = signal<FormScope | 'all'>('all');
  selectedProjectId = signal<string | null>(null);
  showFilters = signal(false);

  // Tab activo
  activeTab = signal<FormStatus | 'all'>('all');

  /**
   * Alterna la visibilidad de los filtros avanzados
   */
  toggleFilters(): void {
    this.showFilters.update((v) => !v);
  }

  // Computed: formularios filtrados (ahora solo para el tab local)
  filteredForms = computed(() => {
    const forms = this.allForms();
    const tab = this.activeTab();

    // Filtro por tab (estado)
    if (tab !== 'all') {
      return forms.filter((f) => f.status === tab);
    }

    return forms;
  });

  // Computed: contadores por tab
  allCount = computed(() => this.allForms().length);
  publishedCount = computed(() => this.allForms().filter((f) => f.status === 'published').length);
  draftCount = computed(() => this.allForms().filter((f) => f.status === 'draft').length);
  archivedCount = computed(() => this.allForms().filter((f) => f.status === 'archived').length);

  // Columnas de la tabla
  displayedColumns = [
    'name',
    'product',
    'stages',
    'scope',
    'version',
    'status',
    'vigency',
    'actions',
  ];

  // Etapas disponibles
  allStages = ALL_STAGES;
  stageLabels = STAGE_LABELS;

  ngOnInit(): void {
    this.loadProducts();
    this.loadProjects();
    this.loadForms();
  }

  /**
   * Carga lista de productos
   */
  private loadProducts(): void {
    this.productsService.getProducts().subscribe({
      next: (response) => {
        this.products.set(response?.items ?? []);
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        const message = error?.error?.message || 'Error al cargar productos';
        this.notification.error(message);
      },
    });
  }

  /**
   * Carga lista de proyectos de la empresa
   */
  private async loadProjects(): Promise<void> {
    const companyId = await this.authService.getUserCompanyId();
    if (!companyId) {
      console.warn('No se pudo obtener companyId del usuario');
      this.projects.set([]);
      return;
    }

    this.projectsService.getProjects(companyId).subscribe({
      next: (response) => {
        this.projects.set(response?.items ?? []);
      },
      error: (error) => {
        console.error('Error cargando proyectos:', error);
        const message = error?.error?.message || 'Error al cargar proyectos';
        this.notification.error(message);
      },
    });
  }

  /**
   * Carga formularios con paginación y filtros desde el backend
   */
  loadForms(): void {
    this.loading.set(true);

    // Preparar filtros
    const productId = this.selectedProductId() !== 'all' ? this.selectedProductId() : undefined;
    const stage = this.selectedStage() !== 'all' ? this.selectedStage() : undefined;
    const projectId = this.selectedProjectId() || undefined;
    const searchTerm = this.searchTerm().trim() || undefined;

    this.companyFormService
      .listFormsPaged(
        this.currentPage(),
        this.pageSize(),
        searchTerm,
        productId,
        stage as ProjectStage | undefined,
        projectId,
      )
      .subscribe({
        next: (response) => {
          const enrichedForms: FormListItem[] = response.items.map((form) => ({
            ...form,
            scope: form.projectId ? 'project' : 'company',
            stageLabels: form.applicableStages.map(
              (s) => STAGE_LABELS[s.toLowerCase() as ProjectStage] || s,
            ),
            isVigent: this.isFormVigent(form.validFrom, form.validUntil),
          }));

          this.allForms.set(enrichedForms);
          this.totalElements.set(response.total);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error cargando formularios:', error);
          const message = error?.error?.message || 'Error al cargar formularios';
          this.notification.error(message);
          this.allForms.set([]);
          this.totalElements.set(0);
          this.loading.set(false);
        },
      });
  }

  /**
   * Verifica si un formulario está vigente
   */
  private isFormVigent(validFrom: string | null, validUntil: string | null): boolean {
    if (!validFrom || !validUntil) return false;
    const now = new Date();
    const from = new Date(validFrom);
    const until = new Date(validUntil);
    return now >= from && now <= until;
  }

  /**
   * Cambio de tab
   */
  onTabChange(index: number): void {
    const tabs: (FormStatus | 'all')[] = ['all', 'published', 'draft', 'archived'];
    this.activeTab.set(tabs[index]);
  }

  /**
   * Cambio de página
   */
  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadForms();
  }

  /**
   * Cambio de ámbito
   */
  onScopeChange(scope: FormScope | 'all'): void {
    this.selectedScope.set(scope);
    if (scope !== 'project') {
      this.selectedProjectId.set(null);
    }
    this.currentPage.set(0); // Reset a la primera página
    this.loadForms();
  }

  /**
   * Cambio de producto
   */
  onProductChange(): void {
    this.currentPage.set(0); // Reset a la primera página
    this.loadForms();
  }

  /**
   * Cambio de etapa
   */
  onStageChange(): void {
    this.currentPage.set(0); // Reset a la primera página
    this.loadForms();
  }

  /**
   * Cambio de búsqueda
   */
  onSearchChange(): void {
    this.currentPage.set(0); // Reset a la primera página
    this.loadForms();
  }

  /**
   * Cambio de proyecto
   */
  onProjectChange(): void {
    this.currentPage.set(0); // Reset a la primera página
    this.loadForms();
  }

  /**
   * Navegar a crear formulario
   */
  createForm(): void {
    this.router.navigate(['/dynamic-forms/create']);
  }

  /**
   * Navegar a editar formulario
   */
  editForm(form: FormListItem): void {
    // No permitir editar formularios archivados
    if (form.status === 'archived') {
      this.notification.warning('No se pueden editar formularios archivados');
      return;
    }

    // Si el formulario está publicado, mostrar advertencia sobre creación de nueva versión
    if (form.status === 'published') {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Editar Formulario Publicado',
          message: `Estás editando un formulario publicado. Se generará automáticamente una nueva versión en estado borrador. El formulario actual (v${form.version}) seguirá activo hasta que publiques la nueva versión.`,
          confirmText: 'Continuar',
          cancelText: 'Cancelar',
          type: 'info',
        },
      });

      dialogRef.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.router.navigate(['/dynamic-forms', form.productId, form.id, 'edit']);
        }
      });
    } else {
      // Formulario en borrador, editar directamente
      this.router.navigate(['/dynamic-forms', form.productId, form.id, 'edit']);
    }
  }

  /**
   * Publicar formulario
   */
  publishForm(form: FormListItem): void {
    if (form.status !== 'draft') {
      this.notification.warning('Solo se pueden publicar formularios en borrador');
      return;
    }

    // Abrir dialog para seleccionar fechas de vigencia
    const dialogRef = this.dialog.open(PublishFormDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: PublishFormDialogResult | undefined) => {
      if (result) {
        this.performPublish(form.id, result.validFrom, result.validUntil);
      }
    });
  }

  /**
   * Despublicar formulario
   */
  unpublishForm(form: FormListItem): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Despublicar formulario?',
        message: `El formulario "${form.name}" dejará de estar disponible para uso.`,
        confirmText: 'Despublicar',
        type: 'warning',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.companyFormService.unpublishForm(form.id).subscribe({
          next: () => {
            this.notification.success('Formulario despublicado correctamente');
            this.loadForms();
          },
          error: (error) => {
            console.error('Error despublicando formulario:', error);
            const message = error?.error?.message || 'Error al despublicar formulario';
            this.notification.error(message);
          },
        });
      }
    });
  }

  /**
   * Archivar formulario
   */
  archiveForm(form: FormListItem): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Archivar formulario?',
        message: `El formulario "${form.name}" será archivado y no podrá ser editado.`,
        confirmText: 'Archivar',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.companyFormService.archiveForm(form.id).subscribe({
          next: () => {
            this.notification.success('Formulario archivado correctamente');
            this.loadForms();
          },
          error: (error) => {
            console.error('Error archivando formulario:', error);
            const message = error?.error?.message || 'Error al archivar formulario';
            this.notification.error(message);
          },
        });
      }
    });
  }

  /**
   * Ver historial de versiones
   */
  viewHistory(form: FormListItem): void {
    const dialogData: FormHistoryDialogData = {
      formId: form.id,
      formName: form.name,
    };

    this.dialog.open(FormHistoryDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: dialogData,
    });
  }

  /**
   * Copiar formulario
   */
  copyForm(form: FormListItem): void {
    const dialogData: CopyFormDialogData = {
      form: form,
    };

    const dialogRef = this.dialog.open(CopyFormDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: dialogData,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.success) {
        // Recargar la lista para mostrar el nuevo formulario
        this.loadForms();
      }
    });
  }

  /**
   * Obtiene el chip de estado con color
   */
  getStatusChipClass(status: FormStatus): string {
    const classes: Record<FormStatus, string> = {
      published: 'status-published',
      draft: 'status-draft',
      archived: 'status-archived',
    };
    return classes[status] || '';
  }

  /**
   * Obtiene label del estado
   */
  getStatusLabel(status: FormStatus): string {
    const labels: Record<FormStatus, string> = {
      published: 'Publicado',
      draft: 'Borrador',
      archived: 'Archivado',
    };
    return labels[status] || status;
  }

  /**
   * Obtiene icono del ámbito
   */
  getScopeIcon(scope: FormScope): string {
    return scope === 'company' ? 'business' : 'folder';
  }

  /**
   * Obtiene label del ámbito
   */
  getScopeLabel(scope: FormScope): string {
    return scope === 'company' ? 'Empresa' : 'Proyecto';
  }

  /**
   * Formatea rango de fechas
   */
  formatDateRange(from: string | null, until: string | null): string {
    if (!from || !until) return 'Sin definir';
    const fromParsed = parseDateValue(from);
    const untilParsed = parseDateValue(until);
    if (!fromParsed || !untilParsed) return 'Sin definir';

    const fromDate = fromParsed.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const untilDate = untilParsed.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return `${fromDate} - ${untilDate}`;
  }

  /**
   * Obtiene el tooltip para las etapas restantes
   */
  getRemainingStagesTooltip(labels: string[]): string {
    return labels.slice(2).join(', ');
  }

  /**
   * Formatea una fecha individual en formato corto (DD/MM/YYYY)
   */
  formatSingleDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const parsed = parseDateValue(dateStr);
    if (!parsed) return '-';
    return parsed.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Obtiene el nombre del proyecto
   */
  getProjectName(projectId: string | null): string {
    if (!projectId) return '-';
    const project = this.projects().find((p) => p.id === projectId);
    return project?.name || projectId;
  }

  /**
   * Ejecuta la publicación del formulario con las fechas de vigencia
   */
  private performPublish(formId: string, validFrom: string, validUntil: string): void {
    this.companyFormService.publishForm(formId, validFrom, validUntil).subscribe({
      next: () => {
        this.notification.success('Formulario publicado correctamente');
        this.loadForms(); // Recargar la lista
      },
      error: (error) => {
        console.error('Error publicando formulario:', error);
        const message = error?.error?.message || 'Error al publicar formulario';
        this.notification.error(message);
      },
    });
  }
}
