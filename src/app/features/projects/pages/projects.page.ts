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
import { ProjectsService } from '../services/projects.service';
import { ProductsService } from '../../products/services/products.service';
import { CommunityProjectLinkService } from '../services/community-project-link.service';
import { SidebarService } from '@core/services/sidebar.service';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectStatus,
  getProjectStageLabel,
  getProjectStageClass,
} from '../models/project.model';
import { Product } from '../../products/models/product.model';
import { ProjectFormComponent } from '../components/project-form.component';

@Component({
  selector: 'app-projects-page',
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
    EmptyStateComponent,
  ],
  templateUrl: './projects.page.html',
  styleUrl: './projects.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsPage implements OnInit {
  private projectsService = inject(ProjectsService);
  private productsService = inject(ProductsService);
  private communityProjectLinkService = inject(CommunityProjectLinkService);
  private sidebarService = inject(SidebarService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  // Search and filtering
  searchTerm = signal('');

  // Pagination
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);

  // Data
  projects = signal<Project[]>([]);
  products = signal<Product[]>([]);
  loading = signal(true);

  // Filtered projects based on search
  filteredProjects = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    if (!search) {
      return this.projects();
    }

    return this.projects().filter((project) => {
      const productName = this.getProductName(project.productId).toLowerCase();
      return (
        project.name.toLowerCase().includes(search) ||
        (project.code?.toLowerCase().includes(search) ?? false) ||
        (project.description?.toLowerCase().includes(search) ?? false) ||
        productName.includes(search)
      );
    });
  });

  displayedColumns: string[] = ['name', 'product', 'period', 'stage', 'actions'];

  // Helpers para el template
  readonly getProjectStageLabel = getProjectStageLabel;
  readonly getProjectStageClass = getProjectStageClass;

  ngOnInit(): void {
    this.loadProducts();
    this.loadProjects();
  }

  private loadProducts(): void {
    this.productsService.getProducts({ page: 0, size: 100 }).subscribe({
      next: (response) => {
        this.products.set(response.items || []);
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.products.set([]);
      },
    });
  }

  loadProjects(): void {
    const companyId = this.sidebarService.tenantId();
    if (!companyId) {
      this.notification.error('No se pudo obtener el ID de la empresa');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.projectsService
      .getProjects(companyId, this.currentPage(), this.pageSize(), this.searchTerm() || undefined)
      .subscribe({
        next: (response) => {
          this.projects.set(response?.items ?? []);
          this.totalElements.set(response?.total ?? 0);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          this.notification.error('Error al cargar proyectos');
          this.projects.set([]);
          this.totalElements.set(0);
          this.loading.set(false);
        },
      });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ProjectFormComponent, {
      width: '100%',
      maxWidth: '600px',
      data: { mode: 'create' },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.mode === 'create') {
        const companyId = this.sidebarService.tenantId();
        if (!companyId) {
          this.notification.error('No se pudo obtener el ID de la empresa');
          return;
        }

        // Set companyId from SidebarService
        const createData: CreateProjectRequest = {
          ...result.data,
          companyId: companyId,
        };

        // Crear proyecto y luego vincular con comunidad
        this.createProjectWithCommunity(createData, result.communityId);
      }
    });
  }

  openEditDialog(project: Project): void {
    const dialogRef = this.dialog.open(ProjectFormComponent, {
      width: '100%',
      maxWidth: '600px',
      data: {
        mode: 'edit',
        project: project,
        currentCommunityId: project.communityLink?.communityId, // Pre-cargar desde communityLink
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.mode === 'edit') {
        // Verificar si cambió la comunidad
        const communityChanged = result.communityId !== result.originalCommunityId;

        if (communityChanged && project.communityLink) {
          // Actualizar proyecto y ACTUALIZAR link existente
          this.updateProjectWithCommunity(
            project.id,
            result.data,
            result.communityId,
            project.communityLink.id, // Pasar linkId para PATCH
          );
        } else {
          // Solo actualizar proyecto (comunidad no cambió)
          this.updateProject(project.id, result.data);
        }
      }
    });
  }

  deleteProject(project: Project): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Eliminar proyecto?',
        message: `Esta acción eliminará permanentemente el proyecto "${project.name}".`,
        confirmText: 'Eliminar',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.performDelete(project.id);
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadProjects();
  }

  getProductName(productId: string): string {
    const product = this.products().find((p) => p.id === productId);
    return product?.name || 'Producto desconocido';
  }

  getProjectPeriod(startDate?: string, endDate?: string): string {
    if (!startDate && !endDate) return '-';

    const formatDate = (dateStr?: string): string => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  getProjectStatusClass(status: string): string {
    switch (status) {
      case ProjectStatus.ACTIVE:
        return 'bg-secondary-light text-secondary';
      case ProjectStatus.INACTIVE:
        return 'bg-gray-100 text-gray-600';
      case ProjectStatus.COMPLETED:
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  /**
   * Crea un proyecto y luego lo vincula con una comunidad de forma secuencial
   * Muestra mensajes progresivos para mejorar la experiencia del usuario
   */
  private createProjectWithCommunity(data: CreateProjectRequest, communityId: string): void {
    // Paso 1: Crear el proyecto
    this.notification.info('Guardando proyecto...');

    this.projectsService.createProject(data).subscribe({
      next: (createdProject) => {
        // Paso 2: Vincular con la comunidad
        this.notification.info('Vinculando con comunidad...');

        this.communityProjectLinkService
          .createLink({
            projectId: createdProject.id,
            communityId: communityId,
          })
          .subscribe({
            next: () => {
              this.notification.success('Proyecto creado y vinculado correctamente');
              this.loadProjects();
            },
            error: (linkError) => {
              console.error('Error linking project to community:', linkError);
              // El proyecto se creó pero no se pudo vincular
              this.notification.warning(
                'Proyecto creado, pero hubo un error al vincular con la comunidad. Intenta vincularlo manualmente.',
              );
              this.loadProjects();
            },
          });
      },
      error: (error) => {
        console.error('Error creating project:', error);
        this.notification.error('Error al crear proyecto');
      },
    });
  }

  /**
   * Actualiza un proyecto y actualiza el vínculo con la comunidad si cambió
   * Muestra mensajes progresivos para mejorar la experiencia del usuario
   */
  private updateProjectWithCommunity(
    id: string,
    data: UpdateProjectRequest,
    communityId: string,
    linkId: string, // ID del link existente para PATCH
  ): void {
    // Paso 1: Actualizar el proyecto
    this.notification.info('Actualizando proyecto...');

    this.projectsService.updateProject(id, data).subscribe({
      next: () => {
        // Paso 2: Actualizar link existente (PATCH en lugar de POST)
        this.notification.info('Actualizando comunidad...');

        this.communityProjectLinkService.updateLink(linkId, { communityId }).subscribe({
          next: () => {
            this.notification.success('Proyecto y comunidad actualizados correctamente');
            this.loadProjects();
          },
          error: (linkError) => {
            console.error('Error updating community link:', linkError);
            // El proyecto se actualizó pero no se pudo cambiar el vínculo
            this.notification.warning(
              'Proyecto actualizado, pero hubo un error al cambiar la comunidad. Intenta actualizarlo manualmente.',
            );
            this.loadProjects();
          },
        });
      },
      error: (error) => {
        console.error('Error updating project:', error);
        this.notification.error('Error al actualizar proyecto');
      },
    });
  }

  private updateProject(id: string, data: UpdateProjectRequest): void {
    this.projectsService.updateProject(id, data).subscribe({
      next: () => {
        this.notification.success('Proyecto actualizado correctamente');
        this.loadProjects();
      },
      error: (error) => {
        console.error('Error updating project:', error);
        this.notification.error('Error al actualizar proyecto');
      },
    });
  }

  private performDelete(id: string): void {
    this.projectsService.deleteProject(id).subscribe({
      next: () => {
        this.notification.success('Proyecto eliminado correctamente');
        this.loadProjects();
      },
      error: (error) => {
        console.error('Error deleting project:', error);
        this.notification.error('Error al eliminar proyecto');
      },
    });
  }
}
