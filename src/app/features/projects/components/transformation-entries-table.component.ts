import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ProductionLot, PRODUCTION_LOT_STATUS_LABELS } from '../models/production-lot.model';
import {
  ProductionLotCreationWizardComponent,
  ProductionLotWizardData,
  ProductionLotWizardResult,
} from './production-lot-creation-wizard.component';
import {
  SecondaryTransformationWizardComponent,
  SecondaryTransformationWizardResult,
} from './secondary-transformation-wizard.component';

/**
 * Grid de cards de lotes de producción — dos secciones: Primaria / Secundaria
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
    MatDividerModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="entries-root">
      @if (loading()) {
        <!-- ── Estado de carga global ───────────────────────────────── -->
        <div class="loading-container">
          <mat-spinner diameter="48" />
          <p class="text-body text-neutral-subheading mt-4">Cargando lotes...</p>
        </div>
      } @else if (lots().length === 0) {
        <!-- ── Estado vacío global ─────────────────────────────────── -->
        <app-empty-state
          icon="transform"
          [useMaterialIcon]="true"
          title="No hay lotes de producción"
          description="Registra el primer lote de transformación primaria para comenzar"
          actionLabel="Nuevo lote primario"
          (action)="openCreateDialog()"
        />
      } @else {
        <!-- ══════════════════════════════════════════════════════════ -->
        <!--  SECCIÓN 1 — TRANSFORMACIÓN PRIMARIA                      -->
        <!-- ══════════════════════════════════════════════════════════ -->
        <div class="stage-section">
          <div class="stage-header stage-header--primary">
            <div class="stage-header-title">
              <div class="stage-icon stage-icon--primary">
                <mat-icon>factory</mat-icon>
              </div>
              <div>
                <h3>Transformación Primaria</h3>
                <p>{{ primaryLots().length }} lote{{ primaryLots().length !== 1 ? 's' : '' }}</p>
              </div>
            </div>
            <button mat-raised-button class="btn-primary" (click)="openCreateDialog()">
              <mat-icon>add</mat-icon>
              <span class="hidden sm:inline">Nuevo lote primario</span>
              <span class="sm:hidden">Nuevo</span>
            </button>
          </div>

          @if (primaryLots().length === 0) {
            <div class="section-empty">
              <mat-icon>factory</mat-icon>
              <span>No hay lotes primarios registrados aún</span>
            </div>
          } @else {
            <div class="lots-grid">
              @for (lot of primaryLots(); track lot.id) {
                <!-- ─── Card Primaria ─────────────────────────────── -->
                <div class="lot-card lot-card--primary lot-card--status-{{ lot.status }}">
                  <div class="lot-card-header">
                    <div class="lot-card-header-left">
                      <span class="lot-number">{{ lot.lotNumber }}</span>
                      <span class="status-badge status-badge--{{ lot.status }}">
                        {{ STATUS_LABELS[lot.status] }}
                      </span>
                    </div>
                    <button
                      mat-icon-button
                      class="lot-menu-btn"
                      [matMenuTriggerFor]="primaryMenu"
                      aria-label="Acciones"
                    >
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #primaryMenu="matMenu" xPosition="before">
                      <button mat-menu-item (click)="viewLotDetail(lot)">
                        <mat-icon>visibility</mat-icon>
                        <span>Ver detalle</span>
                      </button>
                      <button mat-menu-item (click)="generateTraceabilityQr(lot)">
                        <mat-icon>qr_code_2</mat-icon>
                        <span>Generar QR de trazabilidad</span>
                      </button>
                      <mat-divider />
                      <button
                        mat-menu-item
                        (click)="sendToSecondaryTransformation(lot)"
                        [disabled]="lot.status !== 'almacenamiento'"
                        [matTooltip]="
                          lot.status !== 'almacenamiento'
                            ? 'El lote debe estar en estado Almacenamiento'
                            : ''
                        "
                      >
                        <mat-icon>precision_manufacturing</mat-icon>
                        <span>Crear lote secundario</span>
                      </button>
                    </mat-menu>
                  </div>

                  <div class="lot-product-row">
                    <mat-icon>eco</mat-icon>
                    <span class="lot-product-name">{{ lot.productName }}</span>
                    @if (lot.productCode) {
                      <span class="lot-product-code">{{ lot.productCode }}</span>
                    }
                  </div>

                  <div class="lot-stats">
                    <div class="lot-stat-item lot-stat-item--primary">
                      <div class="lot-stat-icon lot-stat-icon--primary">
                        <mat-icon>scale</mat-icon>
                      </div>
                      <div class="lot-stat-info">
                        <span class="lot-stat-value">{{ lot.quantity | number: '1.0-2' }}</span>
                        <span class="lot-stat-label">{{ lot.unit || 'kg' }}</span>
                      </div>
                    </div>
                    <div class="lot-stat-item lot-stat-item--primary">
                      <div class="lot-stat-icon lot-stat-icon--primary">
                        <mat-icon>inventory_2</mat-icon>
                      </div>
                      <div class="lot-stat-info">
                        <span class="lot-stat-value">{{
                          lot.sourceCollectionBatchIds.length
                        }}</span>
                        <span class="lot-stat-label">Acopios origen</span>
                      </div>
                    </div>
                  </div>

                  <!-- Indicador de lotes secundarios derivados -->
                  @if (secondaryCountFor(lot.id) > 0) {
                    <div class="derived-badge">
                      <mat-icon>precision_manufacturing</mat-icon>
                      <span
                        >{{ secondaryCountFor(lot.id) }} lote{{
                          secondaryCountFor(lot.id) !== 1 ? 's' : ''
                        }}
                        secundario{{ secondaryCountFor(lot.id) !== 1 ? 's' : '' }} derivado{{
                          secondaryCountFor(lot.id) !== 1 ? 's' : ''
                        }}</span
                      >
                    </div>
                  }

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

        <!-- ══════════════════════════════════════════════════════════ -->
        <!--  SECCIÓN 2 — TRANSFORMACIÓN SECUNDARIA                    -->
        <!-- ══════════════════════════════════════════════════════════ -->
        <div class="stage-section">
          <div class="stage-header stage-header--secondary">
            <div class="stage-header-title">
              <div class="stage-icon stage-icon--secondary">
                <mat-icon>precision_manufacturing</mat-icon>
              </div>
              <div>
                <h3>Transformación Secundaria</h3>
                <p>
                  {{ secondaryLots().length }} lote{{ secondaryLots().length !== 1 ? 's' : '' }}
                </p>
              </div>
            </div>
          </div>

          @if (secondaryLots().length === 0) {
            <div class="section-empty">
              <mat-icon>precision_manufacturing</mat-icon>
              <span>Ningún lote primario ha generado aún una transformación secundaria</span>
            </div>
          } @else {
            <div class="lots-grid">
              @for (lot of secondaryLots(); track lot.id) {
                <!-- ─── Card Secundaria ───────────────────────────── -->
                <div class="lot-card lot-card--secondary lot-card--status-{{ lot.status }}">
                  <div class="lot-card-header">
                    <div class="lot-card-header-left">
                      <span class="lot-number">{{ lot.lotNumber }}</span>
                      <span class="status-badge status-badge--{{ lot.status }}">
                        {{ STATUS_LABELS[lot.status] }}
                      </span>
                    </div>
                    <button
                      mat-icon-button
                      class="lot-menu-btn"
                      [matMenuTriggerFor]="secondaryMenu"
                      aria-label="Acciones"
                    >
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #secondaryMenu="matMenu" xPosition="before">
                      <button mat-menu-item (click)="viewLotDetail(lot)">
                        <mat-icon>visibility</mat-icon>
                        <span>Ver detalle</span>
                      </button>
                      <button mat-menu-item (click)="generateTraceabilityQr(lot)">
                        <mat-icon>qr_code_2</mat-icon>
                        <span>Generar QR de trazabilidad</span>
                      </button>
                      @if (lot.parentLotId) {
                        <mat-divider />
                        <button mat-menu-item (click)="viewParentLot(lot)">
                          <mat-icon>account_tree</mat-icon>
                          <span>Ver lote primario origen</span>
                        </button>
                      }
                    </mat-menu>
                  </div>

                  <!-- Origen: lote padre -->
                  @if (lot.parentLotNumber) {
                    <div class="parent-lot-chip">
                      <mat-icon>account_tree</mat-icon>
                      <span>Derivado de</span>
                      <strong>{{ lot.parentLotNumber }}</strong>
                    </div>
                  }

                  <div class="lot-product-row">
                    <mat-icon>eco</mat-icon>
                    <span class="lot-product-name">{{ lot.productName }}</span>
                    @if (lot.productCode) {
                      <span class="lot-product-code">{{ lot.productCode }}</span>
                    }
                  </div>

                  <div class="lot-stats">
                    <div class="lot-stat-item lot-stat-item--secondary">
                      <div class="lot-stat-icon lot-stat-icon--secondary">
                        <mat-icon>scale</mat-icon>
                      </div>
                      <div class="lot-stat-info">
                        <span class="lot-stat-value">{{ lot.quantity | number: '1.0-2' }}</span>
                        <span class="lot-stat-label">{{ lot.unit || 'kg' }}</span>
                      </div>
                    </div>
                    @if ((lot.totalSacksCount ?? 0) > 0 || (lot.totalJabasCount ?? 0) > 0) {
                      <div class="lot-stat-item lot-stat-item--secondary">
                        <div class="lot-stat-icon lot-stat-icon--secondary">
                          <mat-icon>shopping_bag</mat-icon>
                        </div>
                        <div class="lot-stat-info">
                          @if ((lot.totalSacksCount ?? 0) > 0) {
                            <span class="lot-stat-value">{{ lot.totalSacksCount }}</span>
                            <span class="lot-stat-label">Sacos</span>
                          } @else {
                            <span class="lot-stat-value">{{ lot.totalJabasCount }}</span>
                            <span class="lot-stat-label">Jabas</span>
                          }
                        </div>
                      </div>
                    } @else {
                      <div class="lot-stat-item lot-stat-item--secondary">
                        <div class="lot-stat-icon lot-stat-icon--secondary">
                          <mat-icon>local_shipping</mat-icon>
                        </div>
                        <div class="lot-stat-info">
                          <span class="lot-stat-value">{{
                            lot.transportInfo?.transportType ?? '—'
                          }}</span>
                          <span class="lot-stat-label">Transporte</span>
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Info transporte resumida -->
                  @if (lot.transportInfo?.transporterName) {
                    <div class="transport-row">
                      <mat-icon>person_pin_circle</mat-icon>
                      <span>{{ lot.transportInfo!.transporterName }}</span>
                      <span class="transport-sep">&bull;</span>
                      <span
                        >{{ lot.transportInfo!.originLocation }} →
                        {{ lot.transportInfo!.destinationLocation }}</span
                      >
                    </div>
                  }

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
      }
    </div>
  `,
  styles: [
    `
      /* ── Raíz ───────────────────────────────────────────────────── */
      .entries-root {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 3rem 0;
      }

      /* ── Sección de etapa ───────────────────────────────────────── */
      .stage-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      /* ── Header de sección ──────────────────────────────────────── */
      .stage-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        border-radius: 0.75rem;
      }

      .stage-header--primary {
        background: #f4fbf6;
        border: 1.5px solid #d1fae5;
      }

      .stage-header--secondary {
        background: #fff8f6;
        border: 1.5px solid #fdd9ce;
      }

      .stage-header-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .stage-header-title h3 {
        font-size: 0.9375rem;
        font-weight: 700;
        color: #0a0a0a;
        line-height: 1.2;
      }

      .stage-header-title p {
        font-size: 0.75rem;
        color: #737373;
        margin-top: 0.125rem;
      }

      .stage-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 0.625rem;
        flex-shrink: 0;
      }

      .stage-icon mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .stage-icon--primary {
        background: #d1fae5;
        color: #218358;
      }

      .stage-icon--secondary {
        background: #fdd9ce;
        color: #fe714b;
      }

      /* ── Estado vacío de sección ────────────────────────────────── */
      .section-empty {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px dashed #e5e7eb;
        color: #737373;
        font-size: 0.8125rem;
      }

      .section-empty mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #d1d5db;
        flex-shrink: 0;
      }

      /* ── Grid de cards ──────────────────────────────────────────── */
      .lots-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
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

      /* ── Card base ──────────────────────────────────────────────── */
      .lot-card {
        display: flex;
        flex-direction: column;
        background: #fff;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
        border-left-width: 4px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
        overflow: hidden;
        transition:
          box-shadow 0.2s,
          transform 0.2s;
      }

      .lot-card:hover {
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.09);
        transform: translateY(-2px);
      }

      /* Acento izquierdo por etapa */
      .lot-card--primary {
        border-left-color: #218358;
      }
      .lot-card--secondary {
        border-left-color: #fe714b;
      }

      /* Card header */
      .lot-card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 0.875rem 1rem 0.75rem;
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

      /* ── Menú button ────────────────────────────────────────────── */
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
        flex-shrink: 0;
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

      /* ── Status badges ───────────────────────────────────────────── */
      .status-badge {
        display: inline-flex;
        align-items: center;
        font-size: 0.68rem;
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
        background: #fce7f3;
        color: #9d174d;
      }
      .status-badge--envasado {
        background: #dcfce7;
        color: #166534;
      }
      .status-badge--almacenamiento {
        background: #d1fae5;
        color: #15803d;
      }

      /* ── Chip lote padre (en card secundaria) ───────────────────── */
      .parent-lot-chip {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.375rem 1rem;
        background: #fff8f6;
        border-bottom: 1px solid #fdd9ce;
        font-size: 0.75rem;
        color: #737373;
      }

      .parent-lot-chip mat-icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
        color: #fe714b;
        flex-shrink: 0;
      }

      .parent-lot-chip strong {
        color: #fe714b;
        font-weight: 700;
      }

      /* ── Fila de producto ───────────────────────────────────────── */
      .lot-product-row {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.5rem 1rem;
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
        font-size: 0.68rem;
        background: #f3f4f6;
        color: #6b7280;
        border-radius: 0.25rem;
        padding: 0.125rem 0.375rem;
        flex-shrink: 0;
      }

      /* ── Stats ──────────────────────────────────────────────────── */
      .lot-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.625rem;
        padding: 0.5rem 1rem 0.75rem;
      }

      .lot-stat-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border-radius: 0.5rem;
        padding: 0.5rem 0.625rem;
      }

      .lot-stat-item--primary {
        background: #f4fbf6;
        border: 1px solid #d1fae5;
      }

      .lot-stat-item--secondary {
        background: #fff8f6;
        border: 1px solid #fdd9ce;
      }

      .lot-stat-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: 0.375rem;
        flex-shrink: 0;
      }

      .lot-stat-icon mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #fff;
      }

      .lot-stat-icon--primary {
        background: #218358;
      }
      .lot-stat-icon--secondary {
        background: #fe714b;
      }

      .lot-stat-info {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .lot-stat-value {
        font-size: 0.9375rem;
        font-weight: 700;
        color: #0a0a0a;
        line-height: 1.25;
      }

      .lot-stat-label {
        font-size: 0.6875rem;
        color: #737373;
      }

      /* ── Badge "X lotes secundarios" en card primaria ───────────── */
      .derived-badge {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        margin: 0 1rem 0.5rem;
        padding: 0.3rem 0.625rem;
        background: #fff8f6;
        border: 1px solid #fdd9ce;
        border-radius: 0.5rem;
        font-size: 0.72rem;
        color: #fe714b;
        font-weight: 600;
      }

      .derived-badge mat-icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
        flex-shrink: 0;
      }

      /* ── Fila de transporte (en card secundaria) ────────────────── */
      .transport-row {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.375rem 1rem;
        border-top: 1px solid #f3f4f6;
        font-size: 0.72rem;
        color: #737373;
        flex-wrap: wrap;
        overflow: hidden;
      }

      .transport-row mat-icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
        color: #fe714b;
        flex-shrink: 0;
      }

      .transport-sep {
        color: #d1d5db;
      }

      /* ── Footer de card ─────────────────────────────────────────── */
      .lot-card-footer {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.5rem 1rem;
        border-top: 1px solid #f3f4f6;
        font-size: 0.72rem;
        color: #737373;
        flex-wrap: wrap;
        margin-top: auto;
      }

      .lot-card-footer mat-icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
        color: #218358;
        flex-shrink: 0;
      }

      .lot-footer-sep {
        color: #d1d5db;
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

  /** Lotes filtrados por etapa */
  primaryLots = computed(() => this.lots().filter((l) => l.transformationStage === 'primaria'));

  secondaryLots = computed(() => this.lots().filter((l) => l.transformationStage === 'secundaria'));

  /** Cuántos secundarios derivan de un lote primario dado */
  secondaryCountFor(primaryId: string): number {
    return this.secondaryLots().filter((l) => l.parentLotId === primaryId).length;
  }

  viewLotDetail(lot: ProductionLot): void {
    if (lot.transformationStage === 'secundaria') {
      this.router.navigate(['/projects', this.projectId(), 'secondary-lots', lot.id]);
    } else {
      this.router.navigate(['/projects', this.projectId(), 'production-lots', lot.id]);
    }
  }

  viewParentLot(lot: ProductionLot): void {
    if (lot.parentLotId) {
      this.router.navigate(['/projects', this.projectId(), 'production-lots', lot.parentLotId]);
    }
  }

  generateTraceabilityQr(lot: ProductionLot): void {
    this.notification.info(
      `Generación de QR de trazabilidad para ${lot.lotNumber} aún en desarrollo.`,
    );
  }

  sendToSecondaryTransformation(lot: ProductionLot): void {
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Crear lote de transformación secundaria?',
        message: `Se creará un nuevo lote secundario a partir del lote primario "${lot.lotNumber}".`,
        confirmText: 'Sí, continuar',
        cancelText: 'Cancelar',
        type: 'warning',
      },
    });

    confirmRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      const wizardRef = this.dialog.open(SecondaryTransformationWizardComponent, {
        width: '100%',
        maxWidth: '780px',
        data: { parentLot: lot },
        disableClose: true,
      });

      wizardRef.afterClosed().subscribe((result: SecondaryTransformationWizardResult | null) => {
        if (result?.created) {
          this.lotCreated.emit();
        }
      });
    });
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
