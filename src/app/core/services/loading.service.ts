import { Injectable, signal } from '@angular/core';

/**
 * Servicio para gestionar el estado de carga global de la aplicación
 * Usado por LoadingInterceptor y LoadingComponent
 */
@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  // Estado reactivo del loading (visible/oculto)
  private isLoadingSignal = signal(false);

  // Contador de requests activos (para manejar múltiples peticiones simultáneas)
  private activeRequests = signal(0);

  // Computed público para que los componentes puedan suscribirse
  readonly isLoading = this.isLoadingSignal.asReadonly();

  /**
   * Muestra el spinner de carga
   */
  show(): void {
    this.activeRequests.update((count) => count + 1);
    this.isLoadingSignal.set(true);
  }

  /**
   * Oculta el spinner de carga
   * Solo oculta cuando no hay más requests activos
   */
  hide(): void {
    this.activeRequests.update((count) => Math.max(0, count - 1));

    // Solo ocultar si no hay requests pendientes
    if (this.activeRequests() === 0) {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Fuerza el ocultamiento del spinner
   * Útil para casos de error donde queremos resetear el estado
   */
  forceHide(): void {
    this.activeRequests.set(0);
    this.isLoadingSignal.set(false);
  }
}
