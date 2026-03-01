import {
  DestroyRef,
  Directive,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { SidebarService } from '@core/services/sidebar.service';

/**
 * Directiva estructural que muestra u oculta un elemento
 * según si el usuario posee el permiso requerido.
 *
 * @example
 * <button *appPmHasPermission="'project:register_documents'">Subir</button>
 *
 * Reacciona reactivamente a cambios en SidebarService.permissions (signal).
 */
@Directive({
  selector: '[appPmHasPermission]',
})
export class PmHasPermissionDirective {
  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);
  private sidebarService = inject(SidebarService);
  private destroyRef = inject(DestroyRef);

  /** Permiso requerido. null/undefined/'' => siempre visible. */
  appPmHasPermission = input<string | null | undefined>(null);

  private hasView = false;

  constructor() {
    const effectRef = effect(() => {
      // Accede a ambas señales: el input y permissions del servicio.
      // El effect se re-ejecuta cuando cualquiera de las dos cambia.
      const required = this.appPmHasPermission();
      const allowed = this.sidebarService.hasPermission(required);

      if (allowed && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!allowed && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });

    this.destroyRef.onDestroy(() => effectRef.destroy());
  }
}
