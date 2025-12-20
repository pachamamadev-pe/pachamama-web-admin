import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface MonthData {
  month: string;
  value: number;
  maxValue: number; // Para calcular el porcentaje de altura
}

/**
 * Componente para mostrar el gráfico de árboles conservados por mes
 * Implementa un gráfico de barras horizontal simple con CSS
 *
 * Datos hardcodeados por ahora, después vendrá del backend
 */
@Component({
  selector: 'app-product-conservation-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      @for (data of chartData; track data.month) {
        <div class="chart-row">
          <span class="month-label text-subtitle text-neutral-subheading">{{ data.month }}</span>
          <div class="bar-container">
            <div class="bar" [style.width.%]="getBarWidth(data)"></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .chart-container {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem 0;
      }

      .chart-row {
        display: grid;
        grid-template-columns: 40px 1fr;
        gap: 1rem;
        align-items: center;
      }

      .month-label {
        text-align: right;
        font-size: 12px;
        font-weight: 500;
      }

      .bar-container {
        height: 24px;
        background-color: #f4fbf6;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }

      .bar {
        height: 100%;
        background: linear-gradient(90deg, #218358 0%, #2da368 100%);
        border-radius: 4px;
        transition: width 0.3s ease;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductConservationChartComponent {
  // Mock data - después vendrá del backend
  chartData: MonthData[] = [
    { month: 'Ene', value: 450, maxValue: 700 },
    { month: 'Feb', value: 680, maxValue: 700 },
    { month: 'Mar', value: 520, maxValue: 700 },
    { month: 'Abr', value: 580, maxValue: 700 },
    { month: 'May', value: 610, maxValue: 700 },
    { month: 'Jun', value: 590, maxValue: 700 },
  ];

  getBarWidth(data: MonthData): number {
    return (data.value / data.maxValue) * 100;
  }
}
