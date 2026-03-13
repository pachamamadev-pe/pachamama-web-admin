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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { CollectorsService } from '../services/collectors.service';
import { BrigadesService } from '../services/brigades.service';
import { BrigadeAssignmentsService } from '../services/brigade-assignments.service';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { Collector } from '../models/collector.model';
import { Brigade } from '../models/brigade.model';
import {
  CollectorAssignmentStatus,
  UpdateCollectorAssignmentStatusRequest,
} from '../models/collector-assignment-status.model';
import { CollectorAssignmentStatusService } from '../services/collector-assignment-status.service';
import {
  CollectorAssignmentStatusDialogComponent,
  CollectorAssignmentStatusDialogResult,
} from './collector-assignment-status-dialog.component';
import { CollectorAssignmentStatusHistoryDialogComponent } from './collector-assignment-status-history-dialog.component';
import { CollectorAssignmentStatusGuideDialogComponent } from './collector-assignment-status-guide-dialog.component';

import { PmHasPermissionDirective } from '@core/directives/pm-has-permission.directive';
//import { SidebarService } from '@core/services/sidebar.service';
import { PERMISSIONS } from '@core/auth/permissions';

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
    MatCheckboxModule,
    PmHasPermissionDirective,
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
        <div class="collectors-filters">
          <mat-checkbox [checked]="showArchived()" (change)="onToggleShowArchived($event.checked)">
            Mostrar recolectores archivados
          </mat-checkbox>
        </div>

        <!-- Collectors Table (Desktop) -->
        <div class="desktop-only">
          <div class="collectors-table">
            <table
              mat-table
              [dataSource]="paginatedCollectors()"
              class="table-auto w-full responsive-table"
            >
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
                  {{ collector.currentBrigadeName || '-' }}
                </td>
              </ng-container>

              <!--               <ng-container matColumnDef="assignedBrigade">
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
              </ng-container> -->

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef class="table-th text-left">Estado</th>
                <td mat-cell *matCellDef="let collector" class="table-td">
                  <mat-chip [class]="getCollectorStatusClass(getAssignmentStatus(collector))">
                    {{ getCollectorStatusLabel(getAssignmentStatus(collector)) }}
                  </mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="table-th text-right">Acciones</th>
                <td mat-cell *matCellDef="let collector" class="table-td text-right">
                  @if (collector.projectCommunityCollectorId) {
                    <button
                      mat-icon-button
                      class="btn-history"
                      (click)="openStatusHistoryDialog(collector)"
                      matTooltip="Ver historial de cambios"
                    >
                      <mat-icon>history</mat-icon>
                    </button>
                  }
                  @if (!showArchived() && getAssignmentStatus(collector) !== 'archived') {
                    <button
                      mat-icon-button
                      *appPmHasPermission="PERMISSIONS.COLLECTOR.UPDATE"
                      mat-stroked-button
                      class="btn-change-status"
                      (click)="openStatusChangeDialog(collector)"
                      matTooltip="Cambiar estado de asignación"
                    >
                      <mat-icon>published_with_changes</mat-icon>
                    </button>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: displayedColumns"
                [class.row-inactive]="getAssignmentStatus(row) === 'inactive'"
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
                [class.row-inactive]="getAssignmentStatus(collector) === 'inactive'"
              >
                <div class="card-header mb-3">
                  <div class="card-title">
                    <h3 class="text-body font-bold text-primary-black">
                      {{ collector.name }} {{ collector.lastName }}
                    </h3>
                    <mat-chip
                      [class]="getCollectorStatusClass(getAssignmentStatus(collector))"
                      class="mt-2"
                    >
                      {{ getCollectorStatusLabel(getAssignmentStatus(collector)) }}
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
                  @if (collector.currentBrigadeName) {
                    <div class="detail-row">
                      <mat-icon class="detail-icon">groups</mat-icon>
                      <span class="detail-label">Brigada:</span>
                      <span class="detail-value">{{ collector.currentBrigadeName }}</span>
                    </div>
                  }

                  <!--  <div class="detail-row">
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
                  </div> -->
                </div>

                <div class="card-actions mt-4">
                  @if (collector.projectCommunityCollectorId) {
                    <button
                      mat-icon-button
                      class="btn-history"
                      (click)="openStatusHistoryDialog(collector)"
                      matTooltip="Ver historial de cambios"
                    >
                      <mat-icon>history</mat-icon>
                    </button>
                  }
                  @if (!showArchived() && getAssignmentStatus(collector) !== 'archived') {
                    <button
                      *appPmHasPermission="PERMISSIONS.COLLECTOR.UPDATE"
                      mat-raised-button
                      class="btn-change-status w-full"
                      (click)="openStatusChangeDialog(collector)"
                    >
                      <mat-icon>published_with_changes</mat-icon>
                      <span>Cambiar estado</span>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Pagination -->
        <mat-paginator
          [length]="totalElements()"
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

    .collectors-filters {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .btn-guide {
      color: #124b37;
    }

    .btn-guide:hover {
      background-color: #f4fbf6;
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
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .responsive-table {
      min-width: 980px;
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

    .status-archived {
      background-color: #f3f4f6;
      color: #6b7280;
      border: 1px solid #9ca3af;
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

    .btn-change-status {
      color: #124b37;
      border-color: #124b37;

      mat-icon {
        margin-right: 4px;
      }
    }

    .btn-change-status:hover {
      background-color: #f4fbf6;
    }

    .btn-history {
      color: #124b37;
      margin-right: 6px;
    }

    .btn-history:hover {
      background-color: #f4fbf6;
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
  private collectorAssignmentStatusService = inject(CollectorAssignmentStatusService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  //readonly sidebarService = inject(SidebarService);
  protected readonly PERMISSIONS = PERMISSIONS;

  // Inputs
  projectCommunityId = input.required<string>();

  // State
  collectors = signal<Collector[]>([]);
  brigades = signal<Brigade[]>([]);
  loading = signal(false);
  showArchived = signal(false);
  pageIndex = signal(0);
  pageSize = signal(10);
  totalElements = signal(0); // Total from backend

  // Computed - now using backend pagination
  paginatedCollectors = computed(() => {
    return this.collectors(); // Backend already returns paginated data
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
    const page = this.pageIndex();
    const size = this.pageSize();
    const showArchived = this.showArchived();

    // Load collectors with pagination
    this.collectorsService
      .getCollectorsByProjectCommunity(projectCommunityId, page, size, showArchived)
      .subscribe({
        next: (response) => {
          this.collectors.set(response.items ?? []);
          this.totalElements.set(response.total ?? 0);
          this.loadBrigades();
        },
        error: (error) => {
          console.error('Error loading collectors:', error);
          this.notification.error('Error al cargar recolectores');
          this.collectors.set([]);
          this.totalElements.set(0);
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
    this.loadData(); // Reload data from backend with new page/size
  }

  onToggleShowArchived(showArchived: boolean): void {
    this.showArchived.set(showArchived);
    this.pageIndex.set(0);
    this.loadData();
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

  openStatusChangeDialog(collector: Collector): void {
    const currentStatus = this.getAssignmentStatus(collector) as CollectorAssignmentStatus;
    const allowedTransitions = this.getAllowedTransitions(currentStatus);

    if (allowedTransitions.length === 0) {
      this.notification.warning('Esta asignación no permite cambios de estado');
      return;
    }

    const dialogRef = this.dialog.open(CollectorAssignmentStatusDialogComponent, {
      width: '100%',
      maxWidth: '560px',
      disableClose: true,
      data: {
        collectorName: `${collector.name} ${collector.lastName}`,
        currentStatus,
        allowedTransitions,
      },
    });

    dialogRef
      .afterClosed()
      .subscribe((result: CollectorAssignmentStatusDialogResult | undefined) => {
        if (!result) {
          return;
        }

        if (!collector.projectCommunityCollectorId) {
          this.notification.error('No se encontró la asignación proyecto/comunidad del recolector');
          return;
        }

        const payload: UpdateCollectorAssignmentStatusRequest = {
          newStatus: result.newStatus,
          reason: result.reason,
        };

        this.collectorAssignmentStatusService
          .updateStatus(collector.projectCommunityCollectorId, payload)
          .subscribe({
            next: () => {
              this.notification.success('Estado de asignación actualizado correctamente');
              this.loadData();
            },
            error: (error) => {
              console.error('Error updating collector assignment status:', error);
              const errorMessage =
                error?.error?.message || 'Error al actualizar estado de asignación';
              this.notification.error(errorMessage);
            },
          });
      });
  }

  openStatusHistoryDialog(collector: Collector): void {
    if (!collector.projectCommunityCollectorId) {
      this.notification.warning('No se encontró identificador de asignación para ver historial');
      return;
    }

    this.dialog.open(CollectorAssignmentStatusHistoryDialogComponent, {
      width: '100%',
      maxWidth: '980px',
      data: {
        projectCommunityCollectorId: collector.projectCommunityCollectorId,
        collectorName: `${collector.name} ${collector.lastName}`,
      },
    });
  }

  openStatusGuideDialog(): void {
    this.dialog.open(CollectorAssignmentStatusGuideDialogComponent, {
      width: '100%',
      maxWidth: '640px',
    });
  }

  private getAllowedTransitions(status: CollectorAssignmentStatus): CollectorAssignmentStatus[] {
    if (status === 'active') {
      return ['inactive', 'archived'];
    }

    if (status === 'inactive') {
      return ['active', 'archived'];
    }

    return [];
  }

  getAssignmentStatus(collector: Collector): string {
    return collector.assignmentStatus ?? collector.status;
  }

  getCollectorStatusLabel(status: string): string {
    if (status === 'active') return 'Activo';
    if (status === 'inactive') return 'Inactivo';
    if (status === 'archived') return 'Archivado';
    return status;
  }

  getCollectorStatusClass(status: string): string {
    if (status === 'active') return 'status-active';
    if (status === 'inactive') return 'status-inactive';
    if (status === 'archived') return 'status-archived';
    return 'status-inactive';
  }
}
