import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CompaniesService } from '../services/companies.service';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import {
  Company,
  CompanyStatus,
  getCompanyStatusLabel,
  getCompanyStatusClass,
  getCompanyStatusIcon,
  getLicenseTypeLabel,
} from '../models/company.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CompanyFormComponent, CompanyFormData } from '../components/company-form.component';
import {
  AssignAdminDialogComponent,
  AssignAdminDialogData,
} from '../components/assign-admin-dialog.component';
import {
  CompanyDocumentsDialogComponent,
  CompanyDocumentsDialogData,
} from '../components/company-documents-dialog.component';

@Component({
  selector: 'app-companies-page',
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    EmptyStateComponent,
  ],
  templateUrl: './companies.page.html',
  styleUrl: './companies.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompaniesPage implements OnInit {
  private companiesService = inject(CompaniesService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private router = inject(Router);

  // Search and filtering
  searchTerm = signal('');

  // Pagination
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);

  // Data
  companies = signal<Company[]>([]);
  loading = signal(true);

  // Filtered companies based on search
  filteredCompanies = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    if (!search) {
      return this.companies();
    }

    return this.companies().filter((company) => {
      return (
        company.ruc.includes(search) ||
        company.businessName.toLowerCase().includes(search) ||
        (company.tradeName?.toLowerCase().includes(search) ?? false)
      );
    });
  });

  displayedColumns: string[] = [
    'ruc',
    'businessName',
    'tradeName',
    'licenseType',
    'admins',
    'status',
    'actions',
  ];

  // Enums y helpers para el template
  readonly CompanyStatus = CompanyStatus;
  readonly getCompanyStatusLabel = getCompanyStatusLabel;
  readonly getCompanyStatusClass = getCompanyStatusClass;
  readonly getCompanyStatusIcon = getCompanyStatusIcon;
  readonly getLicenseTypeLabel = getLicenseTypeLabel;

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.loading.set(true);
    this.companiesService
      .getCompanies({
        page: this.currentPage(),
        size: this.pageSize(),
        search: this.searchTerm() || undefined,
      })
      .subscribe({
        next: (response) => {
          // Validación defensiva: asegurarse de que items sea un array
          this.companies.set(response?.items ?? []);
          this.totalElements.set(response?.total ?? 0);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading companies:', error);
          this.notification.error('Error al cargar empresas');
          this.companies.set([]); // Asegurar array vacío en caso de error
          this.totalElements.set(0);
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
        this.notification.success('Empresa creada correctamente');

        // PASO 2: Abrir dialog de documentos automáticamente
        this.openDocumentsDialog(result);
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
        this.notification.success('Empresa actualizada correctamente');
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
        this.notification.success('Administradores actualizados correctamente');
      }
    });
  }

  /**
   * Abrir diálogo de documentos
   */
  openDocumentsDialog(company: Company): void {
    const dialogRef = this.dialog.open<
      CompanyDocumentsDialogComponent,
      CompanyDocumentsDialogData,
      boolean
    >(CompanyDocumentsDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: { company },
      disableClose: false, // Permitir cerrar con ESC o click fuera
    });

    dialogRef.afterClosed().subscribe((isCompliant) => {
      if (isCompliant) {
        this.notification.success('Documentación completa. La empresa está activa.');
        // Recargar lista para actualizar el estado
        this.loadCompanies();
      } else if (isCompliant === false) {
        this.notification.info(
          'Puedes completar los documentos más tarde desde el menú de acciones.',
        );
        // Recargar lista por si se subieron algunos documentos
        this.loadCompanies();
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

  onSearchChange(searchValue: string): void {
    this.searchTerm.set(searchValue);
    // Reset to first page when searching
    this.currentPage.set(0);
    this.loadCompanies();
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.currentPage.set(0);
    this.loadCompanies();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadCompanies();
  }

  toggleStatus(company: Company): void {
    const newStatus =
      company.status === CompanyStatus.ACTIVE ? CompanyStatus.INACTIVE : CompanyStatus.ACTIVE;

    this.companiesService.updateCompany(company.id, { status: newStatus }).subscribe({
      next: (updatedCompany) => {
        const companies = this.companies();
        const index = companies.findIndex((c) => c.id === updatedCompany.id);
        if (index !== -1) {
          companies[index] = updatedCompany;
          this.companies.set([...companies]);
        }

        const statusText = newStatus === CompanyStatus.ACTIVE ? 'activada' : 'desactivada';
        this.notification.success(`Empresa ${statusText} correctamente`);
      },
      error: (error) => {
        console.error('Error updating company status:', error);
        this.notification.error('Error al cambiar el estado de la empresa');
      },
    });
  }

  deleteCompany(company: Company): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Eliminar empresa?',
        message: `Esta acción eliminará permanentemente la empresa "${company.businessName}".`,
        confirmText: 'Eliminar',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.companiesService.deleteCompany(company.id).subscribe({
          next: () => {
            const companies = this.companies().filter((c) => c.id !== company.id);
            this.companies.set(companies);
            this.notification.success('Empresa eliminada correctamente');
          },
          error: (error) => {
            console.error('Error deleting company:', error);
            this.notification.error('Error al eliminar la empresa');
          },
        });
      }
    });
  }
}
