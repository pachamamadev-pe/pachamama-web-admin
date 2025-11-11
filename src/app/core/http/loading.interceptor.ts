import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

/**
 * Interceptor HTTP que muestra/oculta el spinner de carga automáticamente
 *
 * Para skipear el loading en un request específico, agregar el header:
 * ```typescript
 * this.http.get(url, {
 *   headers: { 'X-Skip-Loading': 'true' }
 * })
 * ```
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Verificar si el request debe skipear el loading
  const skipLoading = req.headers.has('X-Skip-Loading');

  // Remover el header custom antes de enviar (no es necesario enviarlo al backend)
  if (skipLoading) {
    req = req.clone({
      headers: req.headers.delete('X-Skip-Loading'),
    });
  }

  // Si debe skipear, pasar sin mostrar loading
  if (skipLoading) {
    return next(req);
  }

  // Mostrar loading
  loadingService.show();

  // Continuar con el request y ocultar loading al finalizar
  return next(req).pipe(
    finalize(() => {
      loadingService.hide();
    }),
  );
};
