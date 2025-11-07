import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  ErrorDialogComponent,
  type ErrorDialogData,
} from '@shared/components/error-dialog/error-dialog.component';
import { Observable } from 'rxjs';

/**
 * Servicio para mostrar diálogos de error
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorDialogService {
  private dialog = inject(MatDialog);

  /**
   * Muestra un diálogo de error
   * @returns Observable<boolean> - true si el usuario hizo clic en "Reintentar", false si cerró
   */
  show(data: ErrorDialogData): Observable<boolean> {
    const dialogRef = this.dialog.open(ErrorDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      data,
      disableClose: false,
    });

    return dialogRef.afterClosed();
  }

  /**
   * Muestra un error genérico
   */
  showGenericError(message?: string): Observable<boolean> {
    return this.show({
      title: 'Error',
      message: message || 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
      action: 'close',
    });
  }

  /**
   * Muestra un error de red/conexión
   */
  showNetworkError(): Observable<boolean> {
    return this.show({
      title: 'Error de Conexión',
      message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
      action: 'retry',
    });
  }

  /**
   * Muestra un error de autenticación
   */
  showAuthError(): Observable<boolean> {
    return this.show({
      title: 'Sesión Expirada',
      message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      action: 'close',
    });
  }
}
