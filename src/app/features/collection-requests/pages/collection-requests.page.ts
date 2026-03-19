import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { NotificationService } from '@core/services/notification.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { formatDate } from '@shared/utils/date-helpers';
import { CollectionRequestsService } from '../services/collection-requests.service';
import { CollectionRequestFormComponent } from '../components/collection-request-form.component';
import { CollectionRequestDetailDialogComponent } from '../components/collection-request-detail-dialog.component';
import {
  CollectionRequest,
  CollectionRequestStatus,
  CreateCollectionRequestDto,
  UpdateCollectionRequestDto,
} from '../models/collection-request.model';

import { PmHasPermissionDirective } from '@core/directives/pm-has-permission.directive';
import { SidebarService } from '@core/services/sidebar.service';
import { PERMISSIONS } from '@core/auth/permissions';

@Component({
  selector: 'app-collection-requests-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatSelectModule,
    EmptyStateComponent,
    PmHasPermissionDirective,
  ],
  templateUrl: './collection-requests.page.html',
  styleUrl: './collection-requests.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionRequestsPage implements OnInit {
  private collectionRequestsService = inject(CollectionRequestsService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private router = inject(Router);

  readonly sidebarService = inject(SidebarService);
  protected readonly PERMISSIONS = PERMISSIONS;

  // Search and filtering
  searchTerm = signal('');
  statusFilter = signal<CollectionRequestStatus | 'all'>('all');

  // Pagination
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);

  // Data
  requests = signal<CollectionRequest[]>([]);
  loading = signal(true);

  // Filtered requests based on search
  filteredRequests = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    if (!search) {
      return this.requests();
    }
    return this.requests().filter((request) => {
      return (
        request.requestNumber.toLowerCase().includes(search) ||
        request.projectName.toLowerCase().includes(search) ||
        request.requestedByName.toLowerCase().includes(search)
      );
    });
  });

  // Status options for filter
  statusOptions: { value: CollectionRequestStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'rejected', label: 'Rechazado' },
    { value: 'observed', label: 'Observado' },
    { value: 'cancelled', label: 'Cancelado' },
  ];

  // Table columns
  displayedColumns: string[] = [
    'requestNumber',
    'projectName',
    'requestedWeighing',
    'dateRange',
    'requestedBy',
    'status',
    'actions',
  ];

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading.set(true);
    const filters = {
      page: this.currentPage(),
      size: this.pageSize(),
      ...(this.statusFilter() !== 'all' && {
        status: this.statusFilter() as CollectionRequestStatus,
      }),
    };

    this.collectionRequestsService.getCollectionRequests(filters).subscribe({
      next: (response) => {
        this.requests.set(response.items ?? []);
        this.totalElements.set(response.total ?? 0);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading collection requests:', error);
        this.notification.error('Error al cargar solicitudes');
        this.requests.set([]);
        this.totalElements.set(0);
        this.loading.set(false);
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CollectionRequestFormComponent, {
      width: '100%',
      maxWidth: '600px',
      data: { mode: 'create' },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.mode === 'create') {
        this.createRequest(result.data);
      }
    });
  }

  openEditDialog(request: CollectionRequest): void {
    // Solo se puede editar si está en estado OBSERVED
    if (request.status !== 'observed') {
      this.notification.warning('Solo se pueden editar solicitudes con observaciones');
      return;
    }

    const dialogRef = this.dialog.open(CollectionRequestFormComponent, {
      width: '100%',
      maxWidth: '600px',
      data: { mode: 'edit', request },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.mode === 'edit') {
        this.updateRequest(request.id, result.data);
      }
    });
  }

  viewDetail(request: CollectionRequest): void {
    this.dialog.open(CollectionRequestDetailDialogComponent, {
      width: '100%',
      maxWidth: '820px',
      minWidth: '320px',
      data: request,
      autoFocus: false,
      panelClass: 'collection-detail-dialog',
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  onStatusFilterChange(status: CollectionRequestStatus | 'all'): void {
    this.statusFilter.set(status);
    this.currentPage.set(0); // Reset to first page
    this.loadRequests();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadRequests();
  }

  private createRequest(data: CreateCollectionRequestDto): void {
    this.collectionRequestsService.createCollectionRequest(data).subscribe({
      next: () => {
        this.notification.success('Solicitud creada correctamente');
        this.loadRequests();
      },
      error: (error) => {
        console.error('Error creating request:', error);
        const errorMessage = error?.error?.message || 'Error al crear solicitud';
        this.notification.error(errorMessage);
      },
    });
  }

  private updateRequest(id: string, data: UpdateCollectionRequestDto): void {
    this.collectionRequestsService.updateCollectionRequest(id, data).subscribe({
      next: () => {
        this.notification.success('Solicitud actualizada correctamente');
        this.loadRequests();
      },
      error: (error) => {
        console.error('Error updating request:', error);
        const errorMessage = error?.error?.message || 'Error al actualizar solicitud';
        this.notification.error(errorMessage);
      },
    });
  }

  /**
   * Obtiene el label del estado
   */
  getStatusLabel(status: CollectionRequestStatus): string {
    const labels: Record<CollectionRequestStatus, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      observed: 'Observado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  }

  /**
   * Obtiene la clase CSS del badge de estado
   */
  getStatusClass(status: CollectionRequestStatus): string {
    const classes: Record<CollectionRequestStatus, string> = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      observed: 'status-observed',
      cancelled: 'status-cancelled',
    };
    return classes[status] || '';
  }

  /**
   * Verifica si se puede editar la solicitud (solo OBSERVED)
   */
  canEdit(request: CollectionRequest): boolean {
    return request.status === 'observed';
  }

  /**
   * Formatea un rango de fechas
   */
  formatDateRange(startDate: string, endDate: string): string {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
}
