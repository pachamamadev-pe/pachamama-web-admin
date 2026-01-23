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
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { CollectorsService } from '../services/collectors.service';
import { BrigadesService } from '../services/brigades.service';
import { BrigadeAssignmentsService } from '../services/brigade-assignments.service';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { Collector } from '../models/collector.model';
import { Brigade } from '../models/brigade.model';

@Component({
  selector: 'app-collectors-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="collectors-container">
      @if (loading()) {
        <!-- Loading State -->
        <div class="loading-container">
          <mat-spinner diameter="48" />
          <p class="text-body text-neutral-subheading mt-4">Cargando recolectores...</p>
        </div>
      } @else {
        <!-- Collectors Table (Desktop) -->
        <div class="desktop-only">
          <div class="collectors-table">
            <table mat-table [dataSource]="paginatedCollectors()" class="table-auto w-full">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef class="table-th text-left">Nombres</th>
                <td mat-cell *matCellDef="let collector" class="table-td">
                  {{ collector.name }}
                </td>
              </ng-container>

              <ng-container matColumnDef="lastName">
                <th mat-header-cell *matHeaderCellDef class="table-th text-left">Apellidos</th>
                <td mat-cell *matCellDef="let collector" class="table-td">
                  {{ collector.lastName }}
                </td>
              </ng-container>

              <ng-container matColumnDef="documentType">
                <th mat-header-cell *matHeaderCellDef class="table-th text-left">Tipo Doc.</th>
                <td mat-cell *matCellDef="let collector" class="table-td">
                  {{ collector.documentType }}
                </td>
              </ng-container>

              <ng-container matColumnDef="documentNumber">
                <th mat-header-cell *matHeaderCellDef class="table-th text-left">N° Doc.</th>
                <td mat-cell *matCellDef="let collector" class="table-td">
                  {{ collector.documentNumber }}
                </td>
              </ng-container>

              <ng-container matColumnDef="phone">
                <th mat-header-cell *matHeaderCellDef class="table-th text-left">Teléfono</th>
                <td mat-cell *matCellDef="let collector" class="table-td">
                  {{ collector.phone || '-' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="assignedBrigade">
                <th mat-header-cell *matHeaderCellDef class="table-th text-left">Brigada</th>
                <td mat-cell *matCellDef="let collector" class="table-td">
                  <mat-form-field class="brigade-selector" appearance="outline">
                    <mat-select
                      [value]="collector.currentBrigadeId || ''"
                      (selectionChange)="onBrigadeChange(collector, $event.value)"
                      [disabled]="collector.status === 'inactive'"
                    >
                      <mat-option value="">Sin asignar</mat-option>
                      @for (brigade of brigades(); track brigade.id) {
                        <mat-option [value]="brigade.id">
                          {{ brigade.name }}
                        </mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef class="table-th text-left">Estado</th>
                <td mat-cell *matCellDef="let collector" class="table-td">
                  <mat-chip [class]="getCollectorStatusClass(collector.status)">
                    {{ getCollectorStatusLabel(collector.status) }}
                  </mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="table-th text-right">Acciones</th>
                <td mat-cell *matCellDef="let collector" class="table-td text-right">
                  @if (collector.status === 'active') {
                    <button
                      mat-icon-button
                      class="btn-delete"
                      (click)="deleteCollector(collector)"
                      matTooltip="Inactivar recolector"
                    >
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  } @else {
                    <button
                      mat-raised-button
                      class="btn-activate"
                      (click)="activateCollector(collector)"
                    >
                      <mat-icon>check_circle</mat-icon>
                      <span>Activar</span>
                    </button>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: displayedColumns"
                [class.row-inactive]="row.status === 'inactive'"
              ></tr>
            </table>
          </div>
        </div>

        <!-- Mobile Cards -->
        <div class="mobile-only">
          <div class="mobile-cards">
            @for (collector of paginatedCollectors(); track collector.id) {
              <div
                class="collector-card bg-primary-white rounded-lg shadow p-4"
                [class.row-inactive]="collector.status === 'inactive'"
              >
                <div class="card-header mb-3">
                  <div class="card-title">
                    <h3 class="text-body font-bold text-primary-black">
                      {{ collector.name }} {{ collector.lastName }}
                    </h3>
                    <mat-chip [class]="getCollectorStatusClass(collector.status)" class="mt-2">
                      {{ getCollectorStatusLabel(collector.status) }}
                    </mat-chip>
                  </div>
                </div>

                <div class="card-details space-y-2">
                  <div class="detail-row">
                    <mat-icon class="detail-icon">badge</mat-icon>
                    <span class="detail-label">{{ collector.documentType }}:</span>
                    <span class="detail-value">{{ collector.documentNumber }}</span>
                  </div>

                  @if (collector.phone) {
                    <div class="detail-row">
                      <mat-icon class="detail-icon">phone</mat-icon>
                      <span class="detail-label">Teléfono:</span>
                      <span class="detail-value">{{ collector.phone }}</span>
                    </div>
                  }

                  <div class="detail-row">
                    <mat-icon class="detail-icon">groups</mat-icon>
                    <span class="detail-label">Brigada:</span>
                    <mat-form-field class="brigade-selector-mobile" appearance="outline">
                      <mat-select
                        [value]="collector.currentBrigadeId || ''"
                        (selectionChange)="onBrigadeChange(collector, $event.value)"
                        [disabled]="collector.status === 'inactive'"
                      >
                        <mat-option value="">Sin asignar</mat-option>
                        @for (brigade of brigades(); track brigade.id) {
                          <mat-option [value]="brigade.id">
                            {{ brigade.name }}
                          </mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  </div>
                </div>

                <div class="card-actions mt-4">
                  @if (collector.status === 'active') {
                    <button
                      mat-stroked-button
                      class="btn-delete w-full"
                      (click)="deleteCollector(collector)"
                    >
                      <mat-icon>delete_outline</mat-icon>
                      <span>Inactivar</span>
                    </button>
                  } @else {
                    <button
                      mat-raised-button
                      class="btn-activate w-full"
                      (click)="activateCollector(collector)"
                    >
                      <mat-icon>check_circle</mat-icon>
                      <span>Activar</span>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Pagination -->
        <mat-paginator
          [length]="collectors().length"
          [pageSize]="pageSize()"
          [pageIndex]="pageIndex()"
          [pageSizeOptions]="[5, 10, 25, 50]"
          (page)="onPageChange($event)"
          showFirstLastButtons
        />
      }
    </div>
  `,
  styles: `
    .collectors-container {
      padding: 1rem;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
    }

    /* Mostrar tabla desktop solo en pantallas grandes */
    .desktop-only {
      display: none;
    }

    @media (min-width: 768px) {
      .desktop-only {
        display: block;
      }
    }

    /* Mostrar cards mobile solo en pantallas pequeñas */
    .mobile-only {
      display: block;
    }

    @media (min-width: 768px) {
      .mobile-only {
        display: none;
      }
    }

    .collectors-table {
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

    .row-inactive {
      opacity: 0.6;
      background-color: #f9fafb;
      color: #737373;
    }

    .brigade-selector {
      width: 200px;
      margin: 0;
    }

    .brigade-selector-mobile {
      width: 100%;
      margin: 0;
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

    .btn-delete {
      color: #dc2626;
    }

    .btn-delete:hover {
      background-color: #fef3f2;
    }

    .btn-activate {
      background-color: #218358;
      color: white;
    }

    .btn-activate mat-icon {
      margin-right: 4px;
    }

    /* Mobile Cards */
    .mobile-cards {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .collector-card {
      border: 1px solid #e5e5e5;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 14px;
    }

    .detail-icon {
      color: #737373;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .detail-label {
      color: #737373;
      font-weight: 500;
    }

    .detail-value {
      color: #0a0a0a;
      flex: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorsTabComponent implements OnInit {
  private collectorsService = inject(CollectorsService);
  private brigadesService = inject(BrigadesService);
  private brigadeAssignmentsService = inject(BrigadeAssignmentsService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  // Inputs
  projectCommunityId = input.required<string>();

  // State
  collectors = signal<Collector[]>([]);
  brigades = signal<Brigade[]>([]);
  loading = signal(false);
  pageIndex = signal(0);
  pageSize = signal(10);

  // Computed
  paginatedCollectors = computed(() => {
    const allCollectors = this.collectors();
    const size = this.pageSize();
    const index = this.pageIndex();
    const startIndex = index * size;
    const endIndex = startIndex + size;
    return allCollectors.slice(startIndex, endIndex);
  });

  // Table columns
  displayedColumns: string[] = [
    'name',
    'lastName',
    'documentType',
    'documentNumber',
    'phone',
    'assignedBrigade',
    'status',
    'actions',
  ];

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    const projectCommunityId = this.projectCommunityId();

    // Load collectors and brigades in parallel
    this.collectorsService.getCollectorsByProjectCommunity(projectCommunityId).subscribe({
      next: (collectors) => {
        this.collectors.set(collectors);
        this.loadBrigades();
      },
      error: (error) => {
        console.error('Error loading collectors:', error);
        this.notification.error('Error al cargar recolectores');
        this.collectors.set([]);
        this.loading.set(false);
      },
    });
  }

  private loadBrigades(): void {
    const projectCommunityId = this.projectCommunityId();

    // Load all brigades for the selector (without pagination)
    this.brigadesService.getBrigadesByProjectCommunity(projectCommunityId, 0, 100).subscribe({
      next: (response) => {
        this.brigades.set(response.items);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading brigades:', error);
        this.brigades.set([]);
        this.loading.set(false);
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  onBrigadeChange(collector: Collector, brigadeId: string): void {
    if (!brigadeId) {
      this.notification.info('Seleccione una brigada para asignar');
      return;
    }

    if (!collector.projectCommunityCollectorId) {
      this.notification.error('Error: El recolector no tiene ID de comunidad');
      return;
    }

    // Current date in format YYYY-MM-DD
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;

    // If already has brigade and selects a different one, REASSIGN
    if (collector.currentBrigadeId && collector.currentBrigadeId !== brigadeId) {
      // Validate if startDate is today (possible selection error)
      if (collector.startDate === localDateString) {
        const currentBrigade = this.brigades().find((b) => b.id === collector.currentBrigadeId);
        const newBrigade = this.brigades().find((b) => b.id === brigadeId);

        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
          data: {
            title: '¿Reasignar recolector?',
            message: `Has asignado a ${collector.name} ${collector.lastName} a la brigada "${currentBrigade?.name || 'N/A'}" hoy. ¿Estás seguro de cambiarla por "${newBrigade?.name || 'N/A'}"?`,
            confirmText: 'Sí, cambiar',
            type: 'warning',
          },
        });

        dialogRef.afterClosed().subscribe((confirmed) => {
          if (!confirmed) {
            // Reload to revert visual selection
            this.loadData();
            return;
          }

          // User confirmed, proceed with reassignment
          this.performReassignment(collector, brigadeId, localDateString);
        });
        return;
      }

      // startDate is not today, proceed directly
      this.performReassignment(collector, brigadeId, localDateString);
      return;
    }

    // If no brigade assigned, CREATE assignment
    if (!collector.currentBrigadeId) {
      const request = {
        projectCommunityCollectorId: collector.projectCommunityCollectorId,
        brigadeId,
        startDate: localDateString,
      };

      this.brigadeAssignmentsService.createBrigadeAssignment(request).subscribe({
        next: (assignment) => {
          this.notification.success(
            `${collector.name} ${collector.lastName} asignado a brigada ${assignment.brigadeName}`,
          );
          this.loadData();
        },
        error: (error) => {
          console.error('Error assigning collector to brigade:', error);
          const errorMessage = error?.error?.message || 'Error al asignar recolector a brigada';
          this.notification.error(errorMessage);
          this.loadData();
        },
      });
      return;
    }

    // Selected same brigade already assigned
    this.notification.info('El recolector ya está asignado a esta brigada');
  }

  private performReassignment(collector: Collector, brigadeId: string, startDate: string): void {
    const reassignRequest = {
      projectCommunityCollectorId: collector.projectCommunityCollectorId!,
      newBrigadeId: brigadeId,
      startDate,
      notes: 'Reasignación desde UI',
    };

    this.brigadeAssignmentsService.reassignBrigade(reassignRequest).subscribe({
      next: () => {
        this.notification.success(
          `${collector.name} ${collector.lastName} reasignado correctamente`,
        );
        this.loadData();
      },
      error: (error) => {
        console.error('Error reassigning collector:', error);
        const errorMessage = error?.error?.message || 'Error al reasignar recolector';
        this.notification.error(errorMessage);
        this.loadData();
      },
    });
  }

  deleteCollector(collector: Collector): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Inactivar recolector?',
        message: `Esta acción marcará a ${collector.name} ${collector.lastName} como inactivo. ¿Deseas continuar?`,
        confirmText: 'Sí, inactivar',
        type: 'warning',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.performDeleteCollector(collector);
      }
    });
  }

  private performDeleteCollector(collector: Collector): void {
    if (!collector.id) {
      this.notification.error('Error: ID de recolector no encontrado');
      return;
    }

    this.collectorsService.updateCollectorStatus(collector.id, 'inactive').subscribe({
      next: () => {
        this.notification.success('Recolector inactivado correctamente');
        this.loadData();
      },
      error: (error) => {
        console.error('Error deleting collector:', error);
        const errorMessage = error?.error?.message || 'Error al inactivar recolector';
        this.notification.error(errorMessage);
      },
    });
  }

  activateCollector(collector: Collector): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Activar recolector?',
        message: `Esta acción marcará a ${collector.name} ${collector.lastName} como activo. ¿Deseas continuar?`,
        confirmText: 'Sí, activar',
        type: 'info',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.performActivateCollector(collector);
      }
    });
  }

  private performActivateCollector(collector: Collector): void {
    if (!collector.id) {
      this.notification.error('Error: ID de recolector no encontrado');
      return;
    }

    this.collectorsService.updateCollectorStatus(collector.id, 'active').subscribe({
      next: () => {
        this.notification.success('Recolector activado correctamente');
        this.loadData();
      },
      error: (error) => {
        console.error('Error activating collector:', error);
        const errorMessage = error?.error?.message || 'Error al activar recolector';
        this.notification.error(errorMessage);
      },
    });
  }

  getCollectorStatusLabel(status: string): string {
    return status === 'active' ? 'Activo' : 'Inactivo';
  }

  getCollectorStatusClass(status: string): string {
    return status === 'active' ? 'status-active' : 'status-inactive';
  }
}
