import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
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
    LineChartComponent,
  ],
  templateUrl: './inventory-evaluation.component.html',
  styleUrl: './inventory-evaluation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryEvaluationComponent {
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

  // Datos simulados para el gráfico de registros (últimos 3 meses)
  private generateMockRecordStats(): RecordStats[] {
    const stats: RecordStats[] = [];
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    // Generar datos diarios con variación aleatoria
    for (let d = new Date(threeMonthsAgo); d <= today; d.setDate(d.getDate() + 1)) {
      stats.push({
        date: new Date(d).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 40) + 10, // Entre 10 y 50 registros por día
      });
    }

    return stats;
  }

  // Datos del gráfico
  chartData = computed(() => {
    const stats = this.generateMockRecordStats();
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
    const stats = this.generateMockRecordStats();
    return stats.reduce((sum, s) => sum + s.count, 0);
  });

  // Filtrar actividades según el filtro seleccionado
  filteredActivities = computed(() => {
    const allActivities = this.activities();
    const filter = this.selectedFilter();

    if (filter === 'all') {
      return allActivities;
    } else if (filter === 'pending') {
      return allActivities.filter((activity) => activity.overallValidationStatus === 'pending');
    } else if (filter === 'approved') {
      return allActivities.filter((activity) => activity.overallValidationStatus === 'approved');
    } else if (filter === 'rejected') {
      return allActivities.filter((activity) => activity.overallValidationStatus === 'rejected');
    }

    return allActivities;
  });

  constructor() {
    effect(() => {
      const projId = this.projectId();
      if (projId) {
        this.loadActivities(projId);
      }
    });
  }

  /**
   * Carga las actividades del proyecto
   */
  private loadActivities(projectId: string): void {
    this.loading.set(true);
    this.activitiesService.getActivitiesByProject(projectId).subscribe({
      next: (activities) => {
        this.activities.set(activities);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando actividades:', error);
        this.notification.error('Error al cargar las actividades');
        this.activities.set([]);
        this.loading.set(false);
      },
    });
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
   * Cambia el filtro de registros
   */
  onFilterChange(filter: string): void {
    this.selectedFilter.set(filter);
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
