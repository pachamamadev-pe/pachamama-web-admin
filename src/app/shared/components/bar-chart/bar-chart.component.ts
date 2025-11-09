import { Component, input, computed, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

export interface BarChartData {
  labels: string[];
  values: number[];
  label?: string;
  colors?: string[];
}

/**
 * Reusable Bar Chart Component using Chart.js
 *
 * Usage:
 * <app-bar-chart
 *   [data]="chartData()"
 *   [height]="200"
 *   [horizontal]="false"
 * />
 */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [BaseChartDirective],
  template: `
    <div class="chart-wrapper" [style.height.px]="height()">
      <canvas
        baseChart
        [data]="chartData()"
        [options]="chartOptions()"
        [type]="horizontal() ? 'bar' : 'bar'"
      >
      </canvas>
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
export class BarChartComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Inputs
  data = input.required<BarChartData>();
  height = input<number>(250);
  horizontal = input<boolean>(false);
  showGrid = input<boolean>(true);

  // Computed chart data
  chartData = computed<ChartConfiguration['data']>(() => {
    const inputData = this.data();
    const defaultColors = [
      '#218358', // Primary green
      '#1a6b47', // Dark green
      '#2d9d68', // Medium green
      '#3eb77f', // Light green
      '#50d196', // Lighter green
    ];

    return {
      labels: inputData.labels,
      datasets: [
        {
          label: inputData.label || 'Especies',
          data: inputData.values,
          backgroundColor: inputData.colors || defaultColors,
          borderRadius: 6,
          borderSkipped: false,
          hoverBackgroundColor:
            inputData.colors?.map((c) => `${c}cc`) || defaultColors.map((c) => `${c}cc`),
        },
      ],
    };
  });

  // Chart options
  chartOptions = computed<ChartConfiguration['options']>(() => ({
    indexAxis: this.horizontal() ? 'y' : 'x',
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
        displayColors: true,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y || context.parsed.x}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: this.horizontal() ? this.showGrid() : false,
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#737373',
        },
      },
      x: {
        grid: {
          display: !this.horizontal() ? this.showGrid() : false,
          color: 'rgba(0, 0, 0, 0.05)',
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
