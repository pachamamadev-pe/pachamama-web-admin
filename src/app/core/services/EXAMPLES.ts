/**
 * EJEMPLOS DE USO DEL SISTEMA DE NOTIFICACIONES Y ERRORES
 *
 * Este archivo contiene ejemplos de cómo usar:
 * - NotificationService (toast notifications)
 * - ErrorDialogService (diálogos modales para errores críticos)
 * - HTTP Error Interceptor (manejo automático de errores)
 */

import { Component, inject } from '@angular/core';
import { NotificationService } from '@core/services/notification.service';
import { ErrorDialogService } from '@core/services/error-dialog.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-example',
  template: ``,
})
export class ExampleComponent {
  private notification = inject(NotificationService);
  private errorDialog = inject(ErrorDialogService);
  private http = inject(HttpClient);

  // ============================================
  // 1. NOTIFICACIONES TOAST (NotificationService)
  // ============================================

  showSuccessNotification(): void {
    // Verde - Para acciones exitosas
    this.notification.success('Producto creado exitosamente');
  }

  showErrorNotification(): void {
    // Rojo - Para errores
    this.notification.error('No se pudo guardar el producto');
  }

  showWarningNotification(): void {
    // Naranja - Para advertencias
    this.notification.warning('El stock está por debajo del mínimo');
  }

  showInfoNotification(): void {
    // Azul - Para información general
    this.notification.info('Datos actualizados');
  }

  showCustomNotification(): void {
    // Personalizada con configuración
    this.notification.show('Mensaje personalizado', 'OK', {
      duration: 10000, // 10 segundos
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  dismissAllNotifications(): void {
    // Cerrar todas las notificaciones activas
    this.notification.dismiss();
  }

  // ============================================
  // 2. DIÁLOGOS DE ERROR (ErrorDialogService)
  // ============================================

  showErrorDialog(): void {
    // Diálogo simple de error
    this.errorDialog.show({
      title: 'Error al Procesar',
      message: 'No se pudo completar la operación. Verifica los datos e intenta nuevamente.',
      action: 'close',
    });
  }

  showErrorDialogWithRetry(): void {
    // Diálogo con opción de reintentar
    this.errorDialog
      .show({
        title: 'Error de Conexión',
        message: 'No se pudo conectar con el servidor.',
        action: 'retry',
      })
      .subscribe((shouldRetry) => {
        if (shouldRetry) {
          console.log('Usuario hizo clic en Reintentar');
          // Aquí ejecutar la acción nuevamente
        }
      });
  }

  showErrorDialogWithDetails(): void {
    // Diálogo con detalles técnicos
    this.errorDialog.show({
      title: 'Error Crítico',
      message: 'Ocurrió un error inesperado al procesar tu solicitud.',
      details: 'TypeError: Cannot read property "items" of undefined\nat line 123',
      action: 'both', // Muestra botones "Reintentar" y "Cerrar"
    });
  }

  showGenericError(): void {
    // Diálogo genérico predefinido
    this.errorDialog.showGenericError();
  }

  showNetworkError(): void {
    // Diálogo de error de red predefinido
    this.errorDialog.showNetworkError().subscribe((shouldRetry) => {
      if (shouldRetry) {
        // Reintentar la operación
      }
    });
  }

  showAuthError(): void {
    // Diálogo de sesión expirada predefinido
    this.errorDialog.showAuthError();
  }

  // ============================================
  // 3. HTTP ERROR INTERCEPTOR (Automático)
  // ============================================

  /**
   * El interceptor captura AUTOMÁTICAMENTE todos los errores HTTP
   * y muestra una notificación apropiada según el código de error:
   *
   * - 0: Error de conexión
   * - 400: Solicitud inválida
   * - 401: Sesión expirada (no muestra notificación, se maneja por separado)
   * - 403: Sin permisos
   * - 404: Recurso no encontrado
   * - 409: Conflicto (ej: recurso duplicado)
   * - 422: Error de validación
   * - 500: Error del servidor
   * - 503: Servicio no disponible
   */

  exampleWithAutomaticErrorHandling(): void {
    // El error se maneja AUTOMÁTICAMENTE por el interceptor
    this.http.get('/api/products').subscribe({
      next: (data) => {
        console.log('Success:', data);
        this.notification.success('Productos cargados');
      },
      error: () => {
        // El interceptor YA mostró la notificación de error
        // Aquí solo necesitas actualizar el estado local si es necesario
        console.log('Error handled by interceptor');
      },
    });
  }

  exampleWithCustomErrorHandling(): void {
    // Si quieres mostrar un error personalizado ADEMÁS del automático
    this.http.get('/api/products').subscribe({
      next: (data) => {
        console.log('Success:', data);
      },
      error: (err) => {
        // El interceptor ya mostró una notificación
        // Pero puedes agregar lógica adicional:

        if (err.status === 404) {
          // Mostrar diálogo para crear el recurso
          this.errorDialog
            .show({
              title: 'Productos no encontrados',
              message: '¿Deseas crear tu primer producto?',
              action: 'retry',
            })
            .subscribe((shouldCreate) => {
              if (shouldCreate) {
                // Abrir diálogo de creación
              }
            });
        }
      },
    });
  }

  // ============================================
  // 4. MEJORES PRÁCTICAS
  // ============================================

  /**
   * CUÁNDO USAR CADA UNO:
   *
   * NotificationService (Toast):
   * ✅ Acciones exitosas (crear, editar, eliminar)
   * ✅ Información general (datos actualizados)
   * ✅ Advertencias no críticas (stock bajo)
   * ✅ Errores NO críticos que el usuario puede ignorar
   *
   * ErrorDialogService (Modal):
   * ✅ Errores críticos que requieren atención
   * ✅ Cuando necesitas que el usuario tome una decisión (reintentar/cancelar)
   * ✅ Cuando necesitas mostrar detalles técnicos
   * ✅ Errores que bloquean el flujo de trabajo
   *
   * HTTP Error Interceptor:
   * ✅ Se usa AUTOMÁTICAMENTE para todos los errores HTTP
   * ✅ No necesitas hacer nada, ya funciona
   * ✅ Puedes agregar lógica adicional en el catch del subscribe si es necesario
   */

  bestPracticeExample(): void {
    // CRUD completo con manejo de errores apropiado

    // CREATE
    this.http.post('/api/products', { name: 'Producto' }).subscribe({
      next: () => {
        this.notification.success('Producto creado exitosamente'); // ✅ Toast
      },
      error: () => {
        // Interceptor ya mostró el error
      },
    });

    // READ
    this.http.get('/api/products').subscribe({
      next: (_data) => {
        // No mostrar notificación para GET exitoso (es esperado)
      },
      error: () => {
        // Interceptor ya mostró el error
        // Mostrar estado de error en UI si es necesario
      },
    });

    // UPDATE
    this.http.patch('/api/products/123', { name: 'Nuevo nombre' }).subscribe({
      next: () => {
        this.notification.success('Producto actualizado'); // ✅ Toast
      },
      error: () => {
        // Interceptor ya mostró el error
      },
    });

    // DELETE
    this.http.delete('/api/products/123').subscribe({
      next: () => {
        this.notification.success('Producto eliminado'); // ✅ Toast
      },
      error: (err) => {
        // Interceptor ya mostró el error
        // Pero para DELETE podríamos mostrar un diálogo adicional:
        if (err.status === 409) {
          this.errorDialog.show({
            title: 'No se puede eliminar',
            message: 'Este producto está siendo usado en proyectos activos.',
            action: 'close',
          });
        }
      },
    });
  }
}
