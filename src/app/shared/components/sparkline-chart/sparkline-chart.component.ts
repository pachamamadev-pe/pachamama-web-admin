import { Component, input, computed, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

/**
 * Sparkline Chart Component - Mini chart for stat cards
 *
 * A small, simple chart that shows trends without axes or labels.
 * Perfect for displaying quick visual trends in dashboard cards.
 *
 * Usage:
 * <app-sparkline-chart
 *   [values]="[30, 35, 32, 40, 38, 45]"
 *   color="#218358"
 * />
 */
@Component({
  selector: 'app-sparkline-chart',
  standalone: true,
  imports: [BaseChartDirective],
  template: `
    <div class="sparkline-wrapper">
      <canvas baseChart [data]="chartData()" [options]="chartOptions()" [type]="'line'"> </canvas>
    </div>
  `,
  styles: [
    `
      .sparkline-wrapper {
        position: relative;
        width: 100%;
        height: 100%;

        canvas {
          max-height: 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SparklineChartComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Inputs
  values = input.required<number[]>();
  color = input<string>('#218358'); // Pachamama green by default

  // Computed chart data
  chartData = computed<ChartConfiguration['data']>(() => {
    const inputValues = this.values();
    return {
      labels: inputValues.map((_, i) => i.toString()),
      datasets: [
        {
          data: inputValues,
          borderColor: this.color(),
          backgroundColor: `${this.color()}15`, // 15% opacity for subtle fill
          borderWidth: 2,
          fill: true,
          tension: 0.4, // Smooth curves
          pointRadius: 0, // No points for cleaner look
          pointHoverRadius: 0,
        },
      ],
    };
  });

  // Minimal chart options for sparkline
  chartOptions = computed<ChartConfiguration['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false, // No tooltips for sparklines
      },
    },
    scales: {
      y: {
        display: false,
        beginAtZero: false,
      },
      x: {
        display: false,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  }));
}
