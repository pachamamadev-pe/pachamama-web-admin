import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import {
  CompanyUser,
  DocumentType,
  CreateCompanyUserRequest,
  UpdateCompanyUserRequest,
} from '../models/company-user.model';
import { Role } from '../models/role.model';
import { RolesService } from '../services/roles.service';

export interface CompanyUserFormData {
  mode: 'create' | 'edit';
  user?: CompanyUser;
}

@Component({
  selector: 'app-company-user-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="company-user-form-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <div class="header-icon">
          <mat-icon>{{ data.mode === 'create' ? 'person_add' : 'edit' }}</mat-icon>
        </div>
        <div class="header-text">
          <h2 class="text-title font-bold text-accent-titles">
            {{ data.mode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario' }}
          </h2>
          <p class="text-subtitle text-neutral-subheading mt-1">
            {{
              data.mode === 'create'
                ? 'Crea un nuevo usuario y asígnale un rol en la empresa'
                : 'Modifica los datos personales del usuario'
            }}
          </p>
        </div>
        <button mat-icon-button mat-dialog-close class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Info Box (Solo en creación) -->
      @if (data.mode === 'create') {
        <div class="info-box">
          <mat-icon class="info-icon">info</mat-icon>
          <div class="info-content">
            <p class="text-subtitle text-neutral-subheading">
              El usuario tendrá que validar su correo la primera vez que intente el login al
              sistema.
            </p>
          </div>
        </div>
      }

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-content">
        <!-- Email (Editable en ambos modos) -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Correo electrónico</mat-label>
          <mat-icon matPrefix>email</mat-icon>
          <input
            matInput
            formControlName="email"
            type="email"
            placeholder="usuario@empresa.com"
            autocomplete="email"
          />
          @if (form.get('email')?.hasError('required')) {
            <mat-error>El correo es obligatorio</mat-error>
          }
          @if (form.get('email')?.hasError('email')) {
            <mat-error>Ingrese un correo válido</mat-error>
          }
          @if (data.mode === 'create') {
            <mat-hint>El usuario validará este correo al iniciar sesión</mat-hint>
          } @else {
            <mat-hint>Si cambias el correo, el usuario deberá validarlo nuevamente</mat-hint>
          }
        </mat-form-field>

        <!-- Warning Box (Solo en edición cuando el email cambia) -->
        @if (data.mode === 'edit' && hasEmailChanged()) {
          <div class="warning-box">
            <mat-icon class="warning-icon">warning</mat-icon>
            <div class="warning-content">
              <p class="warning-title">Cambio de correo electrónico</p>
              <p class="warning-text">
                Al cambiar el correo, el usuario tendrá que validarlo nuevamente antes de poder
                acceder al sistema. Se enviará un correo de verificación a la nueva dirección.
              </p>
            </div>
          </div>
        }

        <!-- Nombre y Apellido (Fila) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <mat-icon matPrefix>person</mat-icon>
            <input
              matInput
              formControlName="firstName"
              placeholder="Juan"
              autocomplete="given-name"
            />
            @if (form.get('firstName')?.hasError('required')) {
              <mat-error>El nombre es obligatorio</mat-error>
            }
            @if (form.get('firstName')?.hasError('minlength')) {
              <mat-error>Mínimo 2 caracteres</mat-error>
            }
            @if (form.get('firstName')?.hasError('maxlength')) {
              <mat-error>Máximo 50 caracteres</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Apellido</mat-label>
            <mat-icon matPrefix>person</mat-icon>
            <input
              matInput
              formControlName="lastName"
              placeholder="Pérez"
              autocomplete="family-name"
            />
            @if (form.get('lastName')?.hasError('required')) {
              <mat-error>El apellido es obligatorio</mat-error>
            }
            @if (form.get('lastName')?.hasError('minlength')) {
              <mat-error>Mínimo 2 caracteres</mat-error>
            }
            @if (form.get('lastName')?.hasError('maxlength')) {
              <mat-error>Máximo 50 caracteres</mat-error>
            }
          </mat-form-field>
        </div>

        <!-- Teléfono -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Teléfono</mat-label>
          <mat-icon matPrefix>phone</mat-icon>
          <input matInput formControlName="phone" placeholder="987654321" autocomplete="tel" />
          @if (form.get('phone')?.hasError('required')) {
            <mat-error>El teléfono es obligatorio</mat-error>
          }
          @if (form.get('phone')?.hasError('pattern')) {
            <mat-error>Ingrese un teléfono válido (9 dígitos)</mat-error>
          }
        </mat-form-field>

        <!-- Tipo de Documento y Número -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <mat-form-field appearance="outline">
            <mat-label>Tipo de documento</mat-label>
            <mat-icon matPrefix>badge</mat-icon>
            <mat-select formControlName="documentType">
              <mat-option value="DNI">DNI</mat-option>
              <mat-option value="CARNET_EXTRANJERIA">Carné de Extranjería</mat-option>
              <mat-option value="PASAPORTE">Pasaporte</mat-option>
            </mat-select>
            @if (form.get('documentType')?.hasError('required')) {
              <mat-error>Seleccione un tipo</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Número de documento</mat-label>
            <mat-icon matPrefix>credit_card</mat-icon>
            <input matInput formControlName="documentNumber" placeholder="12345678" />
            @if (form.get('documentNumber')?.hasError('required')) {
              <mat-error>El número es obligatorio</mat-error>
            }
            @if (form.get('documentNumber')?.hasError('pattern')) {
              <mat-error>Formato inválido</mat-error>
            }
            @if (form.get('documentNumber')?.hasError('minlength')) {
              <mat-error>Mínimo {{ getMinLengthForDocType() }} dígitos</mat-error>
            }
            @if (form.get('documentNumber')?.hasError('maxlength')) {
              <mat-error>Máximo {{ getMaxLengthForDocType() }} dígitos</mat-error>
            }
          </mat-form-field>
        </div>

        <!-- Rol (Solo creación) -->
        @if (data.mode === 'create') {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Rol</mat-label>
            <mat-icon matPrefix>shield</mat-icon>
            <mat-select formControlName="roleCode">
              <mat-select-trigger>
                @if (form.value.roleCode) {
                  @for (role of availableRoles(); track role.id) {
                    @if (role.code === form.value.roleCode) {
                      <span class="font-semibold text-sm">{{ role.name }}</span>
                    }
                  }
                }
              </mat-select-trigger>
              @if (loadingRoles()) {
                <mat-option disabled>
                  <mat-spinner diameter="20"></mat-spinner>
                  Cargando roles...
                </mat-option>
              }
              @for (role of availableRoles(); track role.id) {
                <mat-option [value]="role.code">
                  <div class="flex flex-col gap-1 py-1">
                    <span class="font-semibold text-sm">{{ role.name }}</span>
                    <span class="text-xs text-neutral-subheading">{{ role.description }}</span>
                  </div>
                </mat-option>
              }
            </mat-select>
            @if (form.get('roleCode')?.hasError('required')) {
              <mat-error>Seleccione un rol</mat-error>
            }
            <mat-hint>Selecciona el rol que tendrá este usuario</mat-hint>
          </mat-form-field>
        }

        <!-- Footer -->
        <div class="dialog-footer">
          <button type="button" mat-stroked-button mat-dialog-close [disabled]="submitting()">
            <mat-icon>close</mat-icon>
            Cancelar
          </button>
          <button
            type="submit"
            mat-raised-button
            class="btn-primary"
            [disabled]="!form.valid || submitting()"
          >
            @if (submitting()) {
              <div class="flex items-center gap-2">
                <mat-spinner diameter="20"></mat-spinner>
                <span>Guardando...</span>
              </div>
            } @else {
              <div class="flex items-center gap-2">
                <mat-icon>{{ data.mode === 'create' ? 'person_add' : 'save' }}</mat-icon>
                <span>{{ data.mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios' }}</span>
              </div>
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .company-user-form-dialog {
        @apply p-6 min-w-[500px] max-w-[600px];
      }

      .dialog-header {
        @apply flex items-start gap-4 mb-6;
      }

      .header-icon {
        @apply w-12 h-12 rounded-full bg-secondary-light flex items-center justify-center flex-shrink-0;
        mat-icon {
          @apply text-secondary text-2xl;
        }
      }

      .header-text {
        @apply flex-1;
      }

      .close-button {
        @apply flex-shrink-0;
      }

      .info-box {
        @apply bg-secondary-light border-l-4 border-secondary p-4 rounded-r-lg flex items-start gap-3 mb-6;
        animation: fadeIn 0.3s ease-in;
      }

      .info-icon {
        @apply text-secondary flex-shrink-0;
      }

      .info-content {
        @apply flex-1;
      }

      .warning-box {
        @apply bg-[#FEF3F2] border-l-4 border-[#F97316] p-4 rounded-r-lg flex items-start gap-3 mb-6;
        animation: fadeIn 0.3s ease-in;
      }

      .warning-icon {
        @apply text-[#F97316] flex-shrink-0;
      }

      .warning-content {
        @apply flex-1;
      }

      .warning-title {
        @apply text-sm font-semibold text-[#F97316] mb-1;
      }

      .warning-text {
        @apply text-xs text-neutral-subheading;
      }

      .form-content {
        @apply space-y-4;
      }

      // Estilos para las opciones del select
      ::ng-deep .mat-mdc-option {
        min-height: 60px !important;
        padding: 8px 16px !important;

        .mdc-list-item__primary-text {
          display: block;
          width: 100%;
        }
      }

      ::ng-deep .mat-mdc-select-panel {
        max-height: 400px !important;
      }

      .dialog-footer {
        @apply flex justify-end gap-3 pt-6 border-t border-neutral-border mt-6;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 640px) {
        .company-user-form-dialog {
          @apply p-4 min-w-0;
        }
        .dialog-header {
          @apply flex-col gap-2;
        }
        .dialog-footer {
          @apply flex-col gap-2;
          button {
            @apply w-full;
          }
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyUserFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private rolesService = inject(RolesService);
  private dialogRef = inject(MatDialogRef<CompanyUserFormComponent>);
  data = inject<CompanyUserFormData>(MAT_DIALOG_DATA);

  form!: FormGroup;
  submitting = signal(false);
  loadingRoles = signal(false);
  availableRoles = signal<Role[]>([]);

  // Validadores dinámicos por tipo de documento (tipado correcto)
  private readonly DOC_VALIDATORS = {
    DNI: [
      Validators.required,
      Validators.pattern(/^\d{8}$/), // Exactamente 8 dígitos
      Validators.minLength(8),
      Validators.maxLength(8),
    ],
    CARNET_EXTRANJERIA: [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{9,12}$/), // Alfanumérico 9-12 caracteres
      Validators.minLength(9),
      Validators.maxLength(12),
    ],
    PASAPORTE: [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{6,12}$/), // Alfanumérico 6-12 caracteres
      Validators.minLength(6),
      Validators.maxLength(12),
    ],
  };

  ngOnInit(): void {
    this.initializeForm();

    // Solo cargar roles en modo creación
    if (this.data.mode === 'create') {
      this.loadRoles();
    }

    // Validación dinámica del número de documento según el tipo
    this.form.get('documentType')?.valueChanges.subscribe((type: DocumentType) => {
      const docNumberControl = this.form.get('documentNumber');
      docNumberControl?.setValidators(this.DOC_VALIDATORS[type]);
      docNumberControl?.updateValueAndValidity();
    });
  }

  private initializeForm(): void {
    if (this.data.mode === 'create') {
      // Formulario de creación (incluye email y rol)
      this.form = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
        lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
        phone: ['', [Validators.required, Validators.pattern(/^9\d{8}$/)]],
        documentType: ['DNI', Validators.required],
        documentNumber: ['', this.DOC_VALIDATORS.DNI],
        roleCode: ['', Validators.required],
      });
    } else {
      // Formulario de edición (ahora incluye email editable, pero no rol)
      const user = this.data.user!;
      this.form = this.fb.group({
        email: [user.email || '', [Validators.required, Validators.email]],
        firstName: [
          user.firstName || '',
          [Validators.required, Validators.minLength(2), Validators.maxLength(50)],
        ],
        lastName: [
          user.lastName || '',
          [Validators.required, Validators.minLength(2), Validators.maxLength(50)],
        ],
        phone: [user.phone || '', [Validators.required, Validators.pattern(/^9\d{8}$/)]],
        documentType: [user.documentType || 'DNI', Validators.required],
        documentNumber: [user.documentNumber || '', this.DOC_VALIDATORS[user.documentType]],
      });
    }
  }

  private loadRoles(): void {
    this.loadingRoles.set(true);
    this.rolesService.getSystemRoles().subscribe({
      next: (roles) => {
        this.availableRoles.set(roles);
        this.loadingRoles.set(false);
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        this.loadingRoles.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) return;

    this.submitting.set(true);

    if (this.data.mode === 'create') {
      const data: CreateCompanyUserRequest = this.form.value;
      this.dialogRef.close({ mode: 'create', data });
    } else {
      const data: UpdateCompanyUserRequest = this.form.value;
      this.dialogRef.close({ mode: 'edit', data });
    }
  }

  getMinLengthForDocType(): number {
    const type = this.form.get('documentType')?.value as DocumentType;
    const map: Record<DocumentType, number> = {
      DNI: 8,
      CARNET_EXTRANJERIA: 9,
      PASAPORTE: 6,
    };
    return map[type] || 8;
  }

  getMaxLengthForDocType(): number {
    const type = this.form.get('documentType')?.value as DocumentType;
    const map: Record<DocumentType, number> = {
      DNI: 8,
      CARNET_EXTRANJERIA: 12,
      PASAPORTE: 12,
    };
    return map[type] || 12;
  }

  hasEmailChanged(): boolean {
    if (this.data.mode !== 'edit' || !this.data.user) return false;
    const currentEmail = this.form.get('email')?.value;
    return currentEmail !== this.data.user.email;
  }
}
