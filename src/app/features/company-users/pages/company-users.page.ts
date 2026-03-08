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
import { CompanyUsersService } from '../services/company-users.service';
import { SidebarService } from '@core/services/sidebar.service';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { CompanyUserFormComponent } from '../components/company-user-form.component';
import { AssignRoleDialogComponent } from '../components/assign-role-dialog.component';
import {
  CompanyUser,
  CreateCompanyUserRequest,
  UpdateCompanyUserRequest,
  getFullName,
  getUserInitials,
  getDocumentTypeLabel,
} from '../models/company-user.model';
import { getRoleBadgeColor } from '../models/role.model';

import { PmHasPermissionDirective } from '@core/directives/pm-has-permission.directive';
//import { SidebarService } from '@core/services/sidebar.service';
import { PERMISSIONS } from '@core/auth/permissions';

/**
 * Página de gestión de usuarios de empresa
 */
@Component({
  selector: 'app-company-users-page',
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
  templateUrl: './company-users.page.html',
  styleUrl: './company-users.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyUsersPage implements OnInit {
  private companyUsersService = inject(CompanyUsersService);
  //private sidebarService = inject(SidebarService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  readonly sidebarService = inject(SidebarService);
  protected readonly PERMISSIONS = PERMISSIONS;

  // Company ID from authenticated user
  private companyId = computed(() => this.sidebarService.tenantId());

  // Search and filtering
  searchTerm = signal('');

  // Pagination (backend)
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);

  // Data
  users = signal<CompanyUser[]>([]);
  loading = signal(true);

  // Filtered users based on search (frontend filter after fetching)
  filteredUsers = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    if (!search) {
      return this.users();
    }

    return this.users().filter((user) => {
      const fullName = getFullName(user).toLowerCase();
      return (
        fullName.includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.documentNumber.includes(search) ||
        user.role.toLowerCase().includes(search)
      );
    });
  });

  displayedColumns: string[] = [
    'name',
    'email',
    'documentType',
    'documentNumber',
    'role',
    'actions',
  ];

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    const companyId = this.companyId();
    if (!companyId) {
      this.notification.error('No se pudo obtener el ID de la empresa');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    const page = this.currentPage();
    const size = this.pageSize();

    this.companyUsersService.getUsers(companyId, page, size).subscribe({
      next: (response) => {
        this.users.set(response.items ?? []);
        this.totalElements.set(response.total ?? 0);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.notification.error('Error al cargar usuarios');
        this.users.set([]);
        this.totalElements.set(0);
        this.loading.set(false);
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CompanyUserFormComponent, {
      width: '100%',
      maxWidth: '600px',
      data: { mode: 'create' },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.mode === 'create') {
        this.createUser(result.data);
      }
    });
  }

  openEditDialog(user: CompanyUser): void {
    const dialogRef = this.dialog.open(CompanyUserFormComponent, {
      width: '100%',
      maxWidth: '600px',
      data: { mode: 'edit', user },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.mode === 'edit') {
        this.updateUser(user.id, result.data);
      }
    });
  }

  openAssignRoleDialog(user: CompanyUser): void {
    const dialogRef = this.dialog.open(AssignRoleDialogComponent, {
      width: '100%',
      maxWidth: '600px',
      data: { user },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.roleCode) {
        this.assignRole(user.id, result.roleCode);
      }
    });
  }

  deleteUser(user: CompanyUser): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Desactivar usuario?',
        message: `Esta acción desactivará al usuario "${getFullName(user)}" y perderá acceso al sistema.`,
        confirmText: 'Desactivar',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.performDelete(user.id);
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
    this.loadUsers(); // Reload with new pagination params
  }

  private createUser(data: CreateCompanyUserRequest): void {
    const companyId = this.companyId();
    if (!companyId) return;

    this.companyUsersService.createUser(companyId, data).subscribe({
      next: () => {
        this.notification.success('Usuario creado correctamente');
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error creating user:', error);
        this.notification.error('Error al crear usuario');
      },
    });
  }

  private updateUser(userId: string, data: UpdateCompanyUserRequest): void {
    const companyId = this.companyId();
    if (!companyId) return;

    this.companyUsersService.updateUser(companyId, userId, data).subscribe({
      next: () => {
        this.notification.success('Usuario actualizado correctamente');
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error updating user:', error);
        this.notification.error('Error al actualizar usuario');
      },
    });
  }

  private assignRole(userId: string, roleCode: string): void {
    const companyId = this.companyId();
    if (!companyId) return;

    this.companyUsersService.assignRole(companyId, userId, roleCode).subscribe({
      next: () => {
        this.notification.success('Rol asignado correctamente');
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error assigning role:', error);
        this.notification.error('Error al asignar rol');
      },
    });
  }

  private performDelete(userId: string): void {
    const companyId = this.companyId();
    if (!companyId) return;

    this.companyUsersService.deleteUser(companyId, userId).subscribe({
      next: () => {
        this.notification.success('Usuario desactivado correctamente');
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        this.notification.error('Error al desactivar usuario');
      },
    });
  }

  // Helper functions for template
  getFullName = getFullName;
  getUserInitials = getUserInitials;
  getDocumentTypeLabel = getDocumentTypeLabel;
  getRoleBadgeColor = getRoleBadgeColor;
}
