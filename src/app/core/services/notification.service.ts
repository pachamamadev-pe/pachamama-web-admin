import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

/**
 * Servicio centralizado para mostrar notificaciones al usuario
 * Utiliza MatSnackBar para toast notifications
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  private readonly defaultConfig: MatSnackBarConfig = {
    horizontalPosition: 'end',
    verticalPosition: 'top',
    duration: 5000,
  };

  /**
   * Muestra una notificación de éxito
   */
  success(message: string, action = 'Cerrar'): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      duration: 4000,
      panelClass: ['snackbar-success'],
    });
  }

  /**
   * Muestra una notificación de error
   */
  error(message: string, action = 'Cerrar'): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      duration: 6000,
      panelClass: ['snackbar-error'],
    });
  }

  /**
   * Muestra una notificación de advertencia
   */
  warning(message: string, action = 'Cerrar'): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      duration: 5000,
      panelClass: ['snackbar-warning'],
    });
  }

  /**
   * Muestra una notificación informativa
   */
  info(message: string, action = 'Cerrar'): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      duration: 4000,
      panelClass: ['snackbar-info'],
    });
  }

  /**
   * Muestra una notificación personalizada
   */
  show(message: string, action = 'Cerrar', config?: MatSnackBarConfig): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      ...config,
    });
  }

  /**
   * Cierra todas las notificaciones activas
   */
  dismiss(): void {
    this.snackBar.dismiss();
  }
}
