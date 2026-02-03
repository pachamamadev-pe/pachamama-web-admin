import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@core/services/notification.service';
import { CollectionRequestsService } from '@features/collection-requests/services/collection-requests.service';
import { CollectionRequest } from '@features/collection-requests/models/collection-request.model';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

/**
 * Tab de revisión de solicitudes de recolección
 * Se muestra cuando el proyecto está en etapa 'collection' o posterior
 */
@Component({
  selector: 'app-collection-review-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="collection-review-container">
      @if (loading()) {
        <!-- Loading State -->
        <div class="loading-container">
          <mat-spinner diameter="48" />
          <p class="text-body text-neutral-subheading mt-4">Cargando solicitudes...</p>
        </div>
      } @else if (requests().length === 0) {
        <!-- Empty State -->
        <app-empty-state
          icon="description"
          [useMaterialIcon]="true"
          title="No hay solicitudes de recolección"
          description="Las solicitudes de recolección aparecerán aquí cuando los recolectores las envíen"
        />
      } @else {
        <!-- Filter chips -->
        <div class="filter-chips">
          <mat-chip-listbox [value]="statusFilter()" (change)="onStatusFilterChange($event.value)">
            <mat-chip-option value="all"> Todas ({{ requests().length }}) </mat-chip-option>
            <mat-chip-option value="pending" class="filter-chip-pending">
              Pendientes ({{ pendingCount() }})
            </mat-chip-option>
            <mat-chip-option value="observed" class="filter-chip-observed">
              Observadas ({{ observedCount() }})
            </mat-chip-option>
            <mat-chip-option value="approved" class="filter-chip-approved">
              Aprobadas ({{ approvedCount() }})
            </mat-chip-option>
            <mat-chip-option value="rejected" class="filter-chip-rejected">
              Rechazadas ({{ rejectedCount() }})
            </mat-chip-option>
          </mat-chip-listbox>
        </div>

        <!-- Requests Table -->
        <div class="requests-table-container">
          <table mat-table [dataSource]="filteredRequests()" class="requests-table">
            <!-- Request Number -->
            <ng-container matColumnDef="requestNumber">
              <th mat-header-cell *matHeaderCellDef class="table-th">N° Solicitud</th>
              <td mat-cell *matCellDef="let request" class="table-td">
                <span class="font-mono font-bold text-accent-titles">{{
                  request.requestNumber
                }}</span>
              </td>
            </ng-container>

            <!-- Requested Weighing -->
            <ng-container matColumnDef="requestedWeighing">
              <th mat-header-cell *matHeaderCellDef class="table-th text-right">Peso (kg)</th>
              <td mat-cell *matCellDef="let request" class="table-td text-right">
                <span class="font-bold text-secondary">
                  {{ request.requestedWeighing | number: '1.2-2' }}
                </span>
              </td>
            </ng-container>

            <!-- Date Range -->
            <ng-container matColumnDef="dateRange">
              <th mat-header-cell *matHeaderCellDef class="table-th">Periodo</th>
              <td mat-cell *matCellDef="let request" class="table-td">
                <div class="flex items-center gap-1">
                  <mat-icon class="detail-icon">event</mat-icon>
                  <span class="text-subtitle">{{ formatDateRange(request) }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Requested By -->
            <ng-container matColumnDef="requestedBy">
              <th mat-header-cell *matHeaderCellDef class="table-th">Solicitante</th>
              <td mat-cell *matCellDef="let request" class="table-td">
                <div class="flex flex-col">
                  <span class="text-body">{{ request.requestedByName }}</span>
                  <span class="text-subtitle text-neutral-subheading">
                    {{ request.requestedAt | date: 'dd/MM/yyyy HH:mm' }}
                  </span>
                </div>
              </td>
            </ng-container>

            <!-- Status -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef class="table-th">Estado</th>
              <td mat-cell *matCellDef="let request" class="table-td">
                <mat-chip [class]="getStatusClass(request.status)">
                  <mat-icon [class]="getStatusIconClass(request.status)" class="status-icon">{{
                    getStatusIcon(request.status)
                  }}</mat-icon>
                  {{ getStatusLabel(request.status) }}
                </mat-chip>
                @if (request.observationCount > 0) {
                  <span class="text-subtitle text-neutral-subheading ml-2">
                    ({{ request.observationCount }} obs.)
                  </span>
                }
              </td>
            </ng-container>

            <!-- Actions -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="table-th text-right">Acciones</th>
              <td mat-cell *matCellDef="let request" class="table-td text-right">
                <button
                  mat-raised-button
                  [color]="request.status === 'pending' ? 'primary' : 'accent'"
                  (click)="openReviewDialog(request)"
                  [matTooltip]="
                    request.status === 'pending' ? 'Revisar solicitud' : 'Ver detalles e historial'
                  "
                >
                  <mat-icon>{{
                    request.status === 'pending' ? 'rate_review' : 'visibility'
                  }}</mat-icon>
                  {{ request.status === 'pending' ? 'Revisar' : 'Ver detalles' }}
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns" class="table-row"></tr>
          </table>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .collection-review-container {
        padding: 1.5rem;
        background-color: #f9fafb;
        min-height: 400px;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 1rem;
      }

      .filter-chips {
        margin-bottom: 1.5rem;
      }

      mat-chip-listbox {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      mat-chip-option {
        font-size: 13px;
        border: 1px solid #e5e5e5;
        background-color: white;
      }

      mat-chip-option.mat-mdc-chip-selected {
        background-color: #218358 !important;
        color: white !important;
      }

      .filter-chip-pending.mat-mdc-chip-selected {
        background-color: #fe714b !important;
        color: white !important;
      }

      .filter-chip-observed.mat-mdc-chip-selected {
        background-color: #f59e0b !important;
        color: white !important;
      }

      .filter-chip-approved.mat-mdc-chip-selected {
        background-color: #218358 !important;
        color: white !important;
      }

      .filter-chip-rejected.mat-mdc-chip-selected {
        background-color: #ef4444 !important;
        color: white !important;
      }

      .requests-table-container {
        background-color: white;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        overflow: hidden;
      }

      .requests-table {
        width: 100%;
      }

      ::ng-deep .mat-mdc-header-row {
        background-color: #f9faf3;
        border-bottom: 1px solid #e5e5e5;
      }

      ::ng-deep .mat-mdc-row {
        border-bottom: 1px solid #e5e5e5;
        transition: background-color 0.15s ease;

        &:hover {
          background-color: #f4fbf6;
        }

        &:last-child {
          border-bottom: none;
        }
      }

      .table-th {
        font-size: 12px;
        font-weight: 700;
        color: #218358;
        padding: 12px 16px;
      }

      .table-td {
        font-size: 14px;
        color: #0a0a0a;
        padding: 12px 16px;
      }

      .detail-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #737373;
      }

      // Status chips
      .status-pending {
        background-color: #fff5f2 !important;
        color: #fe714b !important;
        font-weight: 600 !important;
      }

      .status-approved {
        background-color: #f4fbf6 !important;
        color: #218358 !important;
        font-weight: 600 !important;
      }

      .status-rejected {
        background-color: #fef2f2 !important;
        color: #ef4444 !important;
        font-weight: 600 !important;
      }

      .status-observed {
        background-color: #fffbeb !important;
        color: #f59e0b !important;
        font-weight: 600 !important;
      }

      .status-cancelled {
        background-color: #f3f4f6 !important;
        color: #6b7280 !important;
        font-weight: 600 !important;
      }

      // Status icons
      .status-icon {
        font-size: 16px !important;
        width: 16px !important;
        height: 16px !important;
        margin-right: 4px !important;
        vertical-align: middle;
      }

      .icon-pending {
        color: #fe714b;
      }

      .icon-approved {
        color: #218358;
      }

      .icon-rejected {
        color: #ef4444;
      }

      .icon-observed {
        color: #f59e0b;
      }

      .icon-cancelled {
        color: #6b7280;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionReviewTabComponent implements OnInit {
  private collectionRequestsService = inject(CollectionRequestsService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  // Input: ID del proyecto
  projectId = input.required<string>();

  // State
  loading = signal(true);
  requests = signal<CollectionRequest[]>([]);
  statusFilter = signal<string>('all');

  // Computed: solicitudes filtradas por estado
  filteredRequests = computed(() => {
    const filter = this.statusFilter();
    if (filter === 'all') return this.requests();
    return this.requests().filter((req) => req.status === filter);
  });

  // Computed: contadores por estado
  pendingCount = computed(() => this.requests().filter((r) => r.status === 'pending').length);
  observedCount = computed(() => this.requests().filter((r) => r.status === 'observed').length);
  approvedCount = computed(() => this.requests().filter((r) => r.status === 'approved').length);
  rejectedCount = computed(() => this.requests().filter((r) => r.status === 'rejected').length);

  // Columnas de la tabla
  displayedColumns: string[] = [
    'requestNumber',
    'requestedWeighing',
    'dateRange',
    'requestedBy',
    'status',
    'actions',
  ];

  ngOnInit(): void {
    this.loadRequests();
  }

  /**
   * Método público para recargar solicitudes desde el componente padre
   */
  reload(): void {
    this.loadRequests();
  }

  private loadRequests(): void {
    this.loading.set(true);
    this.collectionRequestsService.getCollectionRequestsByProject(this.projectId()).subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading collection requests:', error);
        this.notification.error('Error al cargar solicitudes de recolección');
        this.requests.set([]);
        this.loading.set(false);
      },
    });
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter.set(status);
  }

  openReviewDialog(request: CollectionRequest): void {
    import('./collection-request-review-dialog.component').then((m) => {
      const dialogRef = this.dialog.open(m.CollectionRequestReviewDialogComponent, {
        width: '700px',
        maxWidth: '95vw',
        data: {
          request,
          readOnly: request.status !== 'pending',
        },
        disableClose: true,
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result?.success) {
          this.loadRequests(); // Recargar lista tras revisar
        }
      });
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      observed: 'Observado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      observed: 'status-observed',
      cancelled: 'status-cancelled',
    };
    return classes[status] || '';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: 'schedule',
      approved: 'check_circle',
      rejected: 'cancel',
      observed: 'info',
      cancelled: 'block',
    };
    return icons[status] || 'help';
  }

  getStatusIconClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'icon-pending',
      approved: 'icon-approved',
      rejected: 'icon-rejected',
      observed: 'icon-observed',
      cancelled: 'icon-cancelled',
    };
    return classes[status] || '';
  }

  formatDateRange(request: CollectionRequest): string {
    const start = new Date(request.startDate).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
    });
    const end = new Date(request.endDate).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  }
}
