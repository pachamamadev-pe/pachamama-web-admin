import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/auth/auth.service';
import { ProjectsService } from '@features/projects/services/projects.service';
import { CompaniesService } from '@features/companies/services/companies.service';
import { NotificationService } from '@core/services/notification.service';
import { CollectionRequest } from '../models/collection-request.model';
import { Project } from '@features/projects/models/project.model';
import { Company } from '@features/companies/models/company.model';

interface CollectionRequestFormData {
  mode: 'create' | 'edit';
  request?: CollectionRequest;
}

@Component({
  selector: 'app-collection-request-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 mat-dialog-title class="text-body font-bold text-accent-titles">
          {{ isEditMode() ? 'Actualizar Solicitud Observada' : 'Nueva Solicitud de Recolección' }}
        </h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        @if (loadingData()) {
          <div class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p class="text-subtitle text-neutral-subheading mt-2">Cargando datos...</p>
          </div>
        } @else {
          <form [formGroup]="form" class="form-container">
            <!-- Compañía (readonly si ya tiene companyId asignado) -->
            @if (userCompanyId()) {
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Compañía</mat-label>
                <input matInput [value]="selectedCompanyName()" readonly />
                <mat-icon matPrefix>business</mat-icon>
              </mat-form-field>
            } @else {
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Compañía</mat-label>
                <mat-select formControlName="companyId">
                  @for (company of companies(); track company.id) {
                    <mat-option [value]="company.id">{{ company.businessName }}</mat-option>
                  }
                </mat-select>
                <mat-icon matPrefix>business</mat-icon>
                @if (form.get('companyId')?.hasError('required')) {
                  <mat-error>Debes seleccionar una compañía</mat-error>
                }
              </mat-form-field>
            }

            <!-- Proyecto -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Proyecto</mat-label>
              <mat-select formControlName="projectId" [disabled]="isEditMode()">
                @for (project of filteredProjects(); track project.id) {
                  <mat-option [value]="project.id">
                    {{ project.name }} - {{ project.productName }}
                  </mat-option>
                }
              </mat-select>
              <mat-icon matPrefix>folder</mat-icon>
              @if (form.get('projectId')?.hasError('required')) {
                <mat-error>Debes seleccionar un proyecto</mat-error>
              }
            </mat-form-field>

            <!-- Peso Solicitado -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Peso Solicitado ({{ selectedProjectUnit() }})</mat-label>
              <input matInput type="number" formControlName="requestedWeighing" step="0.01" />
              <mat-icon matPrefix>scale</mat-icon>
              @if (form.get('requestedWeighing')?.hasError('required')) {
                <mat-error>El peso es requerido</mat-error>
              }
              @if (form.get('requestedWeighing')?.hasError('min')) {
                <mat-error>El peso debe ser mayor a 0</mat-error>
              }
            </mat-form-field>

            <!-- Fecha Inicio -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Fecha de Inicio</mat-label>
              <input matInput [matDatepicker]="startPicker" formControlName="startDate" />
              <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
              <mat-icon matPrefix>event</mat-icon>
              @if (form.get('startDate')?.hasError('required')) {
                <mat-error>La fecha de inicio es requerida</mat-error>
              }
            </mat-form-field>

            <!-- Fecha Fin -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Fecha de Fin</mat-label>
              <input matInput [matDatepicker]="endPicker" formControlName="endDate" />
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
              <mat-icon matPrefix>event</mat-icon>
              @if (form.get('endDate')?.hasError('required')) {
                <mat-error>La fecha de fin es requerida</mat-error>
              }
              @if (form.get('endDate')?.hasError('endBeforeStart')) {
                <mat-error>La fecha de fin debe ser posterior a la de inicio</mat-error>
              }
            </mat-form-field>

            @if (isEditMode() && data.request) {
              <div class="info-banner">
                <mat-icon>info</mat-icon>
                <div>
                  <p class="text-subtitle font-bold">Solicitud Observada</p>
                  <p class="text-subtitle text-neutral-subheading">
                    Corrije los datos observados y vuelve a enviar la solicitud.
                  </p>
                </div>
              </div>
            }
          </form>
        }
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-stroked-button mat-dialog-close [disabled]="saving()">Cancelar</button>
        <button
          mat-raised-button
          class="btn-primary"
          (click)="onSubmit()"
          [disabled]="form.invalid || saving() || loadingData()"
        >
          @if (saving()) {
            <mat-spinner diameter="20" class="inline-spinner"></mat-spinner>
          }
          <span>{{ isEditMode() ? 'Actualizar' : 'Crear Solicitud' }}</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #e5e5e5;

        h2 {
          margin: 0;
        }
      }

      .dialog-content {
        padding: 1.5rem;
        overflow-y: auto;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
      }

      .form-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .info-banner {
        display: flex;
        gap: 0.75rem;
        padding: 1rem;
        background-color: #fff5f2;
        border: 1px solid #fe714b;
        border-radius: 8px;
        margin-top: 0.5rem;

        mat-icon {
          color: #fe714b;
        }
      }

      .dialog-actions {
        padding: 1rem 1.5rem;
        border-top: 1px solid #e5e5e5;
        justify-content: flex-end;
        gap: 0.75rem;
      }

      .inline-spinner {
        display: inline-block;
        margin-right: 0.5rem;
      }
    `,
  ],
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionRequestFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CollectionRequestFormComponent>);
  private authService = inject(AuthService);
  private projectsService = inject(ProjectsService);
  private companiesService = inject(CompaniesService);
  private notification = inject(NotificationService);

  data = inject<CollectionRequestFormData>(MAT_DIALOG_DATA);

  // State
  loadingData = signal(true);
  saving = signal(false);
  userCompanyId = signal<string | null>(null);
  companies = signal<Company[]>([]);
  projects = signal<Project[]>([]);

  // Computed
  isEditMode = computed(() => this.data.mode === 'edit');

  selectedCompanyName = computed(() => {
    const companyId = this.userCompanyId();
    if (!companyId) return '';
    const company = this.companies().find((c) => c.id === companyId);
    return company?.businessName || '';
  });

  // Proyectos - ya vienen filtrados por companyId del API
  filteredProjects = computed(() => {
    return this.projects();
  });

  // Unidad del proyecto seleccionado
  selectedProjectUnit = computed(() => {
    const projectId = this.form.get('projectId')?.value;
    if (!projectId) return 'kg'; // Default
    const project = this.projects().find((p) => p.id === projectId);
    return project?.unit || 'kg'; // Default a kg si no tiene unidad
  });

  // Form
  form: FormGroup = this.fb.group(
    {
      companyId: ['', Validators.required],
      projectId: ['', Validators.required],
      requestedWeighing: [null, [Validators.required, Validators.min(0.01)]],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
    },
    { validators: this.dateRangeValidator },
  );

  ngOnInit(): void {
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    try {
      // Obtener companyId del usuario
      const companyId = await this.authService.getUserCompanyId();
      this.userCompanyId.set(companyId);

      // SIEMPRE cargar compañías para que el select tenga opciones
      const companiesPage = await new Promise<Company[]>((resolve, reject) => {
        this.companiesService.getCompanies({ page: 0, size: 1000 }).subscribe({
          next: (response) => resolve(response.items || []),
          error: reject,
        });
      });

      this.companies.set(companiesPage);

      // Si el usuario tiene companyId, cargar sus proyectos y setear/deshabilitar compañía
      if (companyId) {
        // Usuario con compañía asignada: cargar solo sus proyectos
        const projectsPage = await new Promise<Project[]>((resolve, reject) => {
          this.projectsService.getProjects(companyId, 0, 1000).subscribe({
            next: (response) => resolve(response.items || []),
            error: reject,
          });
        });

        this.projects.set(projectsPage);

        // Establecer companyId en el formulario y deshabilitarlo
        this.form.patchValue({ companyId });
        this.form.get('companyId')?.disable();
      } else {
        // ADMIN_PACHAMAMA: escuchar cambios en companyId para cargar proyectos dinámicamente
        this.form.get('companyId')?.valueChanges.subscribe((selectedCompanyId) => {
          if (selectedCompanyId) {
            this.loadProjectsByCompany(selectedCompanyId);
          }
        });
      }

      // Si es modo edición, cargar datos de la solicitud
      if (this.isEditMode() && this.data.request) {
        this.form.patchValue({
          projectId: this.data.request.projectId,
          requestedWeighing: this.data.request.requestedWeighing,
          startDate: new Date(this.data.request.startDate),
          endDate: new Date(this.data.request.endDate),
        });
        // Deshabilitar proyecto en modo edición
        this.form.get('projectId')?.disable();
      }

      this.loadingData.set(false);
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.notification.error('Error al cargar los datos');
      this.loadingData.set(false);
    }
  }

  /**
   * Carga proyectos de una compañía específica
   */
  private loadProjectsByCompany(companyId: string): void {
    this.projectsService.getProjects(companyId, 0, 1000).subscribe({
      next: (response) => {
        this.projects.set(response.items || []);
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.notification.error('Error al cargar proyectos');
      },
    });
  }

  private dateRangeValidator(group: FormGroup): Record<string, boolean> | null {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;

    if (start && end && new Date(start) >= new Date(end)) {
      group.get('endDate')?.setErrors({ endBeforeStart: true });
      return { endBeforeStart: true };
    }

    // Limpiar error si es válido
    if (group.get('endDate')?.hasError('endBeforeStart')) {
      const errors = group.get('endDate')?.errors;
      if (errors) {
        delete errors['endBeforeStart'];
        if (Object.keys(errors).length === 0) {
          group.get('endDate')?.setErrors(null);
        }
      }
    }

    return null;
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);

    // Formatear fechas a YYYY-MM-DD
    const formValue = this.form.getRawValue();
    const startDate = new Date(formValue.startDate);
    const endDate = new Date(formValue.endDate);

    const data = {
      ...formValue,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    this.dialogRef.close({
      mode: this.data.mode,
      data,
    });
  }
}
