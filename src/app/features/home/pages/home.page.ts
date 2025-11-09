import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  LineChartComponent,
  type LineChartData,
} from '../../../shared/components/line-chart/line-chart.component';
import {
  BarChartComponent,
  type BarChartData,
} from '../../../shared/components/bar-chart/bar-chart.component';
import { SparklineChartComponent } from '../../../shared/components/sparkline-chart/sparkline-chart.component';

@Component({
  standalone: true,
  selector: 'app-home-page',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    LineChartComponent,
    BarChartComponent,
    SparklineChartComponent,
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  // Mock data - TODO: Replace with real API calls
  stats = signal([
    {
      title: 'Proyectos activos',
      value: '458',
      change: '+20.1%',
      trend: 'up' as const,
      icon: 'nature',
      color: 'primary',
      sparklineData: [400, 420, 410, 435, 440, 458], // Last 6 months
    },
    {
      title: 'Hectáreas manejadas',
      value: '+12 ha',
      change: '+37.1%',
      trend: 'up' as const,
      icon: 'park',
      color: 'accent',
      sparklineData: [8, 9, 8.5, 10, 11, 12], // Last 6 months
    },
    {
      title: 'CO2 evitado este mes',
      value: '6.5 ton',
      change: '+20.1%',
      trend: 'up' as const,
      icon: 'eco',
      color: 'primary',
      sparklineData: [5.2, 5.8, 5.5, 6.0, 6.2, 6.5], // Last 6 months
    },
  ]);

  impactMetrics = signal([
    { label: 'Impacto ambiental', icon: 'forest', active: true },
    { label: 'Impacto social', icon: 'groups', active: false },
  ]);

  recentActivities = signal([
    {
      icon: 'add_circle',
      title: 'Nuevo proyecto creado',
      description: 'Proyecto Selva Central - Junín',
      time: 'Hace 2 horas',
      color: 'primary',
    },
    {
      icon: 'check_circle',
      title: 'Reporte completado',
      description: 'Informe mensual de trazabilidad',
      time: 'Hace 5 horas',
      color: 'accent',
    },
    {
      icon: 'groups',
      title: 'Nueva brigada registrada',
      description: '15 recolectores - Ucayali',
      time: 'Ayer',
      color: 'primary',
    },
  ]);

  // Chart data for evolution graph (Line Chart)
  evolutionChartData = computed<LineChartData>(() => ({
    labels: ['2021', '2022', '2023', '2024', '2025'],
    values: [30, 50, 53, 62, 98],
    label: 'Trazabilidad verificada',
  }));

  // Chart data for species (Bar Chart)
  speciesChartData = computed<BarChartData>(() => ({
    labels: ['Mamíferos', 'Aves', 'Reptiles', 'Anfibios', 'Otros'],
    values: [45, 62, 78, 34, 23],
    label: 'Número de especies',
    colors: ['#218358', '#1a6b47', '#2d9d68', '#3eb77f', '#50d196'],
  }));

  // Chart titles
  evolutionTitle = 'Evolución del % de productos con trazabilidad verificada';
  speciesTitle = 'Número de especies protegidas';
  speciesSubtitle = 'Junio 2025';
}
