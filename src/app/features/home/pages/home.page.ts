import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import {
  BarChartComponent,
  type BarChartData,
} from '../../../shared/components/bar-chart/bar-chart.component';
import {
  DonutChartComponent,
  type DonutChartData,
} from '../../../shared/components/donut-chart/donut-chart.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CompanyMapComponent } from '../components/company-map/company-map.component';
import { SidebarService } from '@app/core/services/sidebar.service';
import { AuthService } from '@app/core/auth/auth.service';
import { ChangePasswordDialogComponent } from '@app/shared/components/change-password-dialog/change-password-dialog.component';
import { PERMISSIONS } from '@core/auth/permissions';
import { getRoleDisplayName } from '@app/features/company-users/models/role.model';

import { BusinessDashboardOverviewDto } from '../models/dashboard.model';
import { stageLabel, stageColor } from '../utils/stage-catalog';
import { DashboardService } from '../services/dashboard.service';

@Component({
  standalone: true,
  selector: 'app-home-page',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTableModule,
    BarChartComponent,
    DonutChartComponent,
    EmptyStateComponent,
    CompanyMapComponent,
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  private dialog = inject(MatDialog);
  readonly sidebarService = inject(SidebarService);
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  protected readonly PERMISSIONS = PERMISSIONS;

  private dialogRef:
    | import('@angular/material/dialog').MatDialogRef<ChangePasswordDialogComponent>
    | null = null;

  overview = signal<BusinessDashboardOverviewDto | null>(null);
  totalProjects = signal<number>(0);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Fecha de corte: hoy por defecto
  asOfDate = signal<Date>(new Date());
  maxDate = new Date();

  hasDashboardPermission = computed(() =>
    this.sidebarService.hasPermission(PERMISSIONS.DASHBOARD.VIEW),
  );

  userName = computed(() => {
    const displayName = this.authService.currentUser()?.displayName;
    if (displayName) {
      return displayName.split(' ')[0];
    }
    const email = this.authService.currentUser()?.email ?? '';
    if (!email) return 'Usuario';
    const namePart = email.split('@')[0];
    const parts = namePart.split('.');
    const first = parts[0];
    return first.charAt(0).toUpperCase() + first.slice(1);
  });

  userRole = computed(() => getRoleDisplayName(this.sidebarService.roleCode()));

  ngOnInit(): void {
    // Pequeño delay para asegurar que sidebar service haya cargado correctamente
    setTimeout(() => {
      if (!this.sidebarService.isPasswordChanged() && !this.dialogRef) {
        this.openChangePasswordDialog();
      }
    }, 100);

    if (this.hasDashboardPermission()) {
      this.loadDashboard();
    }
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    // Format date as "yyyy-MM-dd"
    // Using local date values to avoid timezone shifts changing the day
    const d = this.asOfDate();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    this.dashboardService.getOverview(dateStr).subscribe({
      next: (data) => {
        this.overview.set(data);
        const count = data.projectStageDistribution.reduce((sum, s) => sum + s.count, 0);
        this.totalProjects.set(count);
        this.loading.set(false);
      },
      error: (_err) => {
        this.error.set('No se pudo cargar el dashboard. Intente de nuevo.');
        this.overview.set(null);
        this.totalProjects.set(0);
        this.loading.set(false);
      },
    });
  }

  onDateChange(): void {
    this.loadDashboard();
  }

  refresh(): void {
    this.asOfDate.set(new Date()); // Volver a hoy
    this.loadDashboard();
  }

  // Bar Chart Data
  projectsChartData = computed<BarChartData | null>(() => {
    const data = this.overview();
    if (!data || data.projectStageDistribution.length === 0) return null;

    const sortedData = [...data.projectStageDistribution].sort((a, b) => b.count - a.count);

    return {
      labels: sortedData.map((item) => stageLabel(item.stage)),
      values: sortedData.map((item) => item.count),
      label: 'Proyectos',
      colors: sortedData.map((item) => stageColor(item.stage)),
    };
  });

  // Donut Chart Data
  collectorsChartData = computed<DonutChartData | null>(() => {
    const data = this.overview();
    if (!data || !data.collectors || data.collectors.total === 0) return null;

    const femaleTotal = data.collectors.femaleTotal;
    const othersTotal = data.collectors.total - femaleTotal;

    return {
      labels: ['Mujeres', 'Hombres'],
      values: [femaleTotal, othersTotal],
      colors: ['#EC4899', '#6366F1'],
      centerText: `${data.collectors.femalePercentage.toFixed(1)}% Mujeres`,
      tooltipLabel: 'Recolectores',
    };
  });

  // Age Distribution Chart Data
  ageChartData = computed<BarChartData | null>(() => {
    const data = this.overview();
    if (
      !data ||
      !data.collectors ||
      !data.collectors.ageDistribution ||
      data.collectors.ageDistribution.length === 0
    )
      return null;

    const ageData = data.collectors.ageDistribution;

    return {
      labels: ageData.map((item) => item.ageRange),
      values: ageData.map((item) => item.count),
      label: 'Recolectores',
      colors: ageData.map(() => '#10B981'),
    };
  });

  // Production Chart Data
  productionChartData = computed<BarChartData | null>(() => {
    const data = this.overview();
    if (!data || !data.productionByProduct || data.productionByProduct.length === 0) return null;

    const prodData = [...data.productionByProduct].sort(
      (a, b) => b.totalWeightKg - a.totalWeightKg,
    );

    return {
      labels: prodData.map((item) => item.productName),
      values: prodData.map((item) => item.totalWeightKg),
      label: 'Producción (Kg)',
      colors: prodData.map(() => '#8B5CF6'), // Violeta, coherente con transformación primaria
    };
  });

  get hasProjectsData(): boolean {
    return this.totalProjects() > 0;
  }

  /**
   * Abre el modal de cambio de contraseña obligatorio
   */
  private openChangePasswordDialog(): void {
    if (this.dialogRef) {
      return;
    }

    if (
      this.dialog.openDialogs.some(
        (dialog) => dialog.componentInstance instanceof ChangePasswordDialogComponent,
      )
    ) {
      return;
    }

    this.dialogRef = this.dialog.open(ChangePasswordDialogComponent, {
      disableClose: true,
      width: '100%',
      maxWidth: '500px',
      panelClass: 'change-password-dialog-container',
    });

    this.dialogRef.afterClosed().subscribe((_result) => {
      this.dialogRef = null;
    });
  }
}
