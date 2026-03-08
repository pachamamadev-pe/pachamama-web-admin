import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  ProductionLot,
  ProductionLotStatus,
  PRODUCTION_LOT_STATUS_LABELS,
} from '../models/production-lot.model';

interface StatusKpi {
  status: ProductionLotStatus;
  label: string;
  count: number;
  icon: string;
  colorClass: string;
}

/**
 * Tarjeta de resumen de lotes por estado de transformación
 */
@Component({
  selector: 'app-transformation-summary',
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="transformation-summary">
      <div class="summary-kpis">
        @for (kpi of buildKpis(lots()); track kpi.status) {
          <div class="kpi-card kpi-card--{{ kpi.status }}">
            <div class="kpi-icon">
              <mat-icon>{{ kpi.icon }}</mat-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-value">{{ kpi.count }}</span>
              <span class="kpi-label">{{ kpi.label }}</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .transformation-summary {
        margin-bottom: 0.5rem;
      }

      .summary-kpis {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }

      @media (min-width: 640px) {
        .summary-kpis {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (min-width: 1024px) {
        .summary-kpis {
          grid-template-columns: repeat(5, 1fr);
        }
      }

      .kpi-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
        background: #fff;
      }

      .kpi-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.5rem;
        width: 36px;
        height: 36px;
        flex-shrink: 0;
      }

      .kpi-card--recepcion .kpi-icon {
        background: #eff6ff;
        color: #2563eb;
      }
      .kpi-card--acondicionado .kpi-icon {
        background: #fef3c7;
        color: #b45309;
      }
      .kpi-card--ablandamiento .kpi-icon {
        background: #fff7ed;
        color: #c2410c;
      }
      .kpi-card--pulpeado .kpi-icon {
        background: #fdf4ff;
        color: #9333ea;
      }
      .kpi-card--envasado .kpi-icon {
        background: #f0fdf4;
        color: #16a34a;
      }

      .kpi-info {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        min-width: 0;
      }

      .kpi-value {
        font-size: 1.5rem;
        font-weight: 700;
        line-height: 1;
        color: #0a0a0a;
      }

      .kpi-label {
        font-size: 0.75rem;
        color: #737373;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransformationSummaryComponent {
  projectId = input.required<string>();
  lots = input<ProductionLot[]>([]);

  private readonly ICONS: Record<ProductionLotStatus, string> = {
    recepcion: 'inbox',
    acondicionado: 'build_circle',
    ablandamiento: 'water_drop',
    pulpeado: 'blender',
    envasado: 'inventory',
    almacenamiento: 'warehouse',
  };

  buildKpis(lots: ProductionLot[]): StatusKpi[] {
    const statuses: ProductionLotStatus[] = [
      'recepcion',
      'acondicionado',
      'ablandamiento',
      'pulpeado',
      'envasado',
    ];
    return statuses.map((status) => ({
      status,
      label: PRODUCTION_LOT_STATUS_LABELS[status],
      count: lots.filter((l) => l.status === status).length,
      icon: this.ICONS[status],
      colorClass: `kpi-card--${status}`,
    }));
  }
}
