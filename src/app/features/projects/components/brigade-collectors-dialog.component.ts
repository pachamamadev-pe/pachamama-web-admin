import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrigadeCollector } from '../models/brigade-collector.model';
import { BrigadesService } from '../services/brigades.service';
import { BrigadeAssignmentsService } from '../services/brigade-assignments.service';
import { NotificationService } from '@core/services/notification.service';
import { parseDateValue } from '@app/shared/utils/date-helpers';

export interface BrigadeCollectorsDialogData {
  brigadeId: string;
  brigadeName: string;
}

@Component({
  selector: 'app-brigade-collectors-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  template: `
    <div class="dialog-container">
      <!-- Header -->
      <header class="dialog-header">
        <div class="header-content">
          <div class="header-icon">
            <mat-icon class="text-secondary">group</mat-icon>
          </div>
          <div class="header-text">
            <h2 class="text-title font-bold text-accent-titles">
              Recolectores de {{ data.brigadeName }}
            </h2>
            <p class="text-subtitle text-neutral-subheading">
              Lista de recolectores asignados a esta brigada
            </p>
          </div>
        </div>
        <button mat-icon-button (click)="close()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <div class="dialog-content">
        @if (loading()) {
          <!-- Loading State -->
          <div class="loading-container">
            <mat-spinner diameter="48" />
            <p class="text-body text-neutral-subheading mt-4">Cargando recolectores...</p>
          </div>
        } @else if (collectors().length === 0) {
          <!-- Empty State -->
          <div class="empty-state">
            <div class="empty-icon">
              <mat-icon>people_outline</mat-icon>
            </div>
            <h3 class="text-body font-bold text-accent-titles">No hay recolectores</h3>
            <p class="text-subtitle text-neutral-subheading">
              Esta brigada aún no tiene recolectores asignados. Los recolectores se unirán
              escaneando el código QR de onboarding.
            </p>
          </div>
        } @else {
          <!-- Desktop Table (hidden on mobile) -->
          <div class="table-wrapper hidden md:block">
            <table mat-table [dataSource]="collectors()" class="collectors-table">
              <!-- Nombre Column -->
              <ng-container matColumnDef="collectorName">
                <th mat-header-cell *matHeaderCellDef class="table-th">
                  <div class="th-content">
                    <mat-icon class="th-icon">person</mat-icon>
                    <span>Nombre</span>
                  </div>
                </th>
                <td mat-cell *matCellDef="let collector" class="table-td">
                  <span class="text-body font-bold">{{ collector.collectorName }}</span>
                </td>
              </ng-container>

              <!-- Teléfono Column -->
              <ng-container matColumnDef="collectorPhone">
                <th mat-header-cell *matHeaderCellDef class="table-th">
                  <div class="th-content">
                    <mat-icon class="th-icon">phone</mat-icon>
                    <span>Teléfono</span>
                  </div>
                </th>
                <td mat-cell *matCellDef="let collector" class="table-td">
                  <span class="text-body">{{ collector.collectorPhone }}</span>
                </td>
              </ng-container>

              <!-- Periodo Column -->
              <ng-container matColumnDef="startDate">
                <th mat-header-cell *matHeaderCellDef class="table-th">
                  <div class="th-content">
                    <mat-icon class="th-icon">calendar_today</mat-icon>
                    <span>Periodo de asignación</span>
                  </div>
                </th>
                <td mat-cell *matCellDef="let collector" class="table-td">
                  <span class="text-subtitle">{{ formatDateRange(collector) }}</span>
                </td>
              </ng-container>

              <!-- Estado de recolector Column 
              <ng-container matColumnDef="collectorStatus">
                <th mat-header-cell *matHeaderCellDef class="table-th">Estado de recolector</th>
                <td mat-cell *matCellDef="let collector" class="table-td">
                  <span [class]="'status-badge status-' + collector.collectorStatus.toLowerCase()">
                    {{ getStatusLabel(collector.collectorStatus) }}
                  </span>
                </td>
              </ng-container>-->

              <!-- Estado de asignación Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef class="table-th">Estado</th>
                <td mat-cell *matCellDef="let collector" class="table-td">
                  <span [class]="'status-badge status-' + collector.status.toLowerCase()">
                    {{ getStatusLabel(collector.status) }}
                  </span>
                </td>
              </ng-container>

              <!-- Acciones Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="table-th text-right">Acciones</th>
                <td mat-cell *matCellDef="let collector" class="table-td text-right">
                  <div class="actions-cell">
                    <button
                      mat-icon-button
                      class="btn-history"
                      (click)="openHistory(collector)"
                      matTooltip="Ver historial"
                    >
                      <mat-icon>history</mat-icon>
                    </button>
                    <span
                      class="complete-action-wrapper"
                      [matTooltip]="getCompleteAssignmentTooltip(collector.status)"
                    >
                      <button
                        mat-icon-button
                        class="btn-complete"
                        (click)="openCompleteAssignment(collector)"
                        [disabled]="!canCompleteAssignment(collector.status)"
                      >
                        <mat-icon>event_busy</mat-icon>
                      </button>
                    </span>
                    <!-- <mat-slide-toggle
                      [checked]="collector.status.toLowerCase() === 'active'"
                      (change)="toggleCollectorStatus(collector, $event.checked)"
                      [matTooltip]="
                        collector.status.toLowerCase() === 'active' ? 'Inactivar' : 'Activar'
                      "
                      color="primary"
                    /> -->
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: displayedColumns"
                [class.row-archived]="row.status.toLowerCase() === 'archived'"
              ></tr>
            </table>
          </div>

          <!-- Mobile Cards (visible only on mobile) -->
          <div class="mobile-cards md:hidden">
            @for (collector of collectors(); track collector.collectorName) {
              <div
                class="collector-card"
                [class.card-archived]="collector.status.toLowerCase() === 'archived'"
              >
                <div class="card-header">
                  <div class="collector-info">
                    <h3 class="text-body font-bold text-primary-black">
                      {{ collector.collectorName }}
                    </h3>
                    <span [class]="'status-badge status-' + collector.status.toLowerCase()">
                      {{ getStatusLabel(collector.status) }}
                    </span>
                  </div>
                </div>

                <div class="card-details">
                  <!--<div class="detail-row">
                    <mat-icon class="detail-icon">person_outline</mat-icon>
                    <span class="detail-label">Estado de recolector:</span>
                    <span
                      [class]="'status-badge status-' + collector.collectorStatus.toLowerCase()"
                    >
                      {{ getStatusLabel(collector.collectorStatus) }}
                    </span>
                  </div>-->
                  <div class="detail-row">
                    <mat-icon class="detail-icon">phone</mat-icon>
                    <span class="detail-label">Teléfono:</span>
                    <span class="detail-value">{{ collector.collectorPhone }}</span>
                  </div>
                  <div class="detail-row">
                    <mat-icon class="detail-icon">calendar_today</mat-icon>
                    <span class="detail-label">Inicio:</span>
                    <span class="detail-value">{{ collector.startDate }}</span>
                  </div>
                  @if (collector.endDate) {
                    <div class="detail-row">
                      <mat-icon class="detail-icon">event_available</mat-icon>
                      <span class="detail-label">Fin:</span>
                      <span class="detail-value">{{ collector.endDate }}</span>
                    </div>
                  }
                </div>

                <div class="card-actions">
                  <button
                    mat-stroked-button
                    class="btn-history-mobile"
                    (click)="openHistory(collector)"
                  >
                    <mat-icon>history</mat-icon>
                    <span>Historial</span>
                  </button>
                  <span
                    class="complete-action-wrapper complete-action-wrapper--mobile"
                    [matTooltip]="getCompleteAssignmentTooltip(collector.status)"
                  >
                    <button
                      mat-stroked-button
                      class="btn-complete-mobile"
                      (click)="openCompleteAssignment(collector)"
                      [disabled]="!canCompleteAssignment(collector.status)"
                    >
                      <mat-icon>event_busy</mat-icon>
                      <span>Finalizar asignación</span>
                    </button>
                  </span>
                </div>
              </div>
            }
          </div>

          <!-- Summary -->
          <div class="summary-bar">
            <div class="summary-item">
              <mat-icon class="summary-icon">group</mat-icon>
              <span class="text-body">
                <strong>{{ totalElements() }}</strong>
                recolector{{ totalElements() === 1 ? '' : 'es' }}
              </span>
            </div>
          </div>
        }
      </div>

      <!-- Footer -->
      <footer class="dialog-footer">
        <button mat-stroked-button (click)="close()">Cerrar</button>
      </footer>
    </div>
  `,
  styles: `
    .dialog-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 900px;
      max-height: 90vh;
      background: #ffffff;
    }

    /* Header */
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 24px;
      border-bottom: 1px solid #e5e5e5;
      background: #f9fafb;
    }

    .header-content {
      display: flex;
      gap: 16px;
      flex: 1;
    }

    .header-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #f4fbf6;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    .header-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;

      h2 {
        margin: 0;
        font-size: 20px;
        line-height: 1.3;
      }

      p {
        margin: 0;
        font-size: 13px;
      }
    }

    .close-button {
      flex-shrink: 0;
      margin: -8px -8px 0 0;
    }

    /* Content */
    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      min-height: 300px;
      max-height: calc(90vh - 200px);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Loading */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      gap: 16px;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .empty-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #f4fbf6;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #218358;
      }
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
      max-width: 400px;
      line-height: 1.6;
    }

    /* Desktop Table */
    .table-wrapper {
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
      max-height: 450px;
      overflow-y: auto;
      position: relative;

      /* Estilos para el scrollbar */
      &::-webkit-scrollbar {
        width: 8px;
      }

      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }

      &::-webkit-scrollbar-thumb {
        background: #218358;
        border-radius: 4px;

        &:hover {
          background: #1a6b47;
        }
      }
    }

    /* Force hide mobile cards on desktop */
    @media (min-width: 768px) {
      .mobile-cards {
        display: none !important;
      }
    }

    /* Force hide desktop table on mobile */
    @media (max-width: 767px) {
      .table-wrapper {
        display: none !important;
      }
    }

    .collectors-table {
      width: 100%;

      .table-th {
        background: #f9fafb;
        padding: 16px;
        font-size: 14px;
        font-weight: 700;
        color: #0a0a0a;
        border-bottom: 2px solid #e5e5e5;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .th-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .th-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #737373;
      }

      .table-td {
        padding: 16px;
        font-size: 14px;
        border-bottom: 1px solid #f3f4f6;
      }

      tr:hover {
        background: #f9fafb;
      }

      tr:last-child .table-td {
        border-bottom: none;
      }
    }

    .row-archived {
      opacity: 0.5;
      background: #fafafa;
    }

    /* Mobile Cards */
    .mobile-cards {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 450px;
      overflow-y: auto;
      padding-right: 4px;

      /* Estilos para el scrollbar en mobile */
      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: #218358;
        border-radius: 3px;

        &:hover {
          background: #1a6b47;
        }
      }
    }

    .collector-card {
      background: #ffffff;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 16px;
      transition: all 0.2s ease;

      &:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border-color: #d4d4d4;
      }
    }

    .card-archived {
      opacity: 0.6;
      background: #fafafa;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f3f4f6;
    }

    .collector-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;

      h3 {
        margin: 0;
        font-size: 15px;
      }
    }

    .card-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .detail-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #737373;
      flex-shrink: 0;
    }

    .detail-label {
      color: #737373;
      min-width: 60px;
    }

    .detail-value {
      color: #0a0a0a;
      font-weight: 500;
      flex: 1;
    }

    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-active {
      background: #f4fbf6;
      color: #218358;
      border: 1px solid #218358;
    }

    .status-inactive {
      background: #fef3f2;
      color: #dc2626;
      border: 1px solid #dc2626;
    }

    .status-archived {
      background: #f9fafb;
      color: #6b7280;
      border: 1px solid #9ca3af;
    }

    .status-expired {
      background: #fff7ed;
      color: #ea580c;
      border: 1px solid #ea580c;
    }

    .status-pending {
      background: #fefce8;
      color: #ca8a04;
      border: 1px solid #ca8a04;
    }

    .status-unknown {
      background: #f3f4f6;
      color: #6b7280;
      border: 1px solid #d1d5db;
    }

    .actions-cell {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      justify-content: flex-end;
    }

    .btn-history {
      color: #0284c7;
    }

    .btn-complete {
      color: #dc2626;
    }

    .btn-complete:disabled,
    .btn-complete[disabled] {
      color: #9ca3af;
      background: #f3f4f6;
      cursor: not-allowed;
      opacity: 1;
    }

    .complete-action-wrapper {
      display: inline-flex;
      align-items: center;
    }

    .card-actions {
      display: flex;
      gap: 8px;
    }

    .btn-history-mobile {
      color: #0284c7;
      border-color: #0284c7;
      flex: 1;
    }

    .btn-complete-mobile {
      color: #dc2626;
      border-color: #dc2626;
      flex: 1;
    }

    .btn-complete-mobile:disabled,
    .btn-complete-mobile[disabled] {
      color: #9ca3af;
      border-color: #d1d5db;
      background: #f3f4f6;
      cursor: not-allowed;
      opacity: 1;
    }

    .complete-action-wrapper--mobile {
      flex: 1;

      .btn-complete-mobile {
        width: 100%;
      }
    }

    /* Summary Bar */
    .summary-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 16px;
      padding: 16px;
      background: #f9fafb;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      flex-shrink: 0;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .summary-icon {
      color: #218358;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Footer */
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid #e5e5e5;
      background: #f9fafb;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .dialog-container {
        max-width: 100vw;
        max-height: 100vh;
      }

      .dialog-header,
      .dialog-content,
      .dialog-footer {
        padding: 16px;
      }

      .header-icon {
        width: 40px;
        height: 40px;

        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }
      }

      .header-text h2 {
        font-size: 18px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrigadeCollectorsDialogComponent {
  data = inject<BrigadeCollectorsDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<BrigadeCollectorsDialogComponent>);
  private dialog = inject(MatDialog);
  private brigadesService = inject(BrigadesService);
  private brigadeAssignmentsService = inject(BrigadeAssignmentsService);
  private notification = inject(NotificationService);

  collectors = signal<BrigadeCollector[]>([]);
  loading = signal(true);
  totalElements = signal(0);

  displayedColumns: string[] = [
    'collectorName',
    'collectorPhone',
    'startDate',
    //'collectorStatus',
    'status',
    'actions',
  ];

  constructor() {
    this.loadCollectors();
  }

  private loadCollectors(): void {
    this.loading.set(true);
    this.brigadesService.getBrigadeCollectors(this.data.brigadeId).subscribe({
      next: (response) => {
        this.collectors.set(response.content);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading brigade collectors:', error);
        this.notification.error('Error al cargar recolectores de la brigada');
        this.collectors.set([]);
        this.totalElements.set(0);
        this.loading.set(false);
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  toggleCollectorStatus(collector: BrigadeCollector, isActive: boolean): void {
    const newStatus: 'active' | 'inactive' = isActive ? 'active' : 'inactive';
    const actionLabel = isActive ? 'activado' : 'inactivado';

    this.brigadeAssignmentsService.toggleAssignmentStatus(collector.id, newStatus).subscribe({
      next: () => {
        this.notification.success(`Recolector ${actionLabel} correctamente`);
        this.loadCollectors();
      },
      error: (error) => {
        console.error('Error toggling collector status:', error);
        const errorMessage = error?.error?.message || `Error al cambiar el estado del recolector`;
        this.notification.error(errorMessage);
        // Recargar para revertir visualmente
        this.loadCollectors();
      },
    });
  }

  openHistory(collector: BrigadeCollector): void {
    import('./collector-history-dialog.component').then((m) => {
      this.dialog.open(m.CollectorHistoryDialogComponent, {
        width: '800px',
        maxWidth: '95vw',
        data: {
          collectorId: collector.collectorId,
          collectorName: collector.collectorName,
        },
      });
    });
  }

  openCompleteAssignment(collector: BrigadeCollector): void {
    if (!this.canCompleteAssignment(collector.status)) {
      return;
    }

    import('./complete-assignment-dialog.component').then((m) => {
      const dialogRef = this.dialog.open(m.CompleteAssignmentDialogComponent, {
        width: '520px',
        maxWidth: '95vw',
        data: {
          assignmentId: collector.id,
          collectorName: collector.collectorName,
          brigadeName: collector.brigadeName,
          startDate: collector.startDate,
        },
        disableClose: true,
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (!result) {
          return;
        }

        this.brigadeAssignmentsService.completeAssignment(collector.id, result).subscribe({
          next: () => {
            this.notification.success('Asignacion finalizada correctamente');
            this.loadCollectors();
          },
          error: (error) => {
            console.error('Error completing assignment:', error);
            const errorMessage = error?.error?.message || 'Error al finalizar asignacion';
            this.notification.error(errorMessage);
          },
        });
      });
    });
  }

  canCompleteAssignment(status: string): boolean {
    const normalizedStatus = status.toLowerCase();
    return normalizedStatus === 'pending' || normalizedStatus === 'active';
  }

  getCompleteAssignmentTooltip(status: string): string {
    if (this.canCompleteAssignment(status)) {
      return 'Finalizar asignación';
    }
    return 'Disponible solo para estados Pendiente o Activo';
  }

  getStatusLabel(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Inactivo';
      case 'archived':
        return 'Archivado';
      case 'expired':
        return 'Expirado';
      case 'pending':
        return 'Pendiente';
      default:
        return status;
    }
  }

  formatDateRange(request: BrigadeCollector): string {
    const start = (parseDateValue(request.startDate) ?? new Date(NaN)).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
    });

    if (!request.endDate) {
      return `Desde ${start}`;
    }

    const end = (parseDateValue(request.endDate) ?? new Date(NaN)).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  }
}
