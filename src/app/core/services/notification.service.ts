import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

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

  /**
   * Maneja errores HTTP y muestra una notificación con un mensaje descriptivo
   * @param error HttpErrorResponse del backend
   * @param defaultMessage Mensaje por defecto si no se puede determinar el error
   * @param action Texto del botón de acción (por defecto 'Cerrar')
   */
  handleError(
    error: HttpErrorResponse | Error | unknown,
    defaultMessage: string,
    action = 'Cerrar',
  ): void {
    const message = this.getErrorMessage(error, defaultMessage);
    this.error(message, action);
  }

  /**
   * Obtiene un mensaje de error descriptivo basado en el error recibido
   * @param error Error a parsear (puede ser HttpErrorResponse, Error, o desconocido)
   * @param defaultMessage Mensaje por defecto si no se puede determinar el error
   * @returns Mensaje de error descriptivo para mostrar al usuario
   */
  private getErrorMessage(error: unknown, defaultMessage: string): string {
    // Si es un HttpErrorResponse
    console.log(error);
    if (error instanceof HttpErrorResponse) {
      // Si el backend envía un mensaje específico, usarlo
      if (error.error?.message) {
        return error.error.message;
      }

      // Mensajes personalizados según el código de estado HTTP
      switch (error.status) {
        case 400:
          return 'Los datos enviados no son válidos. Verifica la información ingresada.';
        case 401:
          return 'No tienes autorización para realizar esta operación. Verifica tu sesión.';
        case 403:
          return 'No tienes permisos suficientes para realizar esta acción.';
        case 404:
          return 'No se encontró el recurso solicitado. Por favor, recarga la página.';
        case 409:
          return 'Ya existe un registro con esos datos. Por favor, verifica la información.';
        case 422:
          return 'Los datos enviados no cumplen con las validaciones requeridas.';
        case 500:
          return 'Error interno del servidor. Por favor, intenta nuevamente más tarde.';
        case 503:
          return 'El servicio no está disponible temporalmente. Intenta más tarde.';
        case 0:
          return 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
        default:
          return `${defaultMessage} (Código: ${error.status})`;
      }
    }

    // Si es un Error estándar de JavaScript
    if (error instanceof Error) {
      return error.message || defaultMessage;
    }

    // Si es un objeto con mensaje
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message) || defaultMessage;
    }

    // Fallback al mensaje por defecto
    return defaultMessage;
  }
}
