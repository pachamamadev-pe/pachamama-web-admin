import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { BrigadeCollector } from '../models/brigade-collector.model';
import { BrigadesService } from '../services/brigades.service';
import { NotificationService } from '@core/services/notification.service';

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
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 class="dialog-title">Recolectores de {{ data.brigadeName }}</h2>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content">
        @if (loading()) {
          <!-- Loading State -->
          <div class="loading-container">
            <mat-spinner diameter="48" />
            <p class="loading-text">Cargando recolectores...</p>
          </div>
        } @else if (collectors().length === 0) {
          <!-- Empty State -->
          <div class="empty-state">
            <mat-icon class="empty-icon">people_outline</mat-icon>
            <h3 class="empty-title">No hay recolectores</h3>
            <p class="empty-description">Esta brigada aún no tiene recolectores asignados</p>
          </div>
        } @else {
          <!-- Table -->
          <div class="table-container">
            <table mat-table [dataSource]="collectors()" class="collectors-table">
              <!-- Nombre Column -->
              <ng-container matColumnDef="collectorName">
                <th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let collector">
                  {{ collector.collectorName }}
                </td>
              </ng-container>

              <!-- Teléfono Column -->
              <ng-container matColumnDef="collectorPhone">
                <th mat-header-cell *matHeaderCellDef>Teléfono</th>
                <td mat-cell *matCellDef="let collector">
                  {{ collector.collectorPhone }}
                </td>
              </ng-container>

              <!-- Fecha de Inicio Column -->
              <ng-container matColumnDef="startDate">
                <th mat-header-cell *matHeaderCellDef>Fecha de Inicio</th>
                <td mat-cell *matCellDef="let collector">
                  {{ collector.startDate }}
                </td>
              </ng-container>

              <!-- Fecha de Fin Column -->
              <ng-container matColumnDef="endDate">
                <th mat-header-cell *matHeaderCellDef>Fecha de Fin</th>
                <td mat-cell *matCellDef="let collector">
                  {{ collector.endDate || '-' }}
                </td>
              </ng-container>

              <!-- Estado Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let collector">
                  <mat-chip [class]="getStatusClass(collector.status)" selected>
                    {{ getStatusLabel(collector.status) }}
                  </mat-chip>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: displayedColumns"
                [class]="getRowClass(row.status)"
              ></tr>
            </table>
          </div>

          <!-- Total Count -->
          <div class="total-count">
            Total: {{ totalElements() }} recolector{{ totalElements() === 1 ? '' : 'es' }}
          </div>
        }
      </div>

      <div class="dialog-actions">
        <button mat-stroked-button (click)="close()">Cerrar</button>
      </div>
    </div>
  `,
  styles: `
    .dialog-container {
      display: flex;
      flex-direction: column;
      max-height: 80vh;
      width: 600px;
      max-width: 90vw;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e5e5e5;
    }

    .dialog-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #0a0a0a;
    }

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 16px;
    }

    .loading-text {
      color: #737373;
      font-size: 14px;
      margin: 0;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #d4d4d4;
      margin-bottom: 16px;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 700;
      color: #0a0a0a;
      margin: 0 0 8px 0;
    }

    .empty-description {
      font-size: 14px;
      color: #737373;
      margin: 0;
    }

    .table-container {
      overflow-x: auto;
      background-color: #ffffff;
      border-radius: 8px;
      border: 1px solid #e5e5e5;
    }

    .collectors-table {
      width: 100%;

      th {
        background-color: #f9fafb;
        color: #0a0a0a;
        font-weight: 700;
        font-size: 14px;
        padding: 16px;
        border-bottom: 2px solid #e5e5e5;
      }

      td {
        padding: 16px;
        color: #0a0a0a;
        font-size: 14px;
        border-bottom: 1px solid #f3f4f6;
      }

      tr:hover {
        background-color: #f9fafb;
      }

      tr:last-child td {
        border-bottom: none;
      }
    }

    .total-count {
      margin-top: 16px;
      text-align: right;
      font-size: 14px;
      color: #737373;
      font-weight: 500;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid #e5e5e5;
      gap: 12px;
    }

    // Status chip styles
    ::ng-deep .mat-mdc-chip.status-active {
      --mdc-chip-container-color: #f4fbf6;
      --mdc-chip-label-text-color: #218358;
      --mdc-chip-outline-color: #218358;
    }

    ::ng-deep .mat-mdc-chip.status-inactive {
      --mdc-chip-container-color: #fef3f2;
      --mdc-chip-label-text-color: #dc2626;
      --mdc-chip-outline-color: #dc2626;
    }

    ::ng-deep .mat-mdc-chip.status-archived {
      --mdc-chip-container-color: #f9fafb;
      --mdc-chip-label-text-color: #6b7280;
      --mdc-chip-outline-color: #6b7280;
    }

    ::ng-deep .mat-mdc-chip.status-default {
      --mdc-chip-container-color: #f3f4f6;
      --mdc-chip-label-text-color: #374151;
      --mdc-chip-outline-color: #374151;
    }

    .row-archived {
      opacity: 0.6;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrigadeCollectorsDialogComponent {
  data = inject<BrigadeCollectorsDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<BrigadeCollectorsDialogComponent>);
  private brigadesService = inject(BrigadesService);
  private notification = inject(NotificationService);

  collectors = signal<BrigadeCollector[]>([]);
  loading = signal(true);
  totalElements = signal(0);

  displayedColumns: string[] = [
    'collectorName',
    'collectorPhone',
    'startDate',
    'endDate',
    'status',
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

  getStatusLabel(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Inactivo';
      case 'archived':
        return 'Archivado';
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'archived':
        return 'status-archived';
      default:
        return 'status-default';
    }
  }

  getRowClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'archived':
        return 'row-archived';
      default:
        return '';
    }
  }
}
