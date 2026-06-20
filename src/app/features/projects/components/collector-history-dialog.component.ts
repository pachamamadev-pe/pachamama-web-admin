import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrigadeAssignmentsService } from '../services/brigade-assignments.service';
import { NotificationService } from '@core/services/notification.service';
import { BrigadeAssignment } from '../models/brigade-assignment.model';

export interface CollectorHistoryDialogData {
  collectorId: string;
  collectorName: string;
}

@Component({
  selector: 'app-collector-history-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dialog-container">
      <header class="dialog-header">
        <div class="header-content">
          <div class="header-icon">
            <mat-icon class="text-secondary">history</mat-icon>
          </div>
          <div class="header-text">
            <h2 class="text-title font-bold text-accent-titles">
              Historial de {{ data.collectorName }}
            </h2>
            <p class="text-subtitle text-neutral-subheading">
              Brigadas asignadas y estado de cada asignacion
            </p>
          </div>
        </div>
        <button mat-icon-button (click)="close()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <div class="dialog-content">
        @if (loading()) {
          <div class="loading-container">
            <mat-spinner diameter="48" />
            <p class="text-body text-neutral-subheading mt-4">Cargando historial...</p>
          </div>
        } @else if (assignments().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <mat-icon>history</mat-icon>
            </div>
            <h3 class="text-body font-bold text-accent-titles">Sin historial</h3>
            <p class="text-subtitle text-neutral-subheading">
              Este recolector aun no tiene asignaciones registradas.
            </p>
          </div>
        } @else {
          <div class="table-wrapper">
            <table mat-table [dataSource]="assignments()" class="history-table">
              <ng-container matColumnDef="brigade">
                <th mat-header-cell *matHeaderCellDef class="table-th">Brigada</th>
                <td mat-cell *matCellDef="let assignment" class="table-td">
                  {{ assignment.brigadeName }}
                </td>
              </ng-container>

              <ng-container matColumnDef="startDate">
                <th mat-header-cell *matHeaderCellDef class="table-th">Inicio</th>
                <td mat-cell *matCellDef="let assignment" class="table-td">
                  {{ assignment.startDate }}
                </td>
              </ng-container>

              <ng-container matColumnDef="endDate">
                <th mat-header-cell *matHeaderCellDef class="table-th">Fin</th>
                <td mat-cell *matCellDef="let assignment" class="table-td">
                  {{ assignment.endDate || '-' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef class="table-th">Estado</th>
                <td mat-cell *matCellDef="let assignment" class="table-td">
                  <mat-chip [class]="getStatusClass(assignment.status)">
                    {{ getStatusLabel(assignment.status) }}
                  </mat-chip>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </div>
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
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 800px;
        max-height: 90vh;
        background: #ffffff;
      }

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

      .dialog-content {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
      }

      .loading-container,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
      }

      .empty-icon {
        width: 80px;
        height: 80px;
        background-color: #f4fbf6;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1.5rem;
      }

      .empty-icon mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: #218358;
      }

      .history-table {
        width: 100%;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .table-th {
        background-color: #f9fafb;
        padding: 1rem;
        font-weight: 600;
        font-size: 14px;
        color: #0a0a0a;
      }

      .table-td {
        padding: 1rem;
        font-size: 14px;
        color: #0a0a0a;
        border-bottom: 1px solid #e5e5e5;
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
        padding: 16px 24px;
        border-top: 1px solid #e5e5e5;
        background: #f9fafb;
      }

      @media (max-width: 640px) {
        .dialog-container {
          max-width: 100vw;
          max-height: 100vh;
        }

        .dialog-header,
        .dialog-content,
        .dialog-footer {
          padding: 16px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorHistoryDialogComponent {
  data = inject<CollectorHistoryDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<CollectorHistoryDialogComponent>);
  private brigadeAssignmentsService = inject(BrigadeAssignmentsService);
  private notification = inject(NotificationService);

  assignments = signal<BrigadeAssignment[]>([]);
  loading = signal(true);

  displayedColumns: string[] = ['brigade', 'startDate', 'endDate', 'status'];

  constructor() {
    this.loadHistory();
  }

  private loadHistory(): void {
    this.loading.set(true);
    this.brigadeAssignmentsService.getCollectorHistory(this.data.collectorId).subscribe({
      next: (response) => {
        this.assignments.set(response ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading collector history:', error);
        this.notification.error('Error al cargar historial del recolector');
        this.assignments.set([]);
        this.loading.set(false);
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  getStatusLabel(status: string): string {
    status = status.toLowerCase();
    if (status === 'active') {
      return 'Activo';
    }
    if (status === 'archived') {
      return 'Archivado';
    }
    if (status === 'expired') {
      return 'Expirado';
    }
    if (status === 'pending') {
      return 'Pendiente';
    }
    return 'Inactivo';
  }

  getStatusClass(status: string): string {
    status = status.toLowerCase();
    if (status === 'active') {
      return 'status-active';
    }
    if (status === 'archived') {
      return 'status-archived';
    }
    if (status === 'expired' || status === 'pending') {
      return 'status-inactive';
    }
    return 'status-inactive';
  }
}
