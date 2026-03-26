import { Component, input, computed, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';

export interface DonutChartData {
  labels: string[];
  values: number[];
  colors?: string[];
  centerText?: string;
  tooltipLabel?: string;
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [BaseChartDirective],
  template: `
    <div class="chart-wrapper" [style.height.px]="height()">
      <canvas baseChart [data]="chartData()" [options]="chartOptions()" [type]="chartType">
      </canvas>
      @if (data().centerText) {
        <div class="center-text">
          <span>{{ data().centerText }}</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .chart-wrapper {
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;

        canvas {
          max-height: 100%;
        }

        .center-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          font-weight: bold;
          font-size: 18px;
          color: #0a0a0a;
          pointer-events: none;
          white-space: nowrap;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonutChartComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Inputs
  data = input.required<DonutChartData>();
  height = input<number>(250);
  showLegend = input<boolean>(true);
  chartType: ChartType = 'doughnut';

  // Computed chart data
  chartData = computed<ChartConfiguration['data']>(() => {
    const inputData = this.data();
    const defaultColors = ['#218358', '#fe714b', '#6366F1', '#EC4899', '#F59E0B', '#3B82F6'];

    return {
      labels: inputData.labels,
      datasets: [
        {
          label: inputData.tooltipLabel || 'Cantidad',
          data: inputData.values,
          backgroundColor: inputData.colors || defaultColors,
          hoverBackgroundColor:
            inputData.colors?.map((c) => `${c}cc`) || defaultColors.map((c) => `${c}cc`),
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    };
  });

  // Chart options
  chartOptions = computed<ChartConfiguration['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        display: this.showLegend(),
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            family: 'Inter, sans-serif',
          },
        },
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
      },
    },
  }));
}
