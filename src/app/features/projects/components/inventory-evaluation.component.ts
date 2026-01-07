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
import { ProductsService } from '@features/products/services/products.service';
import { FormSchemaResponse } from '@features/products/models/form-schema-response.model';
import { NotificationService } from '@core/services/notification.service';
import { LineChartComponent } from '@shared/components/line-chart/line-chart.component';

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
  private productsService = inject(ProductsService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  // Inputs
  productId = input.required<string>();
  projectId = input.required<string>();

  // State
  loading = signal(true);
  forms = signal<FormSchemaResponse[]>([]);
  selectedFilter = signal('normal');

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

  // Filtrar formularios según el filtro seleccionado
  filteredForms = computed(() => {
    const allForms = this.forms();
    const filter = this.selectedFilter();

    if (filter === 'normal') {
      return allForms; // Mostrar todos
    } else if (filter === 'atypical') {
      // Filtrar solo los formularios con "atípicos" (puedes ajustar la lógica)
      return allForms.filter((form) => this.isAtypical(form));
    }

    return allForms;
  });

  constructor() {
    effect(() => {
      const prodId = this.productId();
      if (prodId) {
        this.loadForms(prodId);
      }
    });
  }

  /**
   * Carga los formularios del producto
   */
  private loadForms(productId: string): void {
    this.loading.set(true);
    this.productsService.getProductForms(productId).subscribe({
      next: (forms) => {
        this.forms.set(forms);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando formularios:', error);
        this.notification.error('Error al cargar los formularios');
        this.forms.set([]);
        this.loading.set(false);
      },
    });
  }

  /**
   * Navega al detalle/edición de un formulario
   */
  viewForm(form: FormSchemaResponse): void {
    const stage = form.applicableStages[0]; // Tomar la primera etapa
    this.router.navigate(['/products', this.productId(), 'forms', stage.toLowerCase()], {
      queryParams: { formId: form.id },
    });
  }

  /**
   * Descarga un formulario (simulado por ahora)
   */
  downloadForm(form: FormSchemaResponse): void {
    this.notification.info(`Descargando formulario: ${form.name}`);
    // TODO: Implementar lógica de descarga
  }

  /**
   * Cambia el filtro de registros
   */
  onFilterChange(filter: string): void {
    this.selectedFilter.set(filter);
  }

  /**
   * Determina si un formulario es "atípico"
   * (Puedes ajustar esta lógica según criterios reales)
   */
  private isAtypical(form: FormSchemaResponse): boolean {
    // Ejemplo: consideramos atípico si el nombre contiene ciertas palabras
    // o si no está publicado, etc.
    return !form.isPublished || form.name.toLowerCase().includes('test');
  }

  /**
   * Obtiene el label de la etapa
   */
  getStageLabel(stage: string): string {
    const stageLabels: Record<string, string> = {
      planning: 'Relacionamiento Comunitario',
      inventory: 'Inventario',
      collection: 'Recolección',
      pmf_development: 'Elaboración de PMF',
      serfor_evaluation: 'Evaluación SERFOR',
      ctp_entry: 'Ingreso a CTP',
      primary_transformation: 'Transformación Primaria',
      map_adjustment: 'Ajuste de Mapas',
    };
    return stageLabels[stage.toLowerCase()] || stage;
  }

  /**
   * Obtiene el color del chip de estado
   */
  getStatusColor(isPublished: boolean): string {
    return isPublished ? 'text-secondary' : 'text-neutral-subheading';
  }
}
