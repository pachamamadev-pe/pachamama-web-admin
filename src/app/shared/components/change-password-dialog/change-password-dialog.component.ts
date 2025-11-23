import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  Auth,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from '@angular/fire/auth';
import { UsersService } from '@app/shared/services/users.service';
import { NotificationService } from '@app/core/services';
import { SidebarService } from '@app/core/services/sidebar.service';
import { AuthService } from '@app/core/auth/auth.service';

/**
 * Modal para cambio obligatorio de contraseña
 * No se puede cerrar hasta completar el cambio
 */
@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="change-password-dialog">
      <div class="dialog-header">
        <mat-icon class="security-icon">security</mat-icon>
        <h2 mat-dialog-title>Actualización de contraseña requerida</h2>
        <p class="dialog-description">
          Por medidas de seguridad, debes actualizar tu contraseña antes de continuar.
        </p>
      </div>

      <mat-dialog-content>
        <form
          [formGroup]="passwordForm"
          class="password-form"
          (ngSubmit)="onSubmit()"
          (keydown.enter)="$event.preventDefault(); onSubmit()"
        >
          <!-- Contraseña Actual -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Contraseña actual</mat-label>
            <input
              matInput
              [type]="showCurrentPassword() ? 'text' : 'password'"
              formControlName="currentPassword"
              placeholder="Ingresa tu contraseña actual"
            />
            <button
              mat-icon-button
              matSuffix
              type="button"
              (click)="toggleCurrentPasswordVisibility()"
              [attr.aria-label]="'Mostrar contraseña'"
            >
              <mat-icon>{{ showCurrentPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (
              passwordForm.get('currentPassword')?.hasError('required') &&
              passwordForm.get('currentPassword')?.touched
            ) {
              <mat-error>La contraseña actual es requerida</mat-error>
            }
          </mat-form-field>

          <!-- Nueva Contraseña -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nueva contraseña</mat-label>
            <input
              matInput
              [type]="showNewPassword() ? 'text' : 'password'"
              formControlName="newPassword"
              placeholder="Ingresa tu nueva contraseña"
            />
            <button
              mat-icon-button
              matSuffix
              type="button"
              (click)="toggleNewPasswordVisibility()"
              [attr.aria-label]="'Mostrar contraseña'"
            >
              <mat-icon>{{ showNewPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (
              passwordForm.get('newPassword')?.hasError('required') &&
              passwordForm.get('newPassword')?.touched
            ) {
              <mat-error>La contraseña es requerida</mat-error>
            }
            @if (passwordForm.get('newPassword')?.hasError('minlength')) {
              <mat-error>La contraseña debe tener al menos 8 caracteres</mat-error>
            }
          </mat-form-field>

          <!-- Confirmar Contraseña -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Confirmar contraseña</mat-label>
            <input
              matInput
              [type]="showConfirmPassword() ? 'text' : 'password'"
              formControlName="confirmPassword"
              placeholder="Confirma tu nueva contraseña"
            />
            <button
              mat-icon-button
              matSuffix
              type="button"
              (click)="toggleConfirmPasswordVisibility()"
              [attr.aria-label]="'Mostrar contraseña'"
            >
              <mat-icon>{{ showConfirmPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (
              passwordForm.get('confirmPassword')?.hasError('required') &&
              passwordForm.get('confirmPassword')?.touched
            ) {
              <mat-error>Debes confirmar la contraseña</mat-error>
            }
            @if (
              passwordForm.hasError('passwordsMismatch') &&
              passwordForm.get('confirmPassword')?.touched
            ) {
              <mat-error>Las contraseñas no coinciden</mat-error>
            }
          </mat-form-field>

          <!-- Password Requirements -->
          <div class="password-requirements">
            <p class="requirements-title">Requisitos de la nueva contraseña:</p>
            <ul class="requirements-list">
              <li [class.valid]="(passwordForm.get('newPassword')?.value?.length ?? 0) >= 8">
                <mat-icon>{{
                  (passwordForm.get('newPassword')?.value?.length ?? 0) >= 8
                    ? 'check_circle'
                    : 'radio_button_unchecked'
                }}</mat-icon>
                Mínimo 8 caracteres
              </li>
              <li [class.valid]="!passwordForm.hasError('passwordsSame')">
                <mat-icon>{{
                  !passwordForm.hasError('passwordsSame')
                    ? 'check_circle'
                    : 'radio_button_unchecked'
                }}</mat-icon>
                Debe ser diferente de la contraseña actual
              </li>
              <li
                [class.valid]="
                  !passwordForm.hasError('passwordsMismatch') &&
                  passwordForm.get('confirmPassword')?.value
                "
              >
                <mat-icon>{{
                  !passwordForm.hasError('passwordsMismatch') &&
                  passwordForm.get('confirmPassword')?.value
                    ? 'check_circle'
                    : 'radio_button_unchecked'
                }}</mat-icon>
                Las contraseñas nuevas deben coincidir
              </li>
            </ul>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button
          mat-stroked-button
          type="button"
          (click)="onLogout()"
          [disabled]="isLoading()"
          class="logout-button"
        >
          <mat-icon>logout</mat-icon>
          Cerrar sesión
        </button>
        <button
          mat-raised-button
          color="primary"
          type="submit"
          (click)="onSubmit()"
          [disabled]="passwordForm.invalid || isLoading()"
          class="submit-button"
        >
          @if (isLoading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            Actualizar contraseña
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styleUrl: './change-password-dialog.component.scss',
})
export class ChangePasswordDialogComponent {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private usersService = inject(UsersService);
  private notificationService = inject(NotificationService);
  private sidebarService = inject(SidebarService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent>);

  // Estado
  isLoading = signal(false);
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  // Formulario
  passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [this.passwordMatchValidator, this.passwordDifferentValidator] },
  );

  /**
   * Validador personalizado para verificar que las contraseñas coincidan
   */
  private passwordMatchValidator(group: import('@angular/forms').AbstractControl) {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordsMismatch: true };
  }

  /**
   * Validador personalizado para verificar que la contraseña nueva sea diferente de la actual
   */
  private passwordDifferentValidator(group: import('@angular/forms').AbstractControl) {
    const currentPassword = group.get('currentPassword')?.value;
    const newPassword = group.get('newPassword')?.value;
    return currentPassword && newPassword && currentPassword === newPassword
      ? { passwordsSame: true }
      : null;
  }

  /**
   * Alterna la visibilidad de la contraseña actual
   */
  toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword.update((show) => !show);
  }

  /**
   * Alterna la visibilidad de la nueva contraseña
   */
  toggleNewPasswordVisibility(): void {
    this.showNewPassword.update((show) => !show);
  }

  /**
   * Alterna la visibilidad de la confirmación de contraseña
   */
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((show) => !show);
  }

  /**
   * Cierra sesión y vuelve al login
   */
  async onLogout(): Promise<void> {
    try {
      await this.authService.logout();
      this.dialogRef.close(false);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      this.notificationService.error('Error al cerrar sesión');
    }
  }

  /**
   * Envía el formulario y actualiza la contraseña
   */
  async onSubmit(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    try {
      // 1. Verificar que hay usuario autenticado
      const currentUser = this.auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error('Usuario no autenticado');
      }

      // 2. Reautenticar con la contraseña actual
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // 3. Actualizar contraseña en Firebase Auth
      await updatePassword(currentUser, newPassword);

      // 4. Marcar contraseña como cambiada en BD
      await this.usersService.markPasswordChanged().toPromise();

      // 5. Actualizar el signal en SidebarService
      this.sidebarService.isPasswordChanged.set(true);

      // 6. Actualizar localStorage
      const localStorageKey = 'sidebarData';
      const data = localStorage.getItem(localStorageKey);
      if (data) {
        const parsedData = JSON.parse(data);
        parsedData.isPasswordChanged = true;
        localStorage.setItem(localStorageKey, JSON.stringify(parsedData));
      }

      // 7. Mostrar notificación de éxito
      this.notificationService.success('Contraseña actualizada correctamente');

      // 8. Cerrar el modal inmediatamente (el usuario ya vio el mensaje)
      this.isLoading.set(false);
      this.dialogRef.close(true);
    } catch (error: unknown) {
      // Manejar error de credenciales expiradas
      if (
        error instanceof Error &&
        (error.message.includes('auth/requires-recent-login') ||
          error.message.includes('CREDENTIAL_TOO_OLD_LOGIN_AGAIN'))
      ) {
        this.notificationService.error(
          'Tu sesión ha expirado. Por seguridad, debes iniciar sesión nuevamente.',
        );

        // Cerrar sesión y redirigir a login
        setTimeout(() => {
          this.authService.logout();
          this.dialogRef.close(false);
          this.router.navigate(['/login']);
        }, 2000);
      } else if (error instanceof Error && error.message.includes('auth/wrong-password')) {
        // Contraseña actual incorrecta
        this.notificationService.error('La contraseña actual es incorrecta');
        this.isLoading.set(false);
      } else {
        // Otro error
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Error al actualizar la contraseña. Por favor, intenta nuevamente.';
        this.notificationService.error(errorMessage);
        this.isLoading.set(false);
      }
    }
  }
}
