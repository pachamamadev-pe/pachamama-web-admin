import { Component, input, computed, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

export interface LineChartData {
  labels: string[];
  values: number[];
  label?: string;
  color?: string;
}

/**
 * Reusable Line Chart Component using Chart.js
 *
 * Usage:
 * <app-line-chart
 *   [data]="chartData()"
 *   [height]="200"
 *   [showGrid]="true"
 * />
 */
@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [BaseChartDirective],
  template: `
    <div class="chart-wrapper" [style.height.px]="height()">
      <canvas baseChart [data]="chartData()" [options]="chartOptions()" [type]="'line'"> </canvas>
    </div>
  `,
  styles: [
    `
      .chart-wrapper {
        position: relative;
        width: 100%;

        canvas {
          max-height: 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Inputs
  data = input.required<LineChartData>();
  height = input<number>(250);
  showGrid = input<boolean>(true);
  color = input<string>('#218358'); // Pachamama green by default

  // Computed chart data
  chartData = computed<ChartConfiguration['data']>(() => {
    const inputData = this.data();
    return {
      labels: inputData.labels,
      datasets: [
        {
          label: inputData.label || 'Datos',
          data: inputData.values,
          borderColor: this.color(),
          backgroundColor: `${this.color()}20`, // 20% opacity
          borderWidth: 3,
          fill: true,
          tension: 0.4, // Smooth curves
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: this.color(),
          pointBorderWidth: 2,
          pointHoverBackgroundColor: this.color(),
          pointHoverBorderColor: '#ffffff',
        },
      ],
    };
  });

  // Chart options
  chartOptions = computed<ChartConfiguration['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        displayColors: false,
        callbacks: {
          label: (context) => `${context.parsed.y}%`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          display: this.showGrid(),
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: (value) => `${value}%`,
          font: {
            size: 11,
          },
          color: '#737373',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#737373',
        },
      },
    },
  }));
}
