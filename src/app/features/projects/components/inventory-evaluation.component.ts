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
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ActivitiesService } from '../services/activities.service';
import { ActivityResponse, ValidationStatus } from '../models/activity.model';
import { CalculatedFieldsService } from '../services/calculated-fields.service';
import { RecalculateResponse } from '../models/calculated-field.model';
import { SidebarService } from '@core/services/sidebar.service';
import { PERMISSIONS } from '@core/auth/permissions';

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
    MatTabsModule,
    FormsModule,
  ],
  templateUrl: './inventory-evaluation.component.html',
  styleUrl: './inventory-evaluation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryEvaluationComponent implements OnDestroy {
  private activitiesService = inject(ActivitiesService);
  private calculatedFieldsService = inject(CalculatedFieldsService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private sidebarService = inject(SidebarService);

  protected readonly PERMISSIONS = PERMISSIONS;

  // Inputs
  productId = input.required<string>();
  projectId = input.required<string>();
  projectStage = input<string>(''); // Stage del proyecto para controlar visibilidad de botones
  shouldLoad = input(false); // Lazy loading trigger

  // State
  loading = signal(true);
  activities = signal<ActivityResponse[]>([]);
  totalElements = signal(0); // Total de elementos para paginación
  selectedFilter = signal('all');
  activeTab = signal<'inventory' | 'harvest'>('inventory'); // Tab activo

  // Permisos por tipo de actividad
  canReadInventory = computed(() =>
    this.sidebarService.hasPermission(PERMISSIONS.ACTIVITY_INVENTORY.READ),
  );
  canReviewInventory = computed(() =>
    this.sidebarService.hasPermission(PERMISSIONS.ACTIVITY_INVENTORY.REVIEW),
  );
  canReadCollection = computed(() =>
    this.sidebarService.hasPermission(PERMISSIONS.ACTIVITY_COLLECTION.READ),
  );
  canReviewCollection = computed(() =>
    this.sidebarService.hasPermission(PERMISSIONS.ACTIVITY_COLLECTION.REVIEW),
  );

  // Visibilidad de tabs internos
  showInventoryTab = computed(() => this.canReadInventory() || this.canReviewInventory());
  showCollectionTab = computed(() => this.canReadCollection() || this.canReviewCollection());

  invertTabs = computed(() => {
    const stage = this.projectStage().toLowerCase();
    return ['collection', 'ctp_entry', 'primary_transformation'].includes(stage);
  });

  // Índice seleccionado del mat-tab-group, calculado dinámicamente según tabs visibles
  selectedTabIndex = computed(() => {
    if (this.activeTab() === 'inventory') {
      return this.invertTabs() && this.showCollectionTab() ? 1 : 0;
    }
    // harvest
    if (this.invertTabs()) {
      return 0;
    }
    return this.showInventoryTab() ? 1 : 0;
  });
  refreshing = signal(false); // Indicador de refresh silencioso
  recalculating = signal(false); // Indicador de recálculo en progreso
  lastUpdated = signal<Date | null>(null); // Última actualización
  private hasLoaded = signal(false); // Control de carga única

  // Search and pagination
  searchTerm = signal('');
  currentPage = signal(0);
  pageSize = signal(10); // Tamaño de página del backend

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

  /**
   * Determina si el botón "Recalcular Columnas" debe mostrarse
   * Se oculta cuando el stage es: collection, ctp_entry, primary_transformation, map_adjustment
   */
  showRecalculateButton = computed(() => {
    const stage = this.projectStage().toLowerCase();
    const hiddenStages = ['collection', 'ctp_entry', 'primary_transformation', 'map_adjustment'];
    return !hiddenStages.includes(stage);
  });

  /**
   * Determina la etiqueta y acción del botón principal de actividad
   *
   * Para activityType === 'inventory':
   * - Si está pending Y stage permite aprobación → "Evaluar"
   * - Si está pending Y stage NO permite aprobación → "Ver Detalle"
   * - Si está approved o rejected → "Ver Detalle"
   *
   * Para otros activityTypes:
   * - Si está approved → "Ver Detalle"
   * - Si está pending o rejected → "Evaluar"
   */
  getActivityButtonLabel = (activity: ActivityResponse): string => {
    const stage = this.projectStage().toLowerCase();
    const restrictedStages = [
      'collection',
      'ctp_entry',
      'primary_transformation',
      'map_adjustment',
    ];
    const stageAllowsApproval = !restrictedStages.includes(stage);

    if (activity.activityType === 'inventory') {
      const canReview = this.canReviewInventory();
      if (activity.overallValidationStatus === 'pending' && stageAllowsApproval && canReview) {
        return 'Evaluar';
      }
      return 'Detalle';
    }

    // harvest / recolección
    const canReview = this.canReviewCollection();
    if (activity.overallValidationStatus === 'pending' && canReview) {
      return 'Evaluar';
    }
    return 'Detalle';
  };

  // Filtrar actividades según el filtro seleccionado y término de búsqueda
  // NOTA: El filtrado ahora se aplica sobre los datos ya paginados del backend
  filteredActivities = computed(() => {
    const allActivities = this.activities();
    const filter = this.selectedFilter();
    const search = this.searchTerm().toLowerCase().trim();
    // Aplicar filtro por estado
    let filtered = allActivities;

    // Filter by tab is now handled by backend query param

    // Aplicar filtro por estado
    if (filter === 'pending') {
      filtered = filtered.filter((activity) => activity.overallValidationStatus === 'pending');
    } else if (filter === 'approved') {
      filtered = filtered.filter((activity) => activity.overallValidationStatus === 'approved');
    } else if (filter === 'rejected') {
      filtered = filtered.filter((activity) => activity.overallValidationStatus === 'rejected');
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

  // Títulos para estado vacío
  emptyStateTitle = computed(() =>
    this.activeTab() === 'inventory'
      ? 'No hay actividades de inventario'
      : 'No hay actividades de recolección',
  );

  emptyStateDescription = computed(() =>
    this.activeTab() === 'inventory'
      ? 'No se encontraron registros de inventario para este proyecto'
      : 'No se encontraron registros de recolección para este proyecto',
  );

  constructor() {
    // Load activities when shouldLoad becomes true (only once)
    effect(() => {
      if (this.shouldLoad() && !this.hasLoaded()) {
        this.hasLoaded.set(true);
        // Ajustar tab inicial según permisos disponibles y config
        if (this.invertTabs() && this.showCollectionTab()) {
          this.activeTab.set('harvest');
        } else if (!this.showInventoryTab() && this.showCollectionTab()) {
          this.activeTab.set('harvest');
        } else if (this.showInventoryTab()) {
          this.activeTab.set('inventory');
        }
        const projId = this.projectId();
        if (projId) {
          this.loadActivities(projId, true); // Primera carga con spinner
          // this.startAutoRefresh(projId); // Descomentar si se necesita auto-refresh
        }
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
   * Recalcula todas las columnas calculadas del proyecto
   */
  recalculateAll(): void {
    const projId = this.projectId();
    if (!projId) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Recalcular columnas?',
        message:
          'Esta acción aplicará todas las fórmulas activas a las actividades aprobadas del proyecto. ¿Deseas continuar?',
        confirmText: 'Recalcular',
        type: 'info',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.performRecalculation(projId);
      }
    });
  }

  /**
   * Ejecuta el recálculo de columnas calculadas
   */
  private performRecalculation(projectId: string): void {
    this.recalculating.set(true);
    this.notification.info('Recalculando columnas...');

    this.calculatedFieldsService.recalculateProject(projectId).subscribe({
      next: (result: RecalculateResponse) => {
        this.recalculating.set(false);
        this.notification.success(
          `Recálculo completado: ${result.activitiesRecalculated} actividades actualizadas`,
        );
        // Refrescar la tabla después del recálculo
        this.loadActivities(projectId, false);
      },
      error: (error) => {
        console.error('Error recalculating:', error);
        this.recalculating.set(false);
        this.notification.error('Error al recalcular columnas');
      },
    });
  }

  /**
   * Maneja el cambio de página del mat-paginator
   */
  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    const projId = this.projectId();
    if (projId) {
      this.loadActivities(projId, true);
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

    const page = this.currentPage();
    const size = this.pageSize();
    const activityTypes = this.activeTab() === 'inventory' ? 'inventory' : 'harvest';

    this.activitiesService.getActivitiesByProject(projectId, page, size, activityTypes).subscribe({
      next: (response) => {
        this.activities.set(response.items);
        this.totalElements.set(response.total);
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
          this.totalElements.set(0);
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
   * Maneja el cambio de tab
   */
  onTabChange(index: number): void {
    let tab: 'inventory' | 'harvest';
    if (this.showInventoryTab() && this.showCollectionTab()) {
      if (this.invertTabs()) {
        tab = index === 0 ? 'harvest' : 'inventory';
      } else {
        tab = index === 0 ? 'inventory' : 'harvest';
      }
    } else if (this.showInventoryTab()) {
      tab = 'inventory';
    } else {
      tab = 'harvest';
    }
    this.activeTab.set(tab);
    this.currentPage.set(0); // Resetear paginación local
    const projId = this.projectId();
    if (projId) {
      this.loadActivities(projId, true);
    }
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
   * Navega a la evaluación de una actividad
   * Determina automáticamente el modo (readOnly o evaluate) según el contexto
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

    // Determinar el modo basado en permisos y estado de la actividad
    const stage = this.projectStage().toLowerCase();
    const restrictedStages = [
      'collection',
      'ctp_entry',
      'primary_transformation',
      'map_adjustment',
    ];
    const stageAllowsApproval = !restrictedStages.includes(stage);

    let mode = 'evaluate'; // Por defecto modo evaluación

    if (activity.activityType === 'inventory') {
      const canReview = this.canReviewInventory();
      if (activity.overallValidationStatus !== 'pending' || !stageAllowsApproval || !canReview) {
        mode = 'readOnly';
      }
    } else {
      // harvest / recolección
      const canReview = this.canReviewCollection();
      if (activity.overallValidationStatus !== 'pending' || !canReview) {
        mode = 'readOnly';
      }
    }

    this.router
      .navigate(['/projects', projectId, 'activities', activityId, 'evaluate'], {
        queryParams: { mode },
      })
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
      harvest: 'Recolección',
      inventory: 'Inventario',
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
