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
import { CommunitiesService } from '../services/communities.service';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { CommunityFormDialogComponent } from '../components/community-form-dialog.component';
import type {
  Community,
  CreateCommunityRequest,
  UpdateCommunityRequest,
} from '../models/community.model';

import { PmHasPermissionDirective } from '@core/directives/pm-has-permission.directive';
import { PERMISSIONS } from '@core/auth/permissions';

/**
 * Página de gestión de comunidades nativas y campesinas
 */
@Component({
  selector: 'app-communities-page',
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
    EmptyStateComponent,
    PmHasPermissionDirective,
  ],
  templateUrl: './communities.page.html',
  styleUrl: './communities.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunitiesPage implements OnInit {
  private communitiesService = inject(CommunitiesService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private router = inject(Router);

  protected readonly PERMISSIONS = PERMISSIONS;

  // Search and filtering
  searchTerm = signal('');

  // Pagination
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);

  // Data
  communities = signal<Community[]>([]);
  loading = signal(true);

  // Filtered communities based on search
  filteredCommunities = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    if (!search) {
      return this.communities();
    }

    return this.communities().filter((community) => {
      return (
        community.name.toLowerCase().includes(search) ||
        community.code.toLowerCase().includes(search) ||
        community.ruc.includes(search) ||
        community.legalAddress.toLowerCase().includes(search)
      );
    });
  });

  displayedColumns: string[] = ['name', 'ruc', 'legalAddress', 'location', 'actions'];

  ngOnInit(): void {
    this.loadCommunities();
  }

  loadCommunities(): void {
    this.loading.set(true);
    this.communitiesService.getCommunities().subscribe({
      next: (response) => {
        this.communities.set(response ?? []);
        this.totalElements.set(response.length ?? 0);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading communities:', error);
        this.notification.error('Error al cargar comunidades');
        this.communities.set([]);
        this.totalElements.set(0);
        this.loading.set(false);
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CommunityFormDialogComponent, {
      width: '100%',
      maxWidth: '600px',
      data: { mode: 'create' },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.mode === 'create') {
        this.createCommunity(result.data);
      }
    });
  }

  openEditDialog(community: Community): void {
    const dialogRef = this.dialog.open(CommunityFormDialogComponent, {
      width: '100%',
      maxWidth: '600px',
      data: { mode: 'edit', community },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.mode === 'edit') {
        this.updateCommunity(community.id, result.data);
      }
    });
  }

  deleteCommunity(community: Community): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Eliminar comunidad?',
        message: `Esta acción eliminará permanentemente la comunidad "${community.name}".`,
        confirmText: 'Eliminar',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.performDelete(community.id);
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    // Si el backend soporta paginación, llamar loadCommunities() aquí
  }

  viewCommunityDetail(community: Community): void {
    this.router.navigate(['/communities', community.id]);
  }

  private createCommunity(data: CreateCommunityRequest): void {
    this.communitiesService.createCommunity(data).subscribe({
      next: () => {
        this.notification.success('Comunidad creada correctamente');
        this.loadCommunities();
      },
      error: (error) => {
        console.error('Error creating community:', error);
        this.notification.error('Error al crear la comunidad');
      },
    });
  }

  private updateCommunity(id: string, data: UpdateCommunityRequest): void {
    this.communitiesService.updateCommunity(id, data).subscribe({
      next: () => {
        this.notification.success('Comunidad actualizada correctamente');
        this.loadCommunities();
      },
      error: (error) => {
        console.error('Error updating community:', error);
        this.notification.error('Error al actualizar la comunidad');
      },
    });
  }

  private performDelete(id: string): void {
    this.communitiesService.deleteCommunity(id).subscribe({
      next: () => {
        this.notification.success('Comunidad eliminada correctamente');
        this.loadCommunities();
      },
      error: (error) => {
        console.error('Error deleting community:', error);
        this.notification.error('Error al eliminar la comunidad');
      },
    });
  }
}
