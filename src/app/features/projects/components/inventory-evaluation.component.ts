import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import { LineChartComponent } from '@shared/components/line-chart/line-chart.component';
import { ActivitiesService } from '../services/activities.service';
import { ActivityResponse, ValidationStatus } from '../models/activity.model';

interface RecordStats {
  date: string;
  count: number;
}

/**
 * Componente para evaluar el inventario del proyecto
 * Muestra estadísticas de registros y estado de formularios
 */
@Component({
  selector: 'app-inventory-evaluation',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatInputModule,
    FormsModule,
    LineChartComponent,
  ],
  templateUrl: './inventory-evaluation.component.html',
  styleUrl: './inventory-evaluation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryEvaluationComponent implements OnDestroy {
  private activitiesService = inject(ActivitiesService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  // Inputs
  productId = input.required<string>();
  projectId = input.required<string>();

  // State
  loading = signal(true);
  activities = signal<ActivityResponse[]>([]);
  selectedFilter = signal('all');
  refreshing = signal(false); // Indicador de refresh silencioso
  lastUpdated = signal<Date | null>(null); // Última actualización

  // Search and pagination
  searchTerm = signal('');
  currentPage = signal(0);
  pageSize = signal(10);

  // Auto-refresh configuration
  private autoRefreshInterval: number | null = null;
  private readonly AUTO_REFRESH_SECONDS = 60; // Refrescar cada 60 segundos

  /**
   * Agrupa las actividades por fecha (últimos 3 meses)
   */
  private groupActivitiesByDate(): RecordStats[] {
    const allActivities = this.activities();
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    // Crear mapa de fechas con contadores
    const dateMap = new Map<string, number>();

    // Inicializar todas las fechas con 0
    for (let d = new Date(threeMonthsAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dateKey = new Date(d).toISOString().split('T')[0];
      dateMap.set(dateKey, 0);
    }

    // Contar actividades por fecha
    allActivities.forEach((activity) => {
      if (activity.deviceTimestamp) {
        const activityDate = new Date(activity.deviceTimestamp);
        // Solo contar si está dentro del rango de 3 meses
        if (activityDate >= threeMonthsAgo && activityDate <= today) {
          const dateKey = activityDate.toISOString().split('T')[0];
          const currentCount = dateMap.get(dateKey) || 0;
          dateMap.set(dateKey, currentCount + 1);
        }
      }
    });

    // Convertir a array de RecordStats
    const stats: RecordStats[] = [];
    dateMap.forEach((count, date) => {
      stats.push({ date, count });
    });

    // Ordenar por fecha
    stats.sort((a, b) => a.date.localeCompare(b.date));

    return stats;
  }

  // Datos del gráfico
  chartData = computed(() => {
    const stats = this.groupActivitiesByDate();
    return {
      labels: stats.map((s) =>
        new Date(s.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      ),
      values: stats.map((s) => s.count),
      label: 'Registros diarios',
      color: '#218358',
    };
  });

  // Estadísticas computadas
  totalRecords = computed(() => {
    return this.activities().length;
  });

  // Filtrar actividades según el filtro seleccionado y término de búsqueda
  filteredActivities = computed(() => {
    const allActivities = this.activities();
    const filter = this.selectedFilter();
    const search = this.searchTerm().toLowerCase().trim();

    // Aplicar filtro por estado
    let filtered = allActivities;
    if (filter === 'pending') {
      filtered = allActivities.filter((activity) => activity.overallValidationStatus === 'pending');
    } else if (filter === 'approved') {
      filtered = allActivities.filter(
        (activity) => activity.overallValidationStatus === 'approved',
      );
    } else if (filter === 'rejected') {
      filtered = allActivities.filter(
        (activity) => activity.overallValidationStatus === 'rejected',
      );
    }

    // Aplicar búsqueda si existe término
    if (search) {
      filtered = filtered.filter((activity) => {
        const formName = activity.formSchemaName?.toLowerCase() || '';
        const collectorName = activity.collectorName?.toLowerCase() || '';
        const forestCode = this.getForestCodeDisplay(activity).toLowerCase();
        const activityType = this.getActivityTypeLabel(activity.activityType).toLowerCase();
        const status = this.getValidationStatusLabel(
          activity.overallValidationStatus,
        ).toLowerCase();

        return (
          formName.includes(search) ||
          collectorName.includes(search) ||
          forestCode.includes(search) ||
          activityType.includes(search) ||
          status.includes(search)
        );
      });
    }

    // Ordenar por fecha de captura (más recientes primero)
    return filtered.sort((a, b) => {
      const dateA = a.deviceTimestamp ? new Date(a.deviceTimestamp).getTime() : 0;
      const dateB = b.deviceTimestamp ? new Date(b.deviceTimestamp).getTime() : 0;
      return dateB - dateA; // Descendente (más recientes primero)
    });
  });

  // Total de registros filtrados (para paginador)
  totalFilteredRecords = computed(() => this.filteredActivities().length);

  // Actividades paginadas
  paginatedActivities = computed(() => {
    const filtered = this.filteredActivities();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = page * size;
    const end = start + size;
    return filtered.slice(start, end);
  });

  constructor() {
    effect(() => {
      const projId = this.projectId();
      if (projId) {
        this.loadActivities(projId, true); // Primera carga con spinner
        // this.startAutoRefresh(projId);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  /**
   * Inicia el auto-refresh de actividades
   */
  private startAutoRefresh(projectId: string): void {
    this.stopAutoRefresh(); // Limpiar intervalo anterior si existe

    this.autoRefreshInterval = window.setInterval(() => {
      // Solo refrescar si el documento está visible (tab activo)
      if (document.visibilityState === 'visible') {
        this.loadActivities(projectId, false); // Refresh silencioso
      }
    }, this.AUTO_REFRESH_SECONDS * 1000);
  }

  /**
   * Detiene el auto-refresh
   */
  private stopAutoRefresh(): void {
    if (this.autoRefreshInterval !== null) {
      window.clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  /**
   * Refresca manualmente las actividades (llamado desde el botón)
   */
  refreshActivities(): void {
    const projId = this.projectId();
    if (projId) {
      this.loadActivities(projId, false); // Refresh silencioso
      this.notification.info('Actualizando registros...');
    }
  }

  /**
   * Carga las actividades del proyecto
   * @param projectId ID del proyecto
   * @param showLoader Si debe mostrar el spinner de carga (true para carga inicial, false para refresh)
   */
  private loadActivities(projectId: string, showLoader = true): void {
    if (showLoader) {
      this.loading.set(true);
    } else {
      this.refreshing.set(true);
    }

    this.activitiesService.getActivitiesByProject(projectId).subscribe({
      next: (activities) => {
        this.activities.set(activities);
        this.lastUpdated.set(new Date());

        if (showLoader) {
          this.loading.set(false);
        } else {
          this.refreshing.set(false);
        }
      },
      error: (error) => {
        console.error('Error cargando actividades:', error);
        if (showLoader) {
          this.notification.error('Error al cargar las actividades');
          this.activities.set([]);
          this.loading.set(false);
        } else {
          // En refresh silencioso, no mostrar error invasivo
          console.warn('Error en auto-refresh, reintentando en próximo ciclo');
          this.refreshing.set(false);
        }
      },
    });
  }

  /**
   * Cambia el filtro de estado
   */
  onFilterChange(filter: string): void {
    this.selectedFilter.set(filter);
    this.currentPage.set(0); // Resetear a la primera página al cambiar filtro
  }

  /**
   * Maneja el cambio en el término de búsqueda
   */
  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(0); // Resetear a la primera página al buscar
  }

  /**
   * Limpia el término de búsqueda
   */
  clearSearch(): void {
    this.searchTerm.set('');
    this.currentPage.set(0);
  }

  /**
   * Maneja el cambio de página
   */
  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  /**
   * Navega a la evaluación de una actividad
   */
  evaluateActivity(activity: ActivityResponse): void {
    console.log('evaluateActivity');
    const projectId = (this.projectId() || activity.projectId || '').trim();
    const activityId = (activity.id || '').trim();

    if (!projectId) {
      this.notification.error('No se pudo navegar: falta el ID del proyecto');
      return;
    }

    if (!activityId) {
      this.notification.error('No se pudo navegar: falta el ID de la actividad');
      return;
    }

    this.router
      .navigate(['/projects', projectId, 'activities', activityId, 'evaluate'])
      .then((ok) => {
        if (!ok) {
          this.notification.error('No se pudo navegar a la evaluación');
        }
      })
      .catch((error) => {
        console.error('Error navegando a evaluación de actividad:', error);
        this.notification.error('Error al navegar a la evaluación');
      });
  }

  /**
   * Descarga una actividad (simulado por ahora)
   */
  downloadActivity(activity: ActivityResponse): void {
    this.notification.info(`Descargando actividad: ${activity.formSchemaName}`);
    // TODO: Implementar lógica de descarga
  }

  /**
   * Obtiene el label del estado de validación
   */
  getValidationStatusLabel(status: ValidationStatus): string {
    const labels: Record<ValidationStatus, string> = {
      pending: 'Evaluación pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
    };
    return labels[status] || status;
  }

  /**
   * Obtiene el color del badge de estado
   */
  getValidationStatusColor(status: ValidationStatus): string {
    const colors: Record<ValidationStatus, string> = {
      pending: 'text-price',
      approved: 'text-secondary',
      rejected: 'text-red-600',
    };
    return colors[status] || 'text-neutral-subheading';
  }

  /**
   * Obtiene el ícono del estado de validación
   */
  getValidationStatusIcon(status: ValidationStatus): string {
    const icons: Record<ValidationStatus, string> = {
      pending: 'schedule',
      approved: 'check_circle',
      rejected: 'cancel',
    };
    return icons[status] || 'help_outline';
  }

  /**
   * Obtiene el label del tipo de actividad
   */
  getActivityTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      TREE_REGISTRATION: 'Registro de árbol',
      TREE_COLLECTION: 'Recolección de árbol',
      TREE_STUMP_REGISTRATION: 'Registro de troza',
      TREE_STUMP_COLLECTION: 'Recolección de troza',
      OTHER: 'Otra',
    };
    return labels[type] || type;
  }

  /**
   * Obtiene el label de calidad GPS
   */
  getGpsQualityLabel(quality?: string): string {
    if (!quality) return 'N/A';
    const labels: Record<string, string> = {
      EXCELLENT: 'Excelente',
      GOOD: 'Buena',
      FAIR: 'Regular',
      POOR: 'Pobre',
      NO_SIGNAL: 'Sin señal',
    };
    return labels[quality] || quality;
  }

  /**
   * Obtiene el color del badge de calidad GPS
   */
  getGpsQualityColor(quality?: string): string {
    if (!quality) return 'text-neutral-subheading';
    const colors: Record<string, string> = {
      EXCELLENT: 'text-secondary',
      GOOD: 'text-secondary',
      FAIR: 'text-price',
      POOR: 'text-red-600',
      NO_SIGNAL: 'text-red-600',
    };
    return colors[quality] || 'text-neutral-subheading';
  }

  /**
   * Formatea el código del árbol (prioriza manual sobre sistema)
   */
  getForestCodeDisplay(activity: ActivityResponse): string {
    return activity.forestManualCode || activity.forestCode || 'Sin código';
  }
}
