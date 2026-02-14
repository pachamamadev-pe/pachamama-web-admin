import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Project, CreateProjectRequest, UpdateProjectRequest } from '../models/project.model';
import { ProductsService } from '../../products/services/products.service';
import { Product } from '../../products/models/product.model';
import { CommunitiesService } from '../../communities/services/communities.service';
import { Community } from '../../communities/models/community.model';
import { formatDateISO, parseDateValue } from '@shared/utils/date-helpers';

interface DialogData {
  mode: 'create' | 'edit';
  project?: Project;
  currentCommunityId?: string; // Para modo edición
}

@Component({
  selector: 'app-project-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 class="text-title font-bold text-accent-titles">{{ dialogTitle }}</h2>
        <button mat-icon-button (click)="onCancel()" type="button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      @if (loadingData()) {
        <div class="loading-container">
          <mat-spinner diameter="40" />
          <p class="text-body text-neutral-subheading mt-4">Cargando datos del formulario...</p>
        </div>
      } @else {
        <form [formGroup]="projectForm" (ngSubmit)="onSubmit()">
          <div class="dialog-content">
            <!-- Nombre del proyecto -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Nombre del proyecto</mat-label>
              <input
                matInput
                formControlName="name"
                placeholder="Ej: Proyecto Café Orgánico 2025"
                maxlength="100"
                required
              />
              @if (hasError('name', 'required')) {
                <mat-error>El nombre es obligatorio</mat-error>
              }
              @if (hasError('name', 'minlength')) {
                <mat-error>El nombre debe tener al menos 3 caracteres</mat-error>
              }
            </mat-form-field>

            <!-- Producto -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Producto</mat-label>
              <mat-select formControlName="productId" required>
                <mat-option value="">Seleccionar producto</mat-option>
                @for (product of products(); track product.id) {
                  <mat-option [value]="product.id">
                    {{ product.name }}
                  </mat-option>
                }
              </mat-select>
              @if (hasError('productId', 'required')) {
                <mat-error>El producto es obligatorio</mat-error>
              }
            </mat-form-field>

            <!-- Comunidad -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Comunidad</mat-label>
              <mat-select formControlName="communityId" required>
                <mat-option value="">Seleccionar comunidad</mat-option>
                @for (community of communities(); track community.id) {
                  <mat-option [value]="community.id">
                    {{ community.name }}
                  </mat-option>
                }
              </mat-select>
              @if (hasError('communityId', 'required')) {
                <mat-error>La comunidad es obligatoria</mat-error>
              }
              <mat-hint>El comunidad será vinculado a este proyecto</mat-hint>
            </mat-form-field>

            <!-- Descripción -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Descripción</mat-label>
              <textarea
                matInput
                formControlName="description"
                placeholder="Descripción del proyecto..."
                rows="4"
                maxlength="500"
              ></textarea>
              <mat-hint align="end">Opcional</mat-hint>
            </mat-form-field>

            <!-- Cuota aprobada y Máximo de recolectores -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Cuota aprobada -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Cuota aprobada de recolección</mat-label>
                <input
                  matInput
                  type="number"
                  formControlName="approvedQuota"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                />
                <span matTextSuffix class="ml-2 text-neutral-subheading">{{ productUnit }}</span>
                @if (hasError('approvedQuota', 'required')) {
                  <mat-error>La cuota es obligatoria</mat-error>
                }
                @if (hasError('approvedQuota', 'min')) {
                  <mat-error>La cuota debe ser mayor a 0</mat-error>
                }
                <mat-hint>Máximo a recolectar en {{ productUnit }}</mat-hint>
              </mat-form-field>

              <!-- Máximo de recolectores -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Máximo de recolectores</mat-label>
                <input
                  matInput
                  type="number"
                  formControlName="maxCollectors"
                  placeholder="0"
                  min="1"
                  step="1"
                  required
                />
                <span matTextSuffix class="ml-2 text-neutral-subheading">personas</span>
                @if (hasError('maxCollectors', 'required')) {
                  <mat-error>El máximo es obligatorio</mat-error>
                }
                @if (hasError('maxCollectors', 'min')) {
                  <mat-error>Debe ser al menos 1 recolector</mat-error>
                }
                <mat-hint>N° máximo de participantes</mat-hint>
              </mat-form-field>
            </div>

            <!-- Fechas -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Fecha de inicio -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Fecha de inicio</mat-label>
                <input
                  matInput
                  [matDatepicker]="startPicker"
                  formControlName="startDate"
                  placeholder="DD/MM/AAAA"
                />
                <mat-datepicker-toggle matIconSuffix [for]="startPicker" />
                <mat-datepicker #startPicker />
              </mat-form-field>

              <!-- Fecha de fin -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Fecha de fin</mat-label>
                <input
                  matInput
                  [matDatepicker]="endPicker"
                  formControlName="endDate"
                  placeholder="DD/MM/AAAA"
                />
                <mat-datepicker-toggle matIconSuffix [for]="endPicker" />
                <mat-datepicker #endPicker />
              </mat-form-field>
            </div>
          </div>

          <div class="dialog-actions">
            <button mat-stroked-button type="button" (click)="onCancel()" [disabled]="loading()">
              Cancelar
            </button>
            <button
              mat-raised-button
              class="btn-primary"
              type="submit"
              [disabled]="projectForm.invalid || loading()"
            >
              @if (loading()) {
                <mat-spinner diameter="20" />
              } @else {
                <span>{{ isEditMode ? 'Actualizar' : 'Crear' }}</span>
              }
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: `
    .dialog-container {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 16px;
      border-bottom: 1px solid #e5e5e5;
    }

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e5e5e5;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFormComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ProjectFormComponent>);
  private fb = inject(FormBuilder);
  private productsService = inject(ProductsService);
  private communitiesService = inject(CommunitiesService);
  data = inject<DialogData>(MAT_DIALOG_DATA);

  projectForm!: FormGroup;
  loading = signal(false);
  loadingData = signal(true);
  products = signal<Product[]>([]);
  communities = signal<Community[]>([]);

  // Computed para obtener el producto seleccionado
  get selectedProduct(): Product | undefined {
    const productId = this.projectForm?.get('productId')?.value;
    return this.products().find((p) => p.id === productId);
  }

  // Obtener la unidad del producto seleccionado
  get productUnit(): string {
    return this.selectedProduct?.unit || 'kg';
  }

  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }

  get dialogTitle(): string {
    return this.isEditMode ? 'Editar proyecto' : 'Crear nuevo proyecto';
  }

  ngOnInit(): void {
    this.loadData();
    this.initializeForm();
  }

  private loadData(): void {
    this.loadingData.set(true);

    // Cargar productos y comunidades en paralelo
    Promise.all([
      this.productsService.getProducts({ page: 0, size: 100 }).toPromise(),
      this.communitiesService.getCommunities().toPromise(),
    ])
      .then(([productsResponse, communities]) => {
        this.products.set(productsResponse?.items || []);
        this.communities.set(communities || []);
        this.loadingData.set(false);
      })
      .catch((error) => {
        console.error('Error loading form data:', error);
        this.products.set([]);
        this.communities.set([]);
        this.loadingData.set(false);
      });
  }

  private initializeForm(): void {
    const project = this.data.project;

    this.projectForm = this.fb.group({
      name: [project?.name || '', [Validators.required, Validators.minLength(3)]],
      productId: [project?.productId || '', Validators.required],
      communityId: [
        this.data.currentCommunityId || project?.communityLink?.communityId || '',
        Validators.required,
      ],
      description: [project?.description || ''],
      approvedQuota: [project?.approvedQuota || null, [Validators.required, Validators.min(0.01)]],
      maxCollectors: [project?.maxCollectors || null, [Validators.required, Validators.min(1)]],
      startDate: [
        project?.startDate ? parseDateValue(project.startDate) : null,
        Validators.required,
      ],
      endDate: [project?.endDate ? parseDateValue(project.endDate) : null, Validators.required],
    });
  }

  onSubmit(): void {
    if (this.projectForm.valid && !this.loading()) {
      this.loading.set(true);

      const formValue = this.projectForm.value;

      // Format dates to ISO string (YYYY-MM-DD) sin desfase por timezone
      const toIsoDate = (date: Date | null): string | undefined => {
        if (!date) return undefined;
        return formatDateISO(date);
      };

      if (this.isEditMode) {
        const updateData: UpdateProjectRequest = {
          name: formValue.name,
          productId: formValue.productId,
          description: formValue.description || undefined,
          approvedQuota: formValue.approvedQuota,
          maxCollectors: formValue.maxCollectors,
          startDate: toIsoDate(formValue.startDate),
          endDate: toIsoDate(formValue.endDate),
        };

        // Retornar también el communityId para actualizar el vínculo si cambió
        this.dialogRef.close({
          mode: 'edit',
          data: updateData,
          communityId: formValue.communityId,
          originalCommunityId:
            this.data.currentCommunityId || this.data.project?.communityLink?.communityId,
        });
      } else {
        const createData: CreateProjectRequest = {
          name: formValue.name,
          productId: formValue.productId,
          companyId: '', // Will be set in the page component from SidebarService
          description: formValue.description || undefined,
          approvedQuota: formValue.approvedQuota,
          maxCollectors: formValue.maxCollectors,
          startDate: toIsoDate(formValue.startDate),
          endDate: toIsoDate(formValue.endDate),
          code: '', // Empty string as per requirements
        };

        // Retornar también el communityId para vincular después de crear el proyecto
        this.dialogRef.close({
          mode: 'create',
          data: createData,
          communityId: formValue.communityId,
        });
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.projectForm.get(controlName);
    return !!(control?.hasError(errorName) && (control?.dirty || control?.touched));
  }
}
