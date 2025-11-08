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

/**
 * Página de Login - Pachamama Platform
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

  // Estado
  isLoading = signal(false);
  showPassword = signal(false);
  loginError = signal<string | null>(null);

  // Formulario
  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false],
  });

  /**
   * Intenta iniciar sesión
   */
  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.loginError.set(null);

    try {
      // TODO: Implementar autenticación real con Azure AD B2C
      const { email, password } = this.loginForm.getRawValue();

      // Simulación temporal
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock: Validar credenciales
      if (email === 'admin@pachamama.pe' && password === 'Pachamama2025') {
        // Guardar token (mock)
        localStorage.setItem('auth_token', 'mock_token_' + Date.now());

        // Redirigir al dashboard
        this.router.navigate(['/projects']);
      } else {
        this.loginError.set('Credenciales inválidas. Por favor, intenta nuevamente.');
      }
    } catch (error) {
      this.loginError.set('Error al iniciar sesión. Verifica tu conexión e intenta nuevamente.');
      console.error('Login error:', error);
    } finally {
      this.isLoading.set(false);
    }
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
    // TODO: Implementar recuperación de contraseña
    console.log('Navigate to forgot password');
  }
}
