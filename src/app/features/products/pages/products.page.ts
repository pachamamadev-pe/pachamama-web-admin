import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ProductsService } from '../services/products.service';
import { Product, ProductStatus, CreateProductDto, UpdateProductDto } from '../models';
import {
  ProductFormDialogComponent,
  type ProductFormDialogData,
} from '../components/product-form-dialog.component';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * Página principal de gestión de productos
 * Diseño: Grid de cards (mobile-first) inspirado en Figma
 */
@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <!-- Header -->
      <header class="page-header">
        <div class="header-content">
          <div class="header-title">
            <h1 class="text-title font-bold text-accent-titles">Productos</h1>
            <p class="text-subtitle text-neutral-subheading">
              Gestiona los productos de recolección
            </p>
          </div>

          <div class="header-actions">
            <button mat-raised-button class="btn-primary" (click)="openCreateDialog()">
              <mat-icon>add</mat-icon>
              <span class="hidden sm:inline">Añadir producto</span>
              <span class="sm:hidden">Añadir</span>
            </button>

            <!-- View toggle (desktop only) -->
            <button
              mat-icon-button
              [matMenuTriggerFor]="viewMenu"
              class="hidden md:flex"
              matTooltip="Cambiar vista"
            >
              <mat-icon>{{ viewMode() === 'grid' ? 'grid_view' : 'view_list' }}</mat-icon>
            </button>

            <mat-menu #viewMenu="matMenu">
              <button mat-menu-item (click)="viewMode.set('grid')">
                <mat-icon>grid_view</mat-icon>
                <span>Vista en cards</span>
              </button>
              <button mat-menu-item (click)="viewMode.set('list')">
                <mat-icon>view_list</mat-icon>
                <span>Vista en lista</span>
              </button>
            </mat-menu>

            <!-- More options menu -->
            <button mat-icon-button [matMenuTriggerFor]="moreMenu" matTooltip="Más opciones">
              <mat-icon>more_vert</mat-icon>
            </button>

            <mat-menu #moreMenu="matMenu">
              <button mat-menu-item (click)="refreshProducts()">
                <mat-icon>refresh</mat-icon>
                <span>Actualizar</span>
              </button>
            </mat-menu>
          </div>
        </div>

        <!-- Search bar -->
        <div class="search-container">
          <mat-form-field class="search-field" appearance="outline">
            <mat-icon matPrefix class="text-neutral-subheading">search</mat-icon>
            <input
              matInput
              [(ngModel)]="searchTerm"
              placeholder="Buscar productos..."
              class="text-body"
            />
            @if (searchTerm()) {
              <button
                matSuffix
                mat-icon-button
                (click)="clearSearch()"
                matTooltip="Limpiar búsqueda"
              >
                <mat-icon>close</mat-icon>
              </button>
            }
          </mat-form-field>
        </div>
      </header>

      <!-- Content -->
      <div class="page-content">
        @if (loading()) {
          <!-- Loading state -->
          <div class="loading-container">
            <mat-spinner diameter="48" />
            <p class="text-body text-neutral-subheading mt-4">Cargando productos...</p>
          </div>
        } @else if (error()) {
          <!-- Error state -->
          <div class="error-container">
            <mat-icon class="error-icon">error_outline</mat-icon>
            <h3 class="text-body font-bold text-accent-titles">Error al cargar productos</h3>
            <p class="text-subtitle text-neutral-subheading">{{ error() }}</p>
            <button mat-raised-button class="btn-secondary mt-4" (click)="loadProducts()">
              <mat-icon>refresh</mat-icon>
              Reintentar
            </button>
          </div>
        } @else if (filteredProducts().length === 0) {
          <!-- Empty state -->
          <div class="empty-state">
            <div class="empty-icon">
              <mat-icon>inventory_2</mat-icon>
            </div>
            @if (searchTerm()) {
              <h3 class="text-body font-bold text-accent-titles">No se encontraron productos</h3>
              <p class="text-subtitle text-neutral-subheading">
                Intenta con otros términos de búsqueda
              </p>
              <button mat-stroked-button class="mt-4" (click)="clearSearch()">
                Limpiar búsqueda
              </button>
            } @else {
              <h3 class="text-body font-bold text-accent-titles">No hay productos registrados</h3>
              <p class="text-subtitle text-neutral-subheading mb-4">
                Comienza agregando tu primer producto de recolección
              </p>
              <button mat-raised-button class="btn-primary" (click)="openCreateDialog()">
                <mat-icon>add</mat-icon>
                Añadir primer producto
              </button>
            }
          </div>
        } @else {
          <!-- Products grid (mobile-first design from Figma) -->
          <div class="products-grid">
            @for (product of filteredProducts(); track product.id) {
              <div
                class="product-card"
                role="button"
                tabindex="0"
                (click)="openEditDialog(product)"
                (keydown.enter)="openEditDialog(product)"
                (keydown.space)="openEditDialog(product); $event.preventDefault()"
              >
                <!-- Product illustration (like Figma design) -->
                <div class="product-illustration">
                  <mat-icon class="product-icon">eco</mat-icon>
                </div>

                <!-- Product info -->
                <div class="product-info">
                  <span class="product-label text-subtitle text-secondary">Producto</span>
                  <h3 class="product-name text-body font-bold text-accent-titles">
                    {{ product.name }}
                  </h3>
                  @if (product.description) {
                    <p class="product-description text-subtitle text-neutral-subheading">
                      {{ product.description }}
                    </p>
                  }

                  <!-- Status badge -->
                  <div class="product-status mt-2">
                    <span
                      class="status-badge text-subtitle rounded px-2 py-1"
                      [class]="getStatusClass(product.status)"
                    >
                      {{ getStatusLabel(product.status) }}
                    </span>
                  </div>
                </div>

                <!-- Card actions (hover) -->
                <div class="card-actions">
                  <button
                    mat-icon-button
                    [matMenuTriggerFor]="cardMenu"
                    (click)="$event.stopPropagation()"
                    matTooltip="Opciones"
                  >
                    <mat-icon>more_vert</mat-icon>
                  </button>

                  <mat-menu #cardMenu="matMenu">
                    <button mat-menu-item (click)="openEditDialog(product)">
                      <mat-icon>edit</mat-icon>
                      <span>Editar</span>
                    </button>
                    <button mat-menu-item (click)="toggleStatus(product)">
                      <mat-icon>
                        {{ product.status === 'ACTIVE' ? 'block' : 'check_circle' }}
                      </mat-icon>
                      <span>
                        {{ product.status === 'ACTIVE' ? 'Desactivar' : 'Activar' }}
                      </span>
                    </button>
                    <button mat-menu-item class="text-red-600" (click)="confirmDelete(product)">
                      <mat-icon class="text-red-600">delete</mat-icon>
                      <span>Eliminar</span>
                    </button>
                  </mat-menu>
                </div>
              </div>
            }
          </div>

          <!-- Results info -->
          <div class="results-info text-subtitle text-neutral-subheading mt-4">
            Mostrando {{ filteredProducts().length }} de {{ totalElements() }} productos
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .page-container {
        @apply h-full flex flex-col;
      }

      .page-header {
        @apply bg-primary-white border-b border-neutral-border p-4 md:p-6;
      }

      .header-content {
        @apply flex items-start justify-between gap-4 mb-4;
      }

      .header-title {
        @apply flex-1;
      }

      .header-actions {
        @apply flex items-center gap-2;
      }

      .search-container {
        @apply mt-4;
      }

      .search-field {
        @apply w-full;
      }

      .page-content {
        @apply flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50;
      }

      /* Loading & Error States */
      .loading-container,
      .error-container,
      .empty-state {
        @apply flex flex-col items-center justify-center min-h-[400px] text-center;
      }

      .error-icon {
        @apply text-red-500 w-16 h-16 mb-4;
        font-size: 64px;
      }

      .empty-icon {
        @apply w-24 h-24 rounded-full bg-secondary-light flex items-center justify-center mb-4;

        mat-icon {
          @apply text-secondary;
          font-size: 48px;
          width: 48px;
          height: 48px;
        }
      }

      /* Grid View (Figma-inspired) */
      .products-grid {
        @apply grid gap-4;
        @apply grid-cols-1;
        @apply sm:grid-cols-2;
        @apply lg:grid-cols-3;
        @apply xl:grid-cols-4;
      }

      .product-card {
        @apply bg-primary-white rounded-lg shadow-sm border border-neutral-border;
        @apply p-6 cursor-pointer transition-all duration-200;
        @apply hover:shadow-md hover:border-secondary relative;
      }

      .product-illustration {
        @apply w-full h-32 bg-secondary-light rounded-lg;
        @apply flex items-center justify-center mb-4;
      }

      .product-icon {
        @apply text-secondary;
        font-size: 64px;
        width: 64px;
        height: 64px;
      }

      .product-info {
        @apply space-y-2;
      }

      .product-label {
        @apply block;
      }

      .product-name {
        @apply line-clamp-2;
      }

      .product-description {
        @apply line-clamp-2;
      }

      .card-actions {
        @apply absolute top-2 right-2 opacity-0 transition-opacity;
      }

      .product-card:hover .card-actions {
        @apply opacity-100;
      }

      .results-info {
        @apply text-center;
      }
    `,
  ],
})
export class ProductsPage implements OnInit {
  private productsService = inject(ProductsService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  // State
  products = signal<Product[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  searchTerm = signal('');
  viewMode = signal<'grid' | 'list'>('grid');
  totalElements = signal(0);

  // Computed
  filteredProducts = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    if (!search) return this.products();

    return this.products().filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        (p.description && p.description.toLowerCase().includes(search)),
    );
  });

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.productsService.getProducts({ page: 0, size: 100 }).subscribe({
      next: (response) => {
        this.products.set(response.items);
        this.totalElements.set(response.total);
        this.loading.set(false);
        this.error.set(null);
      },
      error: () => {
        // El interceptor ya mostró la notificación de error
        // Aquí solo actualizamos el estado visual
        this.error.set('No se pudieron cargar los productos');
        this.loading.set(false);
        this.products.set([]);
      },
    });
  }

  refreshProducts(): void {
    this.loadProducts();
    this.notification.info('Productos actualizados');
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open<
      ProductFormDialogComponent,
      ProductFormDialogData,
      CreateProductDto
    >(ProductFormDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: { mode: 'create' },
    });

    dialogRef.afterClosed().subscribe((dto) => {
      if (dto) {
        this.createProduct(dto);
      }
    });
  }

  openEditDialog(product: Product): void {
    const dialogRef = this.dialog.open<
      ProductFormDialogComponent,
      ProductFormDialogData,
      UpdateProductDto
    >(ProductFormDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: { mode: 'edit', product },
    });

    dialogRef.afterClosed().subscribe((dto) => {
      if (dto) {
        this.updateProduct(product.id, dto);
      }
    });
  }

  toggleStatus(product: Product): void {
    this.productsService.toggleProductStatus(product).subscribe({
      next: () => {
        this.loadProducts();
        const action = product.status === ProductStatus.ACTIVE ? 'desactivado' : 'activado';
        this.notification.success(`Producto ${action}`);
      },
      error: () => {
        // Error ya manejado por el interceptor
        this.loadProducts(); // Recargar para mostrar estado actual
      },
    });
  }

  confirmDelete(product: Product): void {
    if (confirm(`¿Está seguro de eliminar el producto "${product.name}"?`)) {
      this.deleteProduct(product);
    }
  }

  private deleteProduct(product: Product): void {
    this.productsService.deleteProduct(product.id).subscribe({
      next: () => {
        this.loadProducts();
        this.notification.success('Producto eliminado');
      },
      error: () => {
        // Error ya manejado por el interceptor
      },
    });
  }

  private createProduct(dto: CreateProductDto): void {
    this.productsService.createProduct(dto).subscribe({
      next: () => {
        this.loadProducts();
        this.notification.success('Producto creado exitosamente');
      },
      error: () => {
        // Error ya manejado por el interceptor
      },
    });
  }

  private updateProduct(id: string, dto: UpdateProductDto): void {
    this.productsService.updateProduct(id, dto).subscribe({
      next: () => {
        this.loadProducts();
        this.notification.success('Producto actualizado exitosamente');
      },
      error: () => {
        // Error ya manejado por el interceptor
      },
    });
  }

  getStatusLabel(status: ProductStatus): string {
    return status === ProductStatus.ACTIVE ? 'Activo' : 'Inactivo';
  }

  getStatusClass(status: ProductStatus): string {
    return status === ProductStatus.ACTIVE
      ? 'bg-secondary-light text-secondary'
      : 'bg-gray-100 text-neutral-subheading';
  }
}
