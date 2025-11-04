import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { CompaniesService } from '../services/companies.service';
import { Company } from '../models/company.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CompanyFormComponent, CompanyFormData } from '../components/company-form.component';
import {
  AssignAdminDialogComponent,
  AssignAdminDialogData,
} from '../components/assign-admin-dialog.component';

@Component({
  selector: 'app-companies-page',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-title font-bold text-accent-titles">Empresas</h1>
          <p class="text-subtitle text-neutral-subheading mt-1">
            Gestiona las empresas registradas en la plataforma
          </p>
        </div>

        @if (companies().length > 0) {
          <button
            mat-raised-button
            color="primary"
            (click)="openCreateDialog()"
            class="btn-primary"
          >
            <mat-icon>add</mat-icon>
            Nueva empresa
          </button>
        }
      </div>

      <!-- Table or Empty State -->
      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <mat-icon class="animate-spin text-secondary">refresh</mat-icon>
          <span class="ml-2 text-body text-neutral-subheading">Cargando empresas...</span>
        </div>
      } @else if (companies().length === 0) {
        <app-empty-state
          icon="business"
          [useMaterialIcon]="true"
          title="No hay empresas registradas"
          description="Comienza creando tu primera empresa para gestionar inventarios y proyectos"
          actionLabel="Crear primera empresa"
          (action)="openCreateDialog()"
        />
      } @else {
        <!-- Desktop Table (hidden on mobile) -->
        <div class="hidden md:block bg-primary-white rounded-lg shadow overflow-hidden">
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="companies()" class="w-full">
              <!-- RUC Column -->
              <ng-container matColumnDef="ruc">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="text-subtitle font-bold text-accent-titles"
                >
                  RUC
                </th>
                <td mat-cell *matCellDef="let company" class="text-body text-primary-black">
                  {{ company.ruc }}
                </td>
              </ng-container>

              <!-- Razón Social Column -->
              <ng-container matColumnDef="businessName">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="text-subtitle font-bold text-accent-titles"
                >
                  Razón Social
                </th>
                <td mat-cell *matCellDef="let company" class="text-body text-primary-black">
                  {{ company.businessName }}
                </td>
              </ng-container>

              <!-- Nombre Comercial Column -->
              <ng-container matColumnDef="tradeName">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="text-subtitle font-bold text-accent-titles"
                >
                  Nombre Comercial
                </th>
                <td mat-cell *matCellDef="let company" class="text-body text-primary-black">
                  {{ company.tradeName || '—' }}
                </td>
              </ng-container>

              <!-- Administradores Column -->
              <ng-container matColumnDef="admin">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="text-subtitle font-bold text-accent-titles"
                >
                  Administradores
                </th>
                <td mat-cell *matCellDef="let company" class="text-body py-2">
                  <!-- Admin summary chip (clickable) -->
                  <button
                    mat-stroked-button
                    class="!border-secondary-light !bg-secondary-light hover:!bg-secondary hover:!text-primary-white !text-secondary !normal-case !font-normal !text-subtitle !h-8 !px-3"
                    (click)="openAssignAdminDialog(company)"
                  >
                    <mat-icon class="!text-base !w-4 !h-4 !mr-1">group</mat-icon>
                    @if (getAdminCount(company) === 0) {
                      <span>Sin asignar - Clic para agregar</span>
                    } @else if (getAdminCount(company) === 1) {
                      <span
                        >{{ getAdminPreview(company)[0].firstName }}
                        {{ getAdminPreview(company)[0].lastName }}</span
                      >
                    } @else {
                      <span>{{ getAdminCount(company) }} administradores</span>
                    }
                    <mat-icon class="!text-base !w-4 !h-4 !ml-1">{{
                      getAdminCount(company) === 0 ? 'add' : 'chevron_right'
                    }}</mat-icon>
                  </button>
                </td>
              </ng-container>

              <!-- Estado Column -->
              <ng-container matColumnDef="status">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="text-subtitle font-bold text-accent-titles"
                >
                  Estado
                </th>
                <td mat-cell *matCellDef="let company">
                  @if (company.status === 'active') {
                    <span class="px-2 py-1 bg-secondary-light text-secondary text-subtitle rounded">
                      Activa
                    </span>
                  } @else {
                    <span
                      class="px-2 py-1 bg-gray-100 text-neutral-subheading text-subtitle rounded"
                    >
                      Inactiva
                    </span>
                  }
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="text-subtitle font-bold text-accent-titles"
                >
                  Acciones
                </th>
                <td mat-cell *matCellDef="let company">
                  <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Menú de acciones">
                    <mat-icon>more_vert</mat-icon>
                  </button>

                  <mat-menu #menu="matMenu">
                    <button mat-menu-item (click)="openEditDialog(company)">
                      <mat-icon>edit</mat-icon>
                      <span>Editar</span>
                    </button>

                    <button mat-menu-item (click)="openAssignAdminDialog(company)">
                      <mat-icon>group</mat-icon>
                      <span>Gestionar administradores</span>
                    </button>

                    <button mat-menu-item (click)="toggleStatus(company)">
                      <mat-icon>{{
                        company.status === 'active' ? 'block' : 'check_circle'
                      }}</mat-icon>
                      <span>{{ company.status === 'active' ? 'Desactivar' : 'Activar' }}</span>
                    </button>

                    <button mat-menu-item (click)="deleteCompany(company)" class="text-red-600">
                      <mat-icon class="text-red-600">delete</mat-icon>
                      <span>Eliminar</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </div>
        </div>

        <!-- Mobile Cards (visible only on mobile) -->
        <div class="md:hidden space-y-4">
          @for (company of companies(); track company.id) {
            <div class="bg-primary-white rounded-lg shadow p-4 space-y-3">
              <!-- Header with status and menu -->
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 class="text-body font-bold text-primary-black">
                    {{ company.businessName }}
                  </h3>
                  @if (company.tradeName) {
                    <p class="text-subtitle text-neutral-subheading">{{ company.tradeName }}</p>
                  }
                </div>

                <div class="flex items-center gap-2">
                  @if (company.status === 'active') {
                    <span
                      class="px-2 py-1 bg-secondary-light text-secondary text-subtitle rounded whitespace-nowrap"
                    >
                      Activa
                    </span>
                  } @else {
                    <span
                      class="px-2 py-1 bg-gray-100 text-neutral-subheading text-subtitle rounded whitespace-nowrap"
                    >
                      Inactiva
                    </span>
                  }

                  <button
                    mat-icon-button
                    [matMenuTriggerFor]="mobileMenu"
                    aria-label="Menú de acciones"
                  >
                    <mat-icon>more_vert</mat-icon>
                  </button>

                  <mat-menu #mobileMenu="matMenu">
                    <button mat-menu-item (click)="openEditDialog(company)">
                      <mat-icon>edit</mat-icon>
                      <span>Editar</span>
                    </button>

                    <button mat-menu-item (click)="openAssignAdminDialog(company)">
                      <mat-icon>group</mat-icon>
                      <span>Gestionar administradores</span>
                    </button>

                    <button mat-menu-item (click)="toggleStatus(company)">
                      <mat-icon>{{
                        company.status === 'active' ? 'block' : 'check_circle'
                      }}</mat-icon>
                      <span>{{ company.status === 'active' ? 'Desactivar' : 'Activar' }}</span>
                    </button>

                    <button mat-menu-item (click)="deleteCompany(company)" class="text-red-600">
                      <mat-icon class="text-red-600">delete</mat-icon>
                      <span>Eliminar</span>
                    </button>
                  </mat-menu>
                </div>
              </div>

              <!-- RUC -->
              <div class="flex items-center gap-2">
                <mat-icon class="!text-base text-neutral-subheading">badge</mat-icon>
                <span class="text-subtitle text-neutral-subheading">RUC:</span>
                <span class="text-body text-primary-black">{{ company.ruc }}</span>
              </div>

              <!-- Administradores -->
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <mat-icon class="!text-base text-neutral-subheading">group</mat-icon>
                  <span class="text-subtitle font-bold text-neutral-subheading"
                    >Administradores:</span
                  >
                </div>

                @if (getAdminCount(company) > 0) {
                  <div class="flex flex-wrap items-center gap-2 ml-6">
                    @for (admin of getAdminPreview(company); track admin.id) {
                      <div
                        class="inline-flex items-center gap-1 px-2 py-1 bg-secondary-light text-secondary text-subtitle rounded"
                      >
                        <mat-icon class="!text-base !w-4 !h-4">person</mat-icon>
                        <span>{{ admin.firstName }} {{ admin.lastName }}</span>
                      </div>
                    }

                    @if (getAdminCount(company) > 2) {
                      <button
                        mat-stroked-button
                        class="!text-secondary !border-secondary"
                        (click)="openAssignAdminDialog(company)"
                      >
                        Ver todos ({{ getAdminCount(company) }})
                      </button>
                    } @else {
                      <button
                        mat-icon-button
                        class="!w-8 !h-8"
                        (click)="openAssignAdminDialog(company)"
                      >
                        <mat-icon class="!text-base text-secondary">visibility</mat-icon>
                      </button>
                    }
                  </div>
                } @else {
                  <button
                    mat-stroked-button
                    class="!text-neutral-subheading !border-neutral-subheading ml-6"
                    (click)="openAssignAdminDialog(company)"
                  >
                    <mat-icon>person_add</mat-icon>
                    <span>Asignar administrador</span>
                  </button>
                }
              </div>

              <!-- Quick Actions (Mobile) -->
              <div class="flex gap-2 pt-2 border-t border-gray-200">
                <button mat-stroked-button class="flex-1" (click)="openEditDialog(company)">
                  <mat-icon>edit</mat-icon>
                  <span>Editar</span>
                </button>

                <button mat-stroked-button class="flex-1" (click)="openAssignAdminDialog(company)">
                  <mat-icon>group</mat-icon>
                  <span>Admins</span>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompaniesPage implements OnInit {
  private companiesService = inject(CompaniesService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  companies = signal<Company[]>([]);
  loading = signal(true);

  displayedColumns: string[] = ['ruc', 'businessName', 'tradeName', 'admin', 'status', 'actions'];

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.loading.set(true);
    this.companiesService.getCompanies().subscribe({
      next: (companies) => {
        this.companies.set(companies);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading companies:', error);
        this.snackBar.open('Error al cargar empresas', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open<CompanyFormComponent, CompanyFormData, Company>(
      CompanyFormComponent,
      {
        width: '600px',
        data: { mode: 'create' },
      },
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Add new company to the list
        this.companies.set([...this.companies(), result]);
        this.snackBar.open('Empresa creada correctamente', 'Cerrar', { duration: 3000 });
      }
    });
  }

  openEditDialog(company: Company): void {
    const dialogRef = this.dialog.open<CompanyFormComponent, CompanyFormData, Company>(
      CompanyFormComponent,
      {
        width: '600px',
        data: {
          mode: 'edit',
          company,
        },
      },
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Update company in the list
        const companies = this.companies();
        const index = companies.findIndex((c) => c.id === result.id);
        if (index !== -1) {
          companies[index] = result;
          this.companies.set([...companies]);
        }
        this.snackBar.open('Empresa actualizada correctamente', 'Cerrar', { duration: 3000 });
      }
    });
  }

  openAssignAdminDialog(company: Company): void {
    const dialogRef = this.dialog.open<AssignAdminDialogComponent, AssignAdminDialogData, unknown>(
      AssignAdminDialogComponent,
      {
        width: '700px',
        maxWidth: '90vw',
        data: {
          company,
          maxAdmins: 4, // Parametrizable
        },
      },
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Reload companies to get updated admin list
        this.loadCompanies();
        this.snackBar.open('Administradores actualizados correctamente', 'Cerrar', {
          duration: 3000,
        });
      }
    });
  }

  /**
   * Get the count of administrators for a company
   */
  getAdminCount(company: Company): number {
    // TODO: Replace with real data from company.admins array
    // Using RUC as key for mock data (more stable than generated IDs)
    const mockAdminCounts: Record<string, number> = {
      '20123456789': 2, // Agroindustrias Pachamama S.A.C.
      '20987654321': 3,
      '20555888999': 0,
    };
    return mockAdminCounts[company.ruc] || 0;
  }

  /**
   * Get preview of first 2 administrators
   */
  getAdminPreview(
    company: Company,
  ): { id: string; firstName: string; lastName: string; email: string }[] {
    // TODO: Replace with real data from company.admins array
    // Using RUC as key for mock data (more stable than generated IDs)
    const mockAdmins: Record<
      string,
      { id: string; firstName: string; lastName: string; email: string }[]
    > = {
      '20123456789': [
        // Agroindustrias Pachamama S.A.C.
        { id: 'user-1', firstName: 'Juan', lastName: 'Pérez', email: 'admin@pachamama.com' },
        { id: 'user-2', firstName: 'María', lastName: 'García', email: 'maria@empresa.com' },
      ],
      '20987654321': [
        { id: 'user-1', firstName: 'Carlos', lastName: 'López', email: 'carlos@empresa.com' },
        { id: 'user-2', firstName: 'Ana', lastName: 'Rodríguez', email: 'ana@empresa.com' },
        { id: 'user-3', firstName: 'Pedro', lastName: 'Sánchez', email: 'pedro@empresa.com' },
      ],
    };
    return (mockAdmins[company.ruc] || []).slice(0, 2);
  }

  toggleStatus(company: Company): void {
    const newStatus = company.status === 'active' ? 'inactive' : 'active';

    this.companiesService.updateCompany(company.id, { status: newStatus }).subscribe({
      next: (updatedCompany) => {
        const companies = this.companies();
        const index = companies.findIndex((c) => c.id === updatedCompany.id);
        if (index !== -1) {
          companies[index] = updatedCompany;
          this.companies.set([...companies]);
        }

        const statusText = newStatus === 'active' ? 'activada' : 'desactivada';
        this.snackBar.open(`Empresa ${statusText} correctamente`, 'Cerrar', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error updating company status:', error);
        this.snackBar.open('Error al cambiar el estado de la empresa', 'Cerrar', {
          duration: 3000,
        });
      },
    });
  }

  deleteCompany(company: Company): void {
    if (!confirm(`¿Estás seguro de eliminar la empresa "${company.businessName}"?`)) {
      return;
    }

    this.companiesService.deleteCompany(company.id).subscribe({
      next: () => {
        const companies = this.companies().filter((c) => c.id !== company.id);
        this.companies.set(companies);
        this.snackBar.open('Empresa eliminada correctamente', 'Cerrar', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error deleting company:', error);
        this.snackBar.open('Error al eliminar la empresa', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
