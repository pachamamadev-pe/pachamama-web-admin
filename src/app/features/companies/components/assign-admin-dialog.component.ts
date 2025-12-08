import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialog,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { Company } from '../models/company.model';
import { UsersService } from '@shared/services/users.service';
import { CompanyUsersService } from '../../company-users/services/company-users.service';
import { CompanyUser } from '../../company-users/models/company-user.model';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import {
  CreateUserRequest,
  User,
  RoleScope,
  DocumentType,
  ParamRole,
} from '@shared/models/create-user.dto';

/**
 * Mapea un CompanyUser al formato User esperado por este componente.
 * Convierte los tipos de documento y maneja las diferencias de modelo.
 */
function mapCompanyUserToUser(companyUser: CompanyUser): User {
  // Mapeo de tipos de documento del sistema de company-users al sistema general
  const documentTypeMap: Record<string, DocumentType> = {
    DNI: DocumentType.DNI,
    CARNET_EXTRANJERIA: DocumentType.CE,
    PASAPORTE: DocumentType.CE, // Los pasaportes se mapean a CE en el sistema general
  };

  return {
    id: companyUser.id,
    tenantId: companyUser.tenantId,
    email: companyUser.email,
    documentType: documentTypeMap[companyUser.documentType] || DocumentType.DNI,
    documentNumber: companyUser.documentNumber,
    firstName: companyUser.firstName,
    lastName: companyUser.lastName,
    role: companyUser.role,
    authProviderUid: companyUser.authProviderUid,
  };
}

export interface AssignAdminDialogData {
  company: Company;
  maxAdmins?: number; // Parametrizable, default 4
}

