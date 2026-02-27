import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { CommunitiesService } from '../services/communities.service';
import { NotificationService } from '@core/services/notification.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { parseDateValue } from '@shared/utils/date-helpers';
import type { CommunityProject } from '../models/community-project.model';

/**
 * Componente para mostrar proyectos de una comunidad
 * Tabla responsive con paginación
 */
@Component({
  selector: 'app-community-projects-tab',
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatChipsModule,
    EmptyStateComponent,
  ],
  templateUrl: './community-projects-tab.component.html',
  styleUrl: './community-projects-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityProjectsTabComponent implements OnInit {
  communityId = input.required<string>();
  communityName = input.required<string>();

  private communitiesService = inject(CommunitiesService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  projects = signal<CommunityProject[]>([]);
  loading = signal(true);

  // Pagination
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = computed(() => this.projects().length);

  // Paginated projects
  paginatedProjects = computed(() => {
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return this.projects().slice(start, end);
  });

  displayedColumns: string[] = [
    'projectName',
    'dates',
    'stage',
    'product',
    'collectors',
    'actions',
  ];

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading.set(true);
    this.communitiesService.getCommunityProjects(this.communityId()).subscribe({
      next: (projects) => {
        this.projects.set(projects ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading community projects:', error);
        this.notification.error('Error al cargar los proyectos');
        this.projects.set([]);
        this.loading.set(false);
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  viewProjectDetail(project: CommunityProject): void {
    this.router.navigate(['/projects', project.projectId]);
  }

  /**
   * Traduce el stage a español
   */
  getStageLabel(stage: string): string {
    const stages: Record<string, string> = {
      planning: 'Planificación',
      inventory: 'Inventario',
      collection: 'Recolección',
      pmf_development: 'Desarrollo PMF',
      serfor_evaluation: 'Evaluación SERFOR',
      ctp_entry: 'Entrada CTP',
      primary_transformation: 'Transformación Primaria',
      map_adjustment: 'Ajuste de Mapa',
    };
    return stages[stage] || stage;
  }

  /**
   * Obtiene la clase CSS según el stage
   */
  getStageClass(stage: string): string {
    const classes: Record<string, string> = {
      planning: 'stage-planning',
      inventory: 'stage-inventory',
      collection: 'stage-collection',
      pmf_development: 'stage-pmf',
      serfor_evaluation: 'stage-serfor',
      ctp_entry: 'stage-ctp',
      primary_transformation: 'stage-transformation',
      map_adjustment: 'stage-map',
    };
    return classes[stage] || 'stage-default';
  }

  /**
   * Formatea las fechas del proyecto
   */
  getProjectDates(project: CommunityProject): string {
    const startParsed = parseDateValue(project.startDate);
    const endParsed = parseDateValue(project.endDate);
    if (!startParsed || !endParsed) return 'Fechas inválidas';

    const start = startParsed.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const end = endParsed.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  }
}
