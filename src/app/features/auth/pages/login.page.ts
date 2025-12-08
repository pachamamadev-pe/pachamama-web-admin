import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';
import { NotificationService } from '@app/core/services';
import { User as FirebaseUser, sendEmailVerification } from '@angular/fire/auth';
import { UsersService } from '@app/shared/services/users.service';

/**
 * Página de Login - Pachamama Platform
 * Autenticación con Firebase Auth
 */
@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export default class LoginPage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);
  private notificationService = inject(NotificationService);
  private userService = inject(UsersService);

  // Estado
  isLoading = signal(false);
  showPassword = signal(false);
  loginError = signal<string | null>(null);
  passwordChangeSuccess = signal<string | null>(null);

  // Formulario
  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false],
  });

  /**
   * Intenta iniciar sesión con Firebase Auth
   */
  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.loginError.set(null);
    this.passwordChangeSuccess.set(null);

    const { email, password } = this.loginForm.getRawValue();

    this.authService.login({ email, password }).subscribe({
      next: (userCredential) => {
        const user: FirebaseUser = userCredential.user;

        // Verificar si el correo está validado PRIMERO
        if (!user.emailVerified) {
          sendEmailVerification(user)
            .then(() => {
              this.isLoading.set(false);
              this.notificationService.warning(
                'Tu correo no está verificado. Hemos enviado un enlace de verificación a tu correo electrónico.',
              );
              this.authService.logout();
            })
            .catch((error: unknown) => {
              console.error('Error al enviar el correo de verificación:', error);
              this.isLoading.set(false);
            });
          return;
        }

        // Si el correo está verificado, obtener el token y validar permisos
        user.getIdToken().then((token) => {
          console.log('Firebase Auth token:', token);
          this.sidebarService.fetchSidebarData(token, () => {
            // Validar que el usuario tenga acceso al sistema
            const menuItems = this.sidebarService.menuItems();

            if (!menuItems || menuItems.length === 0) {
              // Usuario sin permisos de acceso
              this.isLoading.set(false);
              this.loginError.set(
                'Tu rol no tiene acceso a ninguna funcionalidad del sistema. Por favor, contacta al administrador para que te asigne los permisos necesarios.',
              );
              this.authService.logout();
              return;
            }

            // Usuario con permisos y correo verificado, continuar con el flujo normal
            this.userService.verifyEmail().subscribe({
              next: () => {
                console.log('Verification email sent via UsersService');
                this.isLoading.set(false);
                this.router.navigate(['/home']);
              },
              error: (err: unknown) => {
                this.isLoading.set(false);
                console.error('Error sending verification email via UsersService:', err);
              },
            });
          });
        });
      },
      error: (error: Error) => {
        // Mostrar error de autenticación
        this.loginError.set(error.message);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword.update((show) => !show);
  }

  /**
   * Navega a la página de registro
   */
  goToSignUp(): void {
    // TODO: Implementar página de registro
    console.log('Navigate to sign up');
  }

  /**
   * Navega a recuperación de contraseña
   */
  goToForgotPassword(): void {
    const email = this.loginForm.get('email')?.value;

    if (!email) {
      this.loginError.set(
        'Por favor, ingresa tu correo electrónico para restablecer la contraseña.',
      );
      return;
    }

    this.isLoading.set(true);
    this.authService
      .sendPasswordResetEmail(email)
      .then(() => {
        this.isLoading.set(false);
        this.notificationService.success(
          'Se ha enviado un enlace para restablecer tu contraseña a tu correo electrónico.',
        );
        this.passwordChangeSuccess.set(
          'Se ha enviado un enlace para restablecer tu contraseña a tu correo electrónico.',
        );
      })
      .catch((error) => {
        this.isLoading.set(false);
        this.loginError.set('Error al enviar el correo de restablecimiento de contraseña.');
        console.error('Error:', error);
      });
  }
}
