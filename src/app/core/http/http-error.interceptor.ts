import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/**
 * Interceptor para manejo centralizado de errores HTTP
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Ocurrió un error inesperado';

      if (error.error instanceof ErrorEvent) {
        // Error del lado del cliente
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Error del lado del servidor
        switch (error.status) {
          case 0:
            errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
            break;
          case 400:
            errorMessage =
              error.error?.message || 'Solicitud inválida. Verifica los datos enviados.';
            break;
          case 401:
            errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
            // TODO: Redirigir al login
            break;
          case 403:
            errorMessage = 'No tienes permisos para realizar esta acción.';
            break;
          case 404:
            errorMessage = 'El recurso solicitado no fue encontrado.';
            break;
          case 409:
            errorMessage = error.error?.message || 'El recurso ya existe.';
            break;
          case 422:
            errorMessage = error.error?.message || 'Error de validación. Verifica los datos.';
            break;
          case 500:
            errorMessage = 'Error interno del servidor. Intenta nuevamente más tarde.';
            break;
          case 503:
            errorMessage = 'El servicio no está disponible. Intenta nuevamente más tarde.';
            break;
          default:
            errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
        }
      }

      // Mostrar notificación de error automáticamente
      // Solo para errores que no sean 401 (auth se maneja por separado)
      if (error.status !== 401) {
        notificationService.error(errorMessage);
      }

      // Log del error para debugging
      console.error('HTTP Error:', {
        status: error.status,
        statusText: error.statusText,
        message: errorMessage,
        url: error.url,
        error: error.error,
      });

      // Re-lanzar el error para que los componentes puedan manejarlo si es necesario
      return throwError(() => error);
    }),
  );
};
