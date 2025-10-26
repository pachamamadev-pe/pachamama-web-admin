import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-products-page',
  imports: [EmptyStateComponent, MatButtonModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-bold text-accent-titles">Mis Productos</h2>
          <p class="mt-1 text-sm text-neutral-subheading">Gestiona tu catálogo de productos</p>
        </div>
        @if (products().length > 0) {
          <button mat-raised-button color="primary" (click)="onCreate()">Crear Producto</button>
        }
      </div>

      <!-- Content -->
      @if (products().length === 0) {
        <app-empty-state
          icon="🌱"
          title="No tienes productos registrados"
          message="Comienza creando tu primer producto para gestionar tu catálogo"
          actionLabel="Crear mi primer producto"
          (action)="onCreate()"
        />
      } @else {
        <!-- TODO: Tabla de productos -->
        <div class="rounded-lg border border-neutral-border bg-primary-white p-6">
          <p class="text-neutral-subheading">Lista de productos ({{ products().length }})</p>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPage {
  products = signal<any[]>([]);

  onCreate(): void {
    console.log('Crear producto');
    // TODO: Abrir diálogo de crear producto
  }
}