@Component({
  selector: 'app-assign-admin-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSelectModule,
  ],
  template: `
    <div class="assign-admin-dialog">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-title font-bold text-accent-titles">Administradores de Empresa</h2>
          <p class="text-subtitle text-neutral-subheading mt-1">
            {{ data.company.businessName }}
          </p>
        </div>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Current Admins List -->
      @if (currentAdmins().length > 0) {
        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-body font-bold text-primary-black">
              Administradores actuales ({{ currentAdmins().length }}/{{ maxAdmins }})
            </h3>
            @if (currentAdmins().length >= maxAdmins) {
              <span class="text-subtitle text-red-600">Límite alcanzado</span>
            }
          </div>

          <div class="space-y-2">
            @for (admin of currentAdmins(); track admin.id) {
              <div
                class="flex items-center justify-between p-3 bg-secondary-light border border-secondary rounded-lg"
              >
                <div class="flex items-center gap-3 flex-1">
                  <div
                    class="bg-secondary text-primary-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0"
                  >
                    <mat-icon>person</mat-icon>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-body font-bold text-primary-black truncate">
                      {{ getUserDisplayName(admin) }}
                    </p>
                    <p class="text-subtitle text-neutral-subheading truncate">
                      {{ admin.email }}
                    </p>
                    @if (admin.documentType && admin.documentNumber) {
                      <p class="text-subtitle text-neutral-subheading">
                        {{ getDocumentTypeLabel(admin.documentType) }}: {{ admin.documentNumber }}
                      </p>
                    }
                  </div>
                </div>

                <button
                  mat-icon-button
                  color="warn"
                  (click)="removeAdmin(admin)"
                  [disabled]="removingAdminId() === admin.id"
                  matTooltip="Remover administrador"
                >
                  @if (removingAdminId() === admin.id) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <mat-icon>delete</mat-icon>
                  }
                </button>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 text-center">
          <mat-icon class="text-neutral-subheading text-5xl mb-2">group_off</mat-icon>
          <p class="text-body text-neutral-subheading">
            Esta empresa no tiene administradores asignados
          </p>
        </div>
      }

      <!-- Separator -->
      @if (currentAdmins().length < maxAdmins) {
        <div class="border-t border-gray-200 my-6"></div>

        <!-- Add New Admin Form -->
        <div>
          <h3 class="text-body font-bold text-primary-black mb-4">Crear nuevo administrador</h3>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <!-- Fila 1: Nombres y Apellidos -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <mat-form-field appearance="outline">
                <mat-label>Nombres</mat-label>
                <mat-icon matPrefix>person</mat-icon>
                <input matInput formControlName="firstName" placeholder="Ej: Juan Carlos" />
                @if (form.get('firstName')?.hasError('required')) {
                  <mat-error>Los nombres son obligatorios</mat-error>
                }
                @if (form.get('firstName')?.hasError('minlength')) {
                  <mat-error>Mínimo 2 caracteres</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Apellidos</mat-label>
                <mat-icon matPrefix>person</mat-icon>
                <input matInput formControlName="lastName" placeholder="Ej: Pérez García" />
                @if (form.get('lastName')?.hasError('required')) {
                  <mat-error>Los apellidos son obligatorios</mat-error>
                }
                @if (form.get('lastName')?.hasError('minlength')) {
                  <mat-error>Mínimo 2 caracteres</mat-error>
                }
              </mat-form-field>
            </div>

            <!-- Fila 2: Email (full width) -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Email</mat-label>
              <mat-icon matPrefix>email</mat-icon>
              <input
                matInput
                formControlName="email"
                type="email"
                placeholder="admin@empresa.com"
              />
              @if (form.get('email')?.hasError('required')) {
                <mat-error>El email es obligatorio</mat-error>
              }
              @if (form.get('email')?.hasError('email')) {
                <mat-error>Ingrese un email válido</mat-error>
              }
            </mat-form-field>

            <!-- Fila 3: Tipo Doc + Número Doc -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <mat-form-field appearance="outline">
                <mat-label>Tipo de documento</mat-label>
                <mat-icon matPrefix>badge</mat-icon>
                <mat-select formControlName="documentType">
                  <mat-option value="DNI">DNI</mat-option>
                  <mat-option value="CE">Carnet de Extranjería</mat-option>
                  <mat-option value="RUC">RUC</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="md:col-span-2">
                <mat-label>Número de documento</mat-label>
                <mat-icon matPrefix>tag</mat-icon>
                <input
                  matInput
                  formControlName="documentNumber"
                  [placeholder]="
                    form.get('documentType')?.value === 'DNI'
                      ? 'Ej: 12345678'
                      : form.get('documentType')?.value === 'CE'
                        ? 'Ej: ABC123456'
                        : 'Ej: 20123456789'
                  "
                />
                @if (form.get('documentNumber')?.hasError('required')) {
                  <mat-error>El número de documento es obligatorio</mat-error>
                }
                @if (form.get('documentNumber')?.hasError('pattern')) {
                  <mat-error>{{
                    getDocumentErrorMessage(form.get('documentType')?.value)
                  }}</mat-error>
                }
              </mat-form-field>
            </div>

            <!-- Info box -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-start gap-2">
                <mat-icon class="text-blue-600 flex-shrink-0">info</mat-icon>
                <p class="text-subtitle text-blue-600">
                  El mantenimiento del usuario creado se tendrá que realizar desde el módulo de
                  usuarios de la empresa.
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 pt-4">
              <button
                mat-stroked-button
                type="button"
                (click)="closeDialog()"
                class="btn-secondary"
              >
                {{ currentAdmins().length > 0 ? 'Cerrar' : 'Cancelar' }}
              </button>

              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="form.invalid || submitting()"
                class="btn-primary"
              >
                @if (submitting()) {
                  <mat-spinner diameter="20" class="inline-block mr-2"></mat-spinner>
                  <span>Creando...</span>
                } @else {
                  <span>Crear Administrador</span>
                }
              </button>
            </div>
          </form>
        </div>
      } @else {
        <!-- Max limit reached -->
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div class="flex items-start gap-2">
            <mat-icon class="text-orange-600">warning</mat-icon>
            <div class="text-subtitle text-orange-600">
              <p class="font-bold mb-1">Límite de administradores alcanzado</p>
              <p>
                Esta empresa ya tiene el máximo de {{ maxAdmins }} administradores permitidos. Debe
                remover un administrador antes de agregar uno nuevo.
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button mat-raised-button color="primary" (click)="closeDialog()" class="btn-primary">
            Cerrar
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .assign-admin-dialog {
        padding: 24px;
        min-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
      }
      .overflow-visible {
        overflow: visible !important;
      }
      @media (max-width: 640px) {
        .assign-admin-dialog {
          padding: 16px;
          min-width: auto;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignAdminDialogComponent {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private companyUsersService = inject(CompanyUsersService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);
  private dialogRef = inject(MatDialogRef<AssignAdminDialogComponent>);

  data = inject<AssignAdminDialogData>(MAT_DIALOG_DATA);

  submitting = signal(false);
  removingAdminId = signal<string | null>(null);
  currentAdmins = signal<User[]>([]);

  maxAdmins: number;
  form: FormGroup;

  // Validadores para cada tipo de documento
  private readonly DOC_VALIDATORS = {
    [DocumentType.DNI]: [Validators.required, Validators.pattern(/^\d{8}$/)],
    [DocumentType.CE]: [Validators.required, Validators.pattern(/^[A-Z0-9]{9,12}$/)],
    [DocumentType.RUC]: [Validators.required, Validators.pattern(/^\d{11}$/)],
  };

  constructor() {
    this.maxAdmins = this.data.maxAdmins ?? 4; // Default to 4, parametrizable

    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      documentType: [DocumentType.DNI, Validators.required],
      documentNumber: ['', this.DOC_VALIDATORS[DocumentType.DNI]],
    });

    // Validación dinámica del número de documento según el tipo
    this.form.get('documentType')?.valueChanges.subscribe((type: DocumentType) => {
      const docNumberControl = this.form.get('documentNumber');
      docNumberControl?.setValidators(this.DOC_VALIDATORS[type]);
      docNumberControl?.updateValueAndValidity();
    });

    // Cargar administradores actuales
    this.loadCurrentAdmins();
  }

  private loadCurrentAdmins(): void {
    this.companyUsersService.getUsers(this.data.company.id, 0, 100).subscribe({
      next: (response) => {
        // Mapear CompanyUser[] a User[] para compatibilidad con el componente
        const mappedUsers = response.items.map(mapCompanyUserToUser);
        this.currentAdmins.set(mappedUsers);
      },
      error: (error) => {
        this.notification.handleError(error, 'Error al cargar administradores');
      },
    });
  }

  removeAdmin(admin: User): void {
    const displayName = this.getUserDisplayName(admin);
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Eliminar administrador?',
        message: `¿Estás seguro de remover a ${displayName} como administrador de esta empresa?`,
        confirmText: 'Eliminar',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.notification.success('Falta que Jecri implemente la api de eliminar');
        /*
        this.notification.success('Administrador eliminado correctamente');

        TODO: Falta api de eliminar
        this.removingAdminId.set(admin.id);

        this.usersService.deleteUser(admin.id).subscribe({
          next: () => {
            this.loadCurrentAdmins();
            this.notification.success('Administrador eliminado correctamente');
            this.removingAdminId.set(null);
          },
          error: () => {
            this.notification.error('Error al eliminar administrador');
            this.removingAdminId.set(null);
          },
        });*/
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.currentAdmins().length >= this.maxAdmins) {
      return;
    }

    this.submitting.set(true);

    const request: CreateUserRequest = {
      scope: RoleScope.COMPANY,
      tenantId: this.data.company.id,
      email: this.form.value.email.trim(),
      documentType: this.form.value.documentType,
      documentNumber: this.form.value.documentNumber.trim(),
      role: ParamRole.ADMIN_EMPRESA,
      firstName: this.form.value.firstName.trim(),
      lastName: this.form.value.lastName.trim(),
    };

    this.usersService.createUser(request).subscribe({
      next: () => {
        this.loadCurrentAdmins();
        this.form.reset({ documentType: DocumentType.DNI }); // Reset con DNI por defecto
        this.notification.success('Administrador creado correctamente');
        this.submitting.set(false);
      },
      error: (error) => {
        this.notification.handleError(error, 'Error al crear el administrador');
        this.submitting.set(false);
      },
    });
  }

  closeDialog(): void {
    this.dialogRef.close(this.currentAdmins());
  }

  getUserDisplayName(user: User): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.lastName) {
      return user.lastName;
    }
    // Si no tiene nombre, mostrar el email sin el dominio
    return user.email.split('@')[0];
  }

  formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getDocumentTypeLabel(type: DocumentType | null): string {
    if (!type) return '';
    const labels: Record<DocumentType, string> = {
      [DocumentType.DNI]: 'DNI',
      [DocumentType.CE]: 'C.E.',
      [DocumentType.RUC]: 'RUC',
    };
    return labels[type] || type;
  }

  getDocumentErrorMessage(type: DocumentType): string {
    const messages: Record<DocumentType, string> = {
      [DocumentType.DNI]: 'El DNI debe tener 8 dígitos',
      [DocumentType.CE]:
        'El Carnet de Extranjería debe tener entre 9 y 12 caracteres alfanuméricos',
      [DocumentType.RUC]: 'El RUC debe tener 11 dígitos',
    };
    return messages[type] || 'Formato de documento inválido';
  }
}
