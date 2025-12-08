import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { CompanyUser, getFullName } from '../models/company-user.model';
import { Role, getRoleBadgeColor } from '../models/role.model';
import { RolesService } from '../services/roles.service';

export interface AssignRoleDialogData {
  user: CompanyUser;
}

@Component({
  selector: 'app-assign-role-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="assign-role-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <div class="header-icon">
          <mat-icon>shield</mat-icon>
        </div>
        <div class="header-text">
          <h2 class="text-title font-bold text-accent-titles">Cambiar Rol de Usuario</h2>
          <p class="text-subtitle text-neutral-subheading mt-1">
            Asigna un nuevo rol a este usuario
          </p>
        </div>
        <button mat-icon-button mat-dialog-close class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- User Info Card -->
      <div class="user-info-card">
        <div class="user-avatar">
          {{ getUserInitials() }}
        </div>
        <div class="user-details">
          <p class="user-name">{{ getFullName(data.user) }}</p>
          <p class="user-email">{{ data.user.email }}</p>
        </div>
        <div
          class="current-role-badge"
          [style.background-color]="getRoleBadgeColor(data.user.role)"
        >
          {{ data.user.role }}
        </div>
      </div>

      <!-- Warning Box -->
      <div class="warning-box">
        <mat-icon class="warning-icon">warning</mat-icon>
        <div class="warning-content">
          <p class="warning-title">Cambio de permisos</p>
          <p class="warning-text">
            Este cambio afectará inmediatamente los permisos y el acceso del usuario en la
            plataforma.
          </p>
        </div>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-content">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Nuevo rol</mat-label>
          <mat-icon matPrefix>shield</mat-icon>
          <mat-select formControlName="roleCode">
            <mat-select-trigger>
              @if (form.value.roleCode) {
                @for (role of availableRoles(); track role.id) {
                  @if (role.code === form.value.roleCode) {
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-semibold text-sm">{{ role.name }}</span>
                      @if (role.code === data.user.role) {
                        <span class="text-xs bg-secondary-light text-secondary px-2 py-0.5 rounded">
                          Actual
                        </span>
                      }
                    </div>
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
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-semibold text-sm">{{ role.name }}</span>
                    @if (role.code === data.user.role) {
                      <span class="text-xs bg-secondary-light text-secondary px-2 py-0.5 rounded">
                        Actual
                      </span>
                    }
                  </div>
                  <span class="text-xs text-neutral-subheading">{{ role.description }}</span>
                </div>
              </mat-option>
            }
          </mat-select>
          @if (form.get('roleCode')?.hasError('required')) {
            <mat-error>Seleccione un rol</mat-error>
          }
          <mat-hint>Selecciona el nuevo rol para este usuario</mat-hint>
        </mat-form-field>

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
            [disabled]="!form.valid || submitting() || !hasRoleChanged()"
          >
            @if (submitting()) {
              <div class="flex items-center gap-2">
                <mat-spinner diameter="20"></mat-spinner>
                <span>Asignando...</span>
              </div>
            } @else {
              <div class="flex items-center gap-2">
                <mat-icon>check</mat-icon>
                <span>Asignar Rol</span>
              </div>
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .assign-role-dialog {
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

      .user-info-card {
        @apply bg-primary-white border border-neutral-border rounded-lg p-4 flex items-center gap-4 mb-6;
      }

      .user-avatar {
        @apply w-12 h-12 rounded-full bg-secondary text-primary-white flex items-center justify-center text-lg font-bold flex-shrink-0;
      }

      .user-details {
        @apply flex-1 min-w-0;
      }

      .user-name {
        @apply text-body font-bold text-accent-titles truncate;
      }

      .user-email {
        @apply text-subtitle text-neutral-subheading truncate;
      }

      .current-role-badge {
        @apply px-3 py-1 rounded-full text-xs font-semibold text-primary-white flex-shrink-0;
      }

      .warning-box {
        @apply bg-[#FEF3F2] border-l-4 border-[#F97316] p-4 rounded-r-lg flex items-start gap-3 mb-6;
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

      @media (max-width: 640px) {
        .assign-role-dialog {
          @apply p-4 min-w-0;
        }
        .dialog-header {
          @apply flex-col gap-2;
        }
        .user-info-card {
          @apply flex-col items-start;
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
export class AssignRoleDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private rolesService = inject(RolesService);
  private dialogRef = inject(MatDialogRef<AssignRoleDialogComponent>);
  data = inject<AssignRoleDialogData>(MAT_DIALOG_DATA);

  form!: FormGroup;
  submitting = signal(false);
  loadingRoles = signal(false);
  availableRoles = signal<Role[]>([]);

  ngOnInit(): void {
    this.form = this.fb.group({
      roleCode: [this.data.user.role, Validators.required],
    });

    this.loadRoles();
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
    if (this.form.invalid || this.submitting() || !this.hasRoleChanged()) return;

    this.submitting.set(true);
    const roleCode = this.form.value.roleCode;
    this.dialogRef.close({ roleCode });
  }

  getUserInitials(): string {
    const firstName = this.data.user.firstName || '';
    const lastName = this.data.user.lastName || '';

    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }

    if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    }

    return this.data.user.email.substring(0, 2).toUpperCase();
  }

  getFullName = getFullName;
  getRoleBadgeColor = getRoleBadgeColor;

  hasRoleChanged(): boolean {
    return this.form.value.roleCode !== this.data.user.role;
  }
}
