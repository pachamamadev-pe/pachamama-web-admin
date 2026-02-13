import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrigadesService } from '../services/brigades.service';
import { NotificationService } from '@core/services/notification.service';
import { Brigade } from '../models/brigade.model';

@Component({
  selector: 'app-brigades-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="brigades-container">
      @if (loading()) {
        <!-- Loading State -->
        <div class="loading-container">
          <mat-spinner diameter="48" />
          <p class="text-body text-neutral-subheading mt-4">Cargando brigadas...</p>
        </div>
      } @else if (brigades().length === 0) {
        <!-- Empty State -->
        <div class="empty-state">
          <div class="empty-icon">
            <mat-icon>groups</mat-icon>
          </div>
          <h3 class="text-body font-bold text-accent-titles">No hay brigadas registradas</h3>
          <p class="text-subtitle text-neutral-subheading">
            Aún no se han registrado brigadas para este proyecto
          </p>
          <button
            mat-raised-button
            class="btn-primary create-brigade-button"
            (click)="onCreateBrigade()"
          >
            <mat-icon>add</mat-icon>
            <span>Crear brigada</span>
          </button>
        </div>
      } @else {
        <!-- Brigades Table (Desktop) -->
        <div class="desktop-only">
          <div class="brigades-table">
            <table mat-table [dataSource]="brigades()" class="table-auto w-full">
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef class="table-th text-left">Código</th>
                <td mat-cell *matCellDef="let brigade" class="table-td">
                  {{ brigade.code }}
                </td>
              </ng-container>

              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef class="table-th text-left">Nombre</th>
                <td mat-cell *matCellDef="let brigade" class="table-td">
                  {{ brigade.name }}
                </td>
              </ng-container>

              <ng-container matColumnDef="request">
                <th mat-header-cell *matHeaderCellDef class="table-th text-left">Solicitud</th>
                <td mat-cell *matCellDef="let brigade" class="table-td">
                  @if (brigade.collectionRequestId) {
                    <mat-chip class="request-chip">Aprobada</mat-chip>
                  } @else {
                    <span class="text-subtitle text-neutral-subheading">Sin solicitud</span>
                  }
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef class="table-th text-left">Estado</th>
                <td mat-cell *matCellDef="let brigade" class="table-td">
                  <mat-chip [class]="getBrigadeStatusClass(brigade.status)">
                    {{ getBrigadeStatusLabel(brigade.status) }}
                  </mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="members">
                <th mat-header-cell *matHeaderCellDef class="table-th text-left">Miembros</th>
                <td mat-cell *matCellDef="let brigade" class="table-td">
                  <button
                    mat-stroked-button
                    class="view-members-button"
                    (click)="onViewMembers(brigade)"
                  >
                    <mat-icon>people</mat-icon>
                    <span>Ver miembros</span>
                  </button>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="table-th text-right">Acciones</th>
                <td mat-cell *matCellDef="let brigade" class="table-td text-right">
                  <button
                    mat-icon-button
                    class="btn-add"
                    (click)="onAddMembers(brigade)"
                    matTooltip="Agregar recolectores"
                  >
                    <mat-icon>person_add</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    class="btn-edit"
                    (click)="onEditBrigade(brigade)"
                    matTooltip="Editar brigada"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
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
            @for (brigade of brigades(); track brigade.id) {
              <div
                class="brigade-card bg-primary-white rounded-lg shadow p-4"
                [class.row-inactive]="brigade.status === 'inactive'"
              >
                <div class="card-header mb-3">
                  <div class="card-title">
                    <h3 class="text-body font-bold text-primary-black">
                      {{ brigade.name }}
                    </h3>
                    <p class="text-subtitle text-neutral-subheading">{{ brigade.code }}</p>
                  </div>
                  <mat-chip [class]="getBrigadeStatusClass(brigade.status)" class="mt-2">
                    {{ getBrigadeStatusLabel(brigade.status) }}
                  </mat-chip>
                </div>

                <div class="card-details space-y-2">
                  <div class="detail-row">
                    <mat-icon class="detail-icon">assignment</mat-icon>
                    <span class="detail-label">Solicitud:</span>
                    <span class="detail-value">
                      {{ brigade.collectionRequestId ? 'Aprobada' : 'Sin solicitud' }}
                    </span>
                  </div>
                  <div class="detail-row">
                    <mat-icon class="detail-icon">people</mat-icon>
                    <span class="detail-label">Miembros:</span>
                    <button
                      mat-stroked-button
                      class="view-members-button-mobile"
                      (click)="onViewMembers(brigade)"
                    >
                      <mat-icon>visibility</mat-icon>
                      <span>Ver</span>
                    </button>
                  </div>
                </div>

                <div class="card-actions mt-4">
                  <button
                    mat-stroked-button
                    class="btn-add-mobile w-full"
                    (click)="onAddMembers(brigade)"
                  >
                    <mat-icon>person_add</mat-icon>
                    <span>Agregar recolectores</span>
                  </button>
                  <button
                    mat-raised-button
                    class="btn-edit-mobile w-full"
                    (click)="onEditBrigade(brigade)"
                  >
                    <mat-icon>edit</mat-icon>
                    <span>Editar brigada</span>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Pagination (Backend) -->
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
    .brigades-container {
      padding: 1rem;
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

    .create-brigade-button {
      margin-top: 1rem;
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

    .brigades-table {
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

    .request-chip {
      background-color: #e0f2fe;
      color: #0284c7;
      border: 1px solid #0284c7;
    }

    .view-members-button {
      color: #218358;
      border-color: #218358;
    }

    .view-members-button mat-icon {
      margin-right: 4px;
    }

    .view-members-button-mobile {
      font-size: 12px;
      padding: 4px 8px;
    }

    .view-members-button-mobile mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }

    .btn-edit {
      color: #218358;
    }

    .btn-add {
      color: #0284c7;
    }

    .btn-add:hover {
      background-color: #e0f2fe;
    }

    .btn-edit:hover {
      background-color: #f4fbf6;
    }

    .btn-edit-mobile {
      background-color: #218358;
      color: white;
    }

    .btn-add-mobile {
      color: #0284c7;
      border-color: #0284c7;
      margin-bottom: 8px;
    }

    .btn-edit-mobile mat-icon {
      margin-right: 4px;
    }

    /* Mobile Cards */
    .mobile-cards {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .brigade-card {
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrigadesTabComponent {
  private brigadesService = inject(BrigadesService);
  private notification = inject(NotificationService);

  // Inputs
  projectCommunityId = input.required<string>();
  shouldLoad = input(false); // Lazy loading trigger

  // Outputs
  createBrigade = output<void>();
  editBrigade = output<Brigade>();
  viewMembers = output<Brigade>();
  addMembers = output<Brigade>();

  // State
  brigades = signal<Brigade[]>([]);
  loading = signal(false);
  private hasLoaded = signal(false);

  // Pagination (backend)
  pageIndex = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);

  // Table columns
  displayedColumns: string[] = ['code', 'name', 'request', 'status', 'members', 'actions'];

  constructor() {
    // Load brigades when shouldLoad becomes true (only once)
    effect(() => {
      if (this.shouldLoad() && !this.hasLoaded()) {
        this.hasLoaded.set(true);
        this.loadData();
      }
    });
  }

  private loadData(): void {
    this.loading.set(true);
    const projectCommunityId = this.projectCommunityId();
    const page = this.pageIndex();
    const size = this.pageSize();

    this.brigadesService.getBrigadesByProjectCommunity(projectCommunityId, page, size).subscribe({
      next: (response) => {
        this.brigades.set(response.items);
        this.totalElements.set(response.total);
        this.pageIndex.set(response.page);
        this.pageSize.set(response.size);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading brigades:', error);
        this.notification.error('Error al cargar brigadas');
        this.brigades.set([]);
        this.totalElements.set(0);
        this.loading.set(false);
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadData();
  }

  onCreateBrigade(): void {
    this.createBrigade.emit();
  }

  onEditBrigade(brigade: Brigade): void {
    this.editBrigade.emit(brigade);
  }

  onViewMembers(brigade: Brigade): void {
    this.viewMembers.emit(brigade);
  }

  onAddMembers(brigade: Brigade): void {
    this.addMembers.emit(brigade);
  }

  getBrigadeStatusLabel(status: string): string {
    if (status === 'active') {
      return 'Activa';
    }
    if (status === 'archived') {
      return 'Archivada';
    }
    return 'Inactiva';
  }

  getBrigadeStatusClass(status: string): string {
    if (status === 'active') {
      return 'status-active';
    }
    if (status === 'archived') {
      return 'status-archived';
    }
    return 'status-inactive';
  }

  /**
   * Método público para recargar datos (llamado desde el parent cuando se crea/edita una brigada)
   */
  reload(): void {
    this.loadData();
  }
}
