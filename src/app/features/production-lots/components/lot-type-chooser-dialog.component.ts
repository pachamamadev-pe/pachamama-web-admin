import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TransformationStage } from '../models/production-lot-search.model';

export type LotTypeChoice = TransformationStage | null;

/**
 * Diálogo selector del tipo de lote de transformación
 *
 * Muestra dos cards elegantes para que el usuario elija entre
 * Transformación Primaria o Secundaria antes de abrir el wizard correspondiente.
 */
@Component({
  selector: 'app-lot-type-chooser-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="chooser-root">
      <!-- ── Header ──────────────────────────────────────────────── -->
      <div class="chooser-header">
        <div>
          <h2 class="chooser-title">Nuevo Lote de Transformación</h2>
          <p class="chooser-subtitle">Elige el tipo de proceso para comenzar</p>
        </div>
        <button mat-icon-button class="close-btn" (click)="close()" aria-label="Cerrar diálogo">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- ── Cards ───────────────────────────────────────────────── -->
      <div class="cards-grid">
        <!-- Primaria -->
        <button
          type="button"
          class="type-card type-card--primary"
          (click)="select('primaria')"
          aria-label="Crear lote de transformación primaria"
        >
          <div class="card-icon-ring card-icon-ring--primary">
            <mat-icon class="card-icon">factory</mat-icon>
          </div>

          <div class="card-body">
            <h3 class="card-title">Transformación Primaria</h3>
            <p class="card-desc">
              Procesa lotes de acopio de distintos proyectos para obtener pulpa u otros productos
              terminados.
            </p>
            <ul class="card-features">
              <li>
                <mat-icon class="feat-icon feat-icon--primary">check_circle</mat-icon>
                <span>Múltiples lotes de acopio de distintos proyectos</span>
              </li>
              <li>
                <mat-icon class="feat-icon feat-icon--primary">check_circle</mat-icon>
                <span>Proceso completo de transformación</span>
              </li>
            </ul>
          </div>

          <div class="card-cta card-cta--primary">
            <span>Crear lote primario</span>
            <mat-icon>arrow_forward</mat-icon>
          </div>
        </button>

        <!-- Secundaria -->
        <button
          type="button"
          class="type-card type-card--secondary"
          (click)="select('secundaria')"
          aria-label="Crear lote de transformación secundaria"
        >
          <div class="card-icon-ring card-icon-ring--secondary">
            <mat-icon class="card-icon">transform</mat-icon>
          </div>

          <div class="card-body">
            <h3 class="card-title">Transformación Secundaria</h3>
            <p class="card-desc">
              Procesa uno o varios lotes de transformación primaria finalizados para una segunda
              etapa de producción.
            </p>
            <ul class="card-features">
              <li>
                <mat-icon class="feat-icon feat-icon--secondary">check_circle</mat-icon>
                <span>Múltiples lotes primarios de la misma empresa</span>
              </li>
              <li>
                <mat-icon class="feat-icon feat-icon--secondary">check_circle</mat-icon>
                <span>Proceso de recepción y transporte</span>
              </li>
            </ul>
          </div>

          <div class="card-cta card-cta--secondary">
            <span>Crear lote secundario</span>
            <mat-icon>arrow_forward</mat-icon>
          </div>
        </button>
      </div>

      <!-- ── Footer ──────────────────────────────────────────────── -->
      <div class="chooser-footer">
        <button mat-stroked-button (click)="close()">Cancelar</button>
      </div>
    </div>
  `,
  styles: [
    `
      /* ─── Root ───────────────────────────────────────────────── */
      .chooser-root {
        width: 100%;
        display: flex;
        flex-direction: column;
      }

      /* ─── Header ─────────────────────────────────────────────── */
      .chooser-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.5rem 1.5rem 1.25rem;
        border-bottom: 1px solid #e5e5e5;
      }

      .chooser-title {
        font-size: 1.125rem;
        font-weight: 700;
        color: #0a0a0a;
        margin: 0 0 0.25rem;
        line-height: 1.3;
      }

      .chooser-subtitle {
        font-size: 0.875rem;
        color: #737373;
        margin: 0;
      }

      .close-btn {
        flex-shrink: 0;
        margin-top: -6px;
        margin-right: -6px;
      }

      /* ─── Cards Grid ─────────────────────────────────────────── */
      .cards-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
        padding: 1.5rem;
      }

      @media (min-width: 540px) {
        .cards-grid {
          grid-template-columns: 1fr 1fr;
        }
      }

      /* ─── Type Card ──────────────────────────────────────────── */
      .type-card {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1.375rem;
        border-radius: 1rem;
        border: 2px solid #e5e7eb;
        background: #ffffff;
        cursor: pointer;
        text-align: left;
        transition:
          border-color 0.18s ease,
          background 0.18s ease,
          transform 0.18s ease,
          box-shadow 0.18s ease;
        width: 100%;
        outline: none;
      }

      .type-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
      }

      .type-card:focus-visible {
        outline: 2px solid #218358;
        outline-offset: 3px;
      }

      /* Primary hover */
      .type-card--primary:hover {
        border-color: #218358;
        background: #f0fdf4;
      }

      /* Secondary hover */
      .type-card--secondary:hover {
        border-color: #2563eb;
        background: #eff6ff;
      }

      /* ─── Card Icon Ring ─────────────────────────────────────── */
      .card-icon-ring {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .card-icon-ring--primary {
        background: #dcfce7;
        color: #218358;
      }

      .card-icon-ring--secondary {
        background: #dbeafe;
        color: #2563eb;
      }

      .card-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      /* ─── Card Body ──────────────────────────────────────────── */
      .card-body {
        flex: 1;
      }

      .card-title {
        font-size: 1rem;
        font-weight: 700;
        color: #0a0a0a;
        margin: 0 0 0.5rem;
      }

      .card-desc {
        font-size: 0.8125rem;
        color: #737373;
        line-height: 1.55;
        margin: 0 0 0.875rem;
      }

      .card-features {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .card-features li {
        display: flex;
        align-items: flex-start;
        gap: 0.375rem;
        font-size: 0.75rem;
        color: #4b5563;
        line-height: 1.45;
      }

      .feat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .feat-icon--primary {
        color: #218358;
      }

      .feat-icon--secondary {
        color: #2563eb;
      }

      /* ─── Card CTA ───────────────────────────────────────────── */
      .card-cta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.625rem 0.875rem;
        border-radius: 0.625rem;
        font-size: 0.875rem;
        font-weight: 600;
        transition:
          background 0.15s ease,
          color 0.15s ease;
      }

      .card-cta mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        transition: transform 0.15s ease;
      }

      .type-card:hover .card-cta mat-icon {
        transform: translateX(3px);
      }

      /* Primary CTA */
      .card-cta--primary {
        background: #dcfce7;
        color: #15803d;
      }

      .type-card--primary:hover .card-cta--primary {
        background: #218358;
        color: #ffffff;
      }

      /* Secondary CTA */
      .card-cta--secondary {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .type-card--secondary:hover .card-cta--secondary {
        background: #2563eb;
        color: #ffffff;
      }

      /* ─── Footer ─────────────────────────────────────────────── */
      .chooser-footer {
        display: flex;
        justify-content: flex-end;
        padding: 1rem 1.5rem;
        border-top: 1px solid #e5e5e5;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LotTypeChooserDialogComponent {
  private dialogRef = inject(MatDialogRef<LotTypeChooserDialogComponent>);

  select(type: TransformationStage): void {
    this.dialogRef.close(type);
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
