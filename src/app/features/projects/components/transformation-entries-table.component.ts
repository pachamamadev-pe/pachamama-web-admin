import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NotificationService } from '@core/services/notification.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import {
  ProductionLot,
  PRODUCTION_LOT_STATUS_LABELS,
  TRANSFORMATION_STAGE_LABELS,
} from '../models/production-lot.model';
import {
  ProductionLotCreationWizardComponent,
  ProductionLotWizardData,
  ProductionLotWizardResult,
} from './production-lot-creation-wizard.component';

/**
 * Grid de cards de lotes de producción
 */
@Component({
  selector: 'app-transformation-entries-table',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="entries-section">
      <!-- Header -->
      <div class="entries-header">
        <div>
          <h3 class="text-body font-bold text-accent-titles">Lotes de Producción</h3>
          <p class="text-subtitle text-neutral-subheading">
            {{ lots().length }} lote(s) registrados
          </p>
        </div>
        <button mat-raised-button class="btn-primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          <span class="hidden sm:inline">Nuevo lote</span>
          <span class="sm:hidden">Nuevo</span>
        </button>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="48" />
          <p class="text-body text-neutral-subheading mt-4">Cargando lotes...</p>
        </div>
      } @else if (lots().length === 0) {
        <app-empty-state
          icon="transform"
          [useMaterialIcon]="true"
          title="No hay lotes de producción"
          description="Los lotes de transformación primaria aparecerán aquí una vez que se registren"
        />
      } @else {
        <div class="lots-grid">
          @for (lot of lots(); track lot.id) {
            <div class="lot-card lot-card--{{ lot.status }}">
              <!-- Card header -->
              <div class="lot-card-header">
                <div class="lot-card-header-left">
                  <span class="lot-number">{{ lot.lotNumber }}</span>
                  <span class="status-badge status-badge--{{ lot.status }}">
                    {{ STATUS_LABELS[lot.status] }}
                  </span>
                </div>

                <div class="lot-card-header-right">
                  <div class="lot-stage-badge lot-stage-badge--{{ lot.transformationStage }}">
                    <mat-icon>{{
                      lot.transformationStage === 'primaria' ? 'factory' : 'precision_manufacturing'
                    }}</mat-icon>
                    <span>{{ STAGE_LABELS[lot.transformationStage] }}</span>
                  </div>

                  <button
                    mat-icon-button
                    class="lot-menu-btn"
                    [matMenuTriggerFor]="lotMenu"
                    aria-label="Acciones del lote"
                  >
                    <mat-icon>more_vert</mat-icon>
                  </button>

                  <mat-menu #lotMenu="matMenu" xPosition="before">
                    <button mat-menu-item (click)="viewLotDetail(lot)">
                      <mat-icon>visibility</mat-icon>
                      <span>Ver detalle</span>
                    </button>
                    <button mat-menu-item (click)="generateTraceabilityQr(lot)">
                      <mat-icon>qr_code_2</mat-icon>
                      <span>Generar QR de trazabilidad</span>
                    </button>
                    <button mat-menu-item (click)="sendToSecondaryTransformation(lot)">
                      <mat-icon>sync_alt</mat-icon>
                      <span>Enviar a Transformación secundaria</span>
                    </button>
                  </mat-menu>
                </div>
              </div>

              <!-- Product row -->
              <div class="lot-product-row">
                <mat-icon>eco</mat-icon>
                <span class="lot-product-name">{{ lot.productName }}</span>
                @if (lot.productCode) {
                  <span class="lot-product-code">{{ lot.productCode }}</span>
                }
              </div>

              <!-- Stats grid -->
              <div class="lot-stats">
                <div class="lot-stat-item">
                  <div class="lot-stat-icon"><mat-icon>scale</mat-icon></div>
                  <div class="lot-stat-info">
                    <span class="lot-stat-value">{{ lot.quantity | number: '1.0-2' }}</span>
                    <span class="lot-stat-label">{{ lot.unit || 'kg' }}</span>
                  </div>
                </div>
                <div class="lot-stat-item">
                  <div class="lot-stat-icon"><mat-icon>inventory_2</mat-icon></div>
                  <div class="lot-stat-info">
                    <span class="lot-stat-value">{{ lot.sourceCollectionBatchIds.length }}</span>
                    <span class="lot-stat-label">Lotes origen</span>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="lot-card-footer">
                <mat-icon>event</mat-icon>
                <span>{{ formatDate(lot.productionDate) }}</span>
                <span class="lot-footer-sep">&bull;</span>
                <mat-icon>person</mat-icon>
                <span>{{ lot.createdByName }}</span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .entries-section {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .entries-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 3rem 0;
      }

      /* Grid */
      .lots-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }

      @media (min-width: 768px) {
        .lots-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (min-width: 1280px) {
        .lots-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      /* Card */
      .lot-card {
        display: flex;
        flex-direction: column;
        background: #fff;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
        border-left: 4px solid #e5e7eb;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
        overflow: hidden;
        transition:
          box-shadow 0.2s,
          transform 0.2s;
      }

      .lot-card:hover {
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }

      .lot-card--recepcion {
        border-left-color: #2563eb;
      }
      .lot-card--acondicionado {
        border-left-color: #b45309;
      }
      .lot-card--ablandamiento {
        border-left-color: #c2410c;
      }
      .lot-card--pulpeado {
        border-left-color: #9333ea;
      }
      .lot-card--envasado {
        border-left-color: #16a34a;
      }

      /* Card header */
      .lot-card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 1rem 1.25rem 0.75rem;
        border-bottom: 1px solid #f3f4f6;
        gap: 0.5rem;
      }

      .lot-card-header-left {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .lot-card-header-right {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .lot-number {
        font-size: 0.875rem;
        font-weight: 700;
        color: #0a0a0a;
        letter-spacing: 0.01em;
      }

      /* Status badge */
      .status-badge {
        display: inline-flex;
        align-items: center;
        font-size: 0.7rem;
        font-weight: 600;
        border-radius: 9999px;
        padding: 0.125rem 0.625rem;
        width: fit-content;
      }

      .status-badge--recepcion {
        background: #dbeafe;
        color: #1e40af;
      }
      .status-badge--acondicionado {
        background: #fef3c7;
        color: #92400e;
      }
      .status-badge--ablandamiento {
        background: #ffedd5;
        color: #9a3412;
      }
      .status-badge--pulpeado {
        background: #f3e8ff;
        color: #6b21a8;
      }
      .status-badge--envasado {
        background: #dcfce7;
        color: #166534;
      }

      .status-badge--almacenamiento {
        background: #d1fae5;
        color: #15803d;
      }

      /* Stage badge */
      .lot-stage-badge {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.7rem;
        font-weight: 600;
        border-radius: 0.5rem;
        padding: 0.25rem 0.625rem;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .lot-stage-badge mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      .lot-stage-badge--primaria {
        background: #eff6ff;
        color: #2563eb;
      }
      .lot-stage-badge--secundaria {
        background: #fdf4ff;
        color: #9333ea;
      }

      .lot-menu-btn {
        --mdc-icon-button-state-layer-size: 28px;
        --mat-icon-button-state-layer-size: 28px;
        width: 28px;
        height: 28px;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        color: #6b7280;
      }

      .lot-menu-btn mat-icon {
        margin: 0;
        font-size: 20px;
        width: 20px;
        height: 20px;
        line-height: 1;
      }

      .lot-menu-btn:hover {
        color: #218358;
        background: #f4fbf6;
      }

      /* Product row */
      .lot-product-row {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.625rem 1.25rem;
        font-size: 0.8125rem;
        color: #374151;
      }

      .lot-product-row mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
        color: #218358;
        flex-shrink: 0;
      }

      .lot-product-name {
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .lot-product-code {
        font-size: 0.7rem;
        background: #f3f4f6;
        color: #6b7280;
        border-radius: 0.25rem;
        padding: 0.125rem 0.375rem;
        flex-shrink: 0;
      }

      /* Stats */
      .lot-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
        padding: 0.625rem 1.25rem 0.875rem;
      }

      .lot-stat-item {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        background: #f4fbf6;
        border: 1px solid #e0f2e9;
        border-radius: 0.5rem;
        padding: 0.625rem;
      }

      .lot-stat-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 0.375rem;
        background: #218358;
        flex-shrink: 0;
      }

      .lot-stat-icon mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #fff;
      }

      .lot-stat-info {
        display: flex;
        flex-direction: column;
        gap: 0.0625rem;
      }

      .lot-stat-value {
        font-size: 1rem;
        font-weight: 700;
        color: #0a0a0a;
        line-height: 1.2;
      }

      .lot-stat-label {
        font-size: 0.6875rem;
        color: #6b7280;
      }

      /* Footer */
      .lot-card-footer {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.625rem 1.25rem;
        border-top: 1px solid #f3f4f6;
        font-size: 0.75rem;
        color: #6b7280;
        flex-wrap: wrap;
      }

      .lot-card-footer mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: #218358;
        flex-shrink: 0;
      }

      .lot-footer-sep {
        color: #d1d5db;
        font-size: 0.75rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransformationEntriesTableComponent {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private notification = inject(NotificationService);

  projectId = input.required<string>();
  lots = input<ProductionLot[]>([]);
  loading = input<boolean>(false);

  lotCreated = output<void>();

  readonly STATUS_LABELS = PRODUCTION_LOT_STATUS_LABELS;
  readonly STAGE_LABELS = TRANSFORMATION_STAGE_LABELS;

  navigateToLot(lot: ProductionLot): void {
    this.router.navigate(['/projects', this.projectId(), 'production-lots', lot.id]);
  }

  viewLotDetail(lot: ProductionLot): void {
    this.navigateToLot(lot);
  }

  generateTraceabilityQr(lot: ProductionLot): void {
    this.notification.info(
      `Generación de QR de trazabilidad para ${lot.lotNumber} aún en desarrollo.`,
    );
  }

  sendToSecondaryTransformation(lot: ProductionLot): void {
    this.notification.info(
      `Envío a Transformación secundaria para ${lot.lotNumber} aún en desarrollo.`,
    );
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ProductionLotCreationWizardComponent, {
      width: '100%',
      maxWidth: '700px',
      data: { projectId: this.projectId() } satisfies ProductionLotWizardData,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: ProductionLotWizardResult | null) => {
      if (result?.created) {
        this.lotCreated.emit();
      }
    });
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }
}
