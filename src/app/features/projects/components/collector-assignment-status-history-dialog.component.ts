import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { CollectorAssignmentStatusService } from '../services/collector-assignment-status.service';
import { NotificationService } from '@core/services/notification.service';
import {
  CollectorAssignmentStatus,
  CollectorAssignmentStatusHistoryItem,
} from '../models/collector-assignment-status.model';

export interface CollectorAssignmentStatusHistoryDialogData {
  projectCommunityCollectorId: string;
  collectorName: string;
}

@Component({
  selector: 'app-collector-assignment-status-history-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
  ],
  template: `
    <div class="dialog-container">
      <header class="dialog-header">
        <div class="header-content">
          <div class="header-icon">
            <mat-icon class="text-secondary">history</mat-icon>
          </div>
          <div class="header-text">
            <h2 class="text-title font-bold text-accent-titles">Historial de cambios</h2>
            <p class="text-subtitle text-neutral-subheading">{{ data.collectorName }}</p>
          </div>
        </div>
        <button mat-icon-button (click)="close()" aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <div class="dialog-content">
        @if (loading()) {
          <div class="loading-container">
            <mat-spinner diameter="40" />
            <p class="text-subtitle text-neutral-subheading mt-3">Cargando historial...</p>
          </div>
        } @else if (history().length === 0) {
          <div class="empty-state">
            <mat-icon>history_toggle_off</mat-icon>
            <p class="text-subtitle text-neutral-subheading">No hay cambios registrados</p>
          </div>
        } @else {
          <table mat-table [dataSource]="history()" class="history-table">
            <ng-container matColumnDef="changedAt">
              <th mat-header-cell *matHeaderCellDef>Fecha</th>
              <td mat-cell *matCellDef="let item">{{ formatDate(item.changedAt) }}</td>
            </ng-container>

            <ng-container matColumnDef="changedByName">
              <th mat-header-cell *matHeaderCellDef>Usuario</th>
              <td mat-cell *matCellDef="let item">{{ item.changedByName || item.changedBy }}</td>
            </ng-container>

            <ng-container matColumnDef="transition">
              <th mat-header-cell *matHeaderCellDef>Cambio</th>
              <td mat-cell *matCellDef="let item">
                <div class="status-transition">
                  <mat-chip [class]="getStatusClass(item.previousStatus)">
                    {{ getStatusLabel(item.previousStatus) }}
                  </mat-chip>
                  <mat-icon>arrow_right_alt</mat-icon>
                  <mat-chip [class]="getStatusClass(item.newStatus)">
                    {{ getStatusLabel(item.newStatus) }}
                  </mat-chip>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="reason">
              <th mat-header-cell *matHeaderCellDef>Motivo</th>
              <td mat-cell *matCellDef="let item">{{ item.reason }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        }
      </div>

      <footer class="dialog-footer">
        <button mat-stroked-button (click)="close()">Cerrar</button>
      </footer>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        width: min(980px, 95vw);
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      }

      .dialog-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid #e5e5e5;
      }

      .header-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .header-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: #f4fbf6;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .header-text h2,
      .header-text p {
        margin: 0;
      }

      .dialog-content {
        padding: 16px 20px;
        overflow: auto;
      }

      .loading-container,
      .empty-state {
        min-height: 180px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .history-table {
        width: 100%;
      }

      .status-transition {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .status-active {
        background-color: #f4fbf6;
        color: #218358;
        border: 1px solid #218358;
      }

      .status-inactive {
        background-color: #fef3f2;
        color: #dc2626;
        border: 1px solid #dc2626;
      }

      .status-archived {
        background-color: #f3f4f6;
        color: #6b7280;
        border: 1px solid #9ca3af;
      }

      .dialog-footer {
        display: flex;
        justify-content: flex-end;
        padding: 12px 20px 16px;
        border-top: 1px solid #e5e5e5;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorAssignmentStatusHistoryDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<CollectorAssignmentStatusHistoryDialogComponent>);
  private collectorAssignmentStatusService = inject(CollectorAssignmentStatusService);
  private notification = inject(NotificationService);

  data = inject<CollectorAssignmentStatusHistoryDialogData>(MAT_DIALOG_DATA);

  loading = signal(false);
  history = signal<CollectorAssignmentStatusHistoryItem[]>([]);

  displayedColumns: string[] = ['changedAt', 'changedByName', 'transition', 'reason'];

  ngOnInit(): void {
    this.loadHistory();
  }

  private loadHistory(): void {
    this.loading.set(true);
    this.collectorAssignmentStatusService
      .getHistory(this.data.projectCommunityCollectorId)
      .subscribe({
        next: (history) => {
          this.history.set(history ?? []);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading assignment status history:', error);
          this.notification.error('Error al cargar historial de cambios');
          this.history.set([]);
          this.loading.set(false);
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('es-PE');
  }

  getStatusLabel(status: CollectorAssignmentStatus): string {
    const labels: Record<CollectorAssignmentStatus, string> = {
      active: 'Activo',
      inactive: 'Inactivo',
      archived: 'Archivado',
    };

    return labels[status];
  }

  getStatusClass(status: CollectorAssignmentStatus): string {
    return `status-${status}`;
  }
}
