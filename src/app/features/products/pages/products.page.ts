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
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ProductsService } from '../services/products.service';
import { Product, ProductStatus, ProductUnit, CreateProductDto, UpdateProductDto } from '../models';
import {
  ProductFormDialogComponent,
  type ProductFormDialogData,
  type ProductFormDialogResult,
} from '../components/product-form-dialog.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '@core/services/notification.service';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { ReportsService } from '../../projects/services/reports.service';
import { PmHasPermissionDirective } from '@core/directives/pm-has-permission.directive';
import { SidebarService } from '@core/services/sidebar.service';
import { PERMISSIONS } from '@core/auth/permissions';

/**
 * Página principal de gestión de productos
 * Diseño: Grid de cards (mobile-first) inspirado en Figma
 * Incluye 2 vistas: Grid (cards) y List (tabla responsive)
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
    MatDividerModule,
    PmHasPermissionDirective,
  ],
  templateUrl: './products.page.html',
  styleUrl: './products.page.scss',
})
export class ProductsPage implements OnInit {
  private productsService = inject(ProductsService);
  private azureStorage = inject(AzureStorageService);
  private reportsService = inject(ReportsService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private router = inject(Router);

  readonly sidebarService = inject(SidebarService);
  protected readonly PERMISSIONS = PERMISSIONS;

  // State
  products = signal<Product[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  searchTerm = signal('');
  viewMode = signal<'grid' | 'list'>('grid');
  totalElements = signal(0);
  downloadingReport = signal(false);

  // Cache de URLs de imágenes con SAS token (path -> url)
  private imageUrlCache = signal<Map<string, string>>(new Map());

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

  /**
   * Navega a la página de detalle del producto
   */
  viewProductDetail(product: Product): void {
    this.router.navigate(['/products', product.id]);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open<
      ProductFormDialogComponent,
      ProductFormDialogData,
      ProductFormDialogResult
    >(ProductFormDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: { mode: 'create' },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.dto) {
        this.createProduct(result.dto as CreateProductDto);
      }
    });
  }

  openEditDialog(product: Product): void {
    if (product.icon) {
      const cache = this.imageUrlCache();
      // Caso 1: Ya está en caché → abrir dialog inmediatamente
      if (cache.has(product.icon)) {
        this.openEditDialogWithImage(product, cache.get(product.icon)!);
        return;
      }

      // Caso 2: No está en caché → solicitar SAS token primero
      this.azureStorage.getFileUrl(product.icon, 5).subscribe({
        next: (url) => {
          // Actualizar caché
          this.imageUrlCache.update((currentCache) => {
            const newCache = new Map(currentCache);
            newCache.set(product.icon!, url);
            return newCache;
          });
          // Abrir dialog con la imagen
          this.openEditDialogWithImage(product, url);
        },
        error: () => {
          // Si falla, abrir dialog sin imagen
          this.openEditDialogWithImage(product, null);
        },
      });
    } else {
      // Sin imagen → abrir dialog directamente
      this.openEditDialogWithImage(product, null);
    }
  }

  /**
   * Método auxiliar para abrir el dialog de edición con o sin imagen
   */
  private openEditDialogWithImage(product: Product, currentImageUrl: string | null): void {
    console.log('Opening edit dialog with image URL:', currentImageUrl);
    const dialogRef = this.dialog.open<
      ProductFormDialogComponent,
      ProductFormDialogData,
      ProductFormDialogResult
    >(ProductFormDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: {
        mode: 'edit',
        product,
        currentImageUrl, // URL con SAS token (o null)
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.dto) {
        // Si hay imágenes a eliminar, hacerlo primero
        if (result.imagesToDelete && result.imagesToDelete.length > 0) {
          this.azureStorage.deleteFiles(result.imagesToDelete).subscribe({
            next: () => {
              console.log('Old images deleted:', result.imagesToDelete);
              // Después de eliminar, actualizar el producto
              this.updateProduct(product.id, result.dto as UpdateProductDto);
            },
            error: (error) => {
              console.error('Error deleting old images:', error);
              // Aun si falla la eliminación, actualizar el producto
              this.updateProduct(product.id, result.dto as UpdateProductDto);
            },
          });
        } else {
          // No hay imágenes a eliminar, solo actualizar
          this.updateProduct(product.id, result.dto as UpdateProductDto);
        }
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
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Eliminar producto?',
        message: `Esta acción eliminará permanentemente el producto "${product.name}".`,
        confirmText: 'Eliminar',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deleteProduct(product);
      }
    });
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
      next: (updatedProduct) => {
        // Si la imagen cambió, actualizar el caché
        if (updatedProduct.icon) {
          // Eliminar la entrada vieja del caché para forzar refresh
          this.imageUrlCache.update((cache) => {
            const newCache = new Map(cache);
            newCache.delete(updatedProduct.icon!);
            return newCache;
          });
        }

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

  getUnitLabel(unit: ProductUnit): string {
    const labels: Record<ProductUnit, string> = {
      kg: 'Kilogramo (kg)',
      ton: 'Tonelada (ton)',
      units: 'Unidades',
      liters: 'Litros (L)',
      bunches: 'Racimos',
    };
    return labels[unit];
  }

  /**
   * Obtiene la URL de la imagen del producto con SAS token
   * Usa caché para evitar solicitudes repetidas al Azure Function
   *
   * @param iconPath - Path relativo del archivo (ej: products/1762741023058.jpg)
   * @returns URL con SAS token o null si no hay path
   */
  getProductImageUrl(iconPath: string | null): string | null {
    if (!iconPath) {
      return null;
    }

    // Verificar si ya está en caché
    const cache = this.imageUrlCache();
    if (cache.has(iconPath)) {
      return cache.get(iconPath)!;
    }

    // Solicitar URL con SAS token al servicio
    // El servicio maneja su propio caché interno
    this.azureStorage.getFileUrl(iconPath, 5).subscribe({
      next: (url) => {
        // Actualizar caché de forma inmutable
        this.imageUrlCache.update((currentCache) => {
          const newCache = new Map(currentCache);
          newCache.set(iconPath, url);
          return newCache;
        });
      },
      error: (error) => {
        console.error('Error al obtener URL con SAS token:', error);
      },
    });

    // Retornar null mientras se carga (se mostrará el icono placeholder)
    return null;
  }

  /**
   * Descarga el reporte de productos en el formato especificado
   * @param format Formato del reporte: 'pdf' o 'xlsx'
   */
  downloadReport(format: 'pdf' | 'xlsx'): void {
    if (this.downloadingReport()) return;

    this.downloadingReport.set(true);
    const searchQuery = this.searchTerm().trim() || undefined;
    const formatLabel = format === 'pdf' ? 'PDF' : 'Excel';

    this.notification.info(`Generando reporte ${formatLabel}...`);

    this.reportsService.generateProductsReport(format, searchQuery).subscribe({
      next: (blob) => {
        // Crear URL del blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Nombre del archivo con fecha actual
        const date = new Date().toISOString().split('T')[0];
        const extension = format === 'pdf' ? 'pdf' : 'xlsx';
        link.download = `reporte-productos-${date}.${extension}`;

        // Descargar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Limpiar
        window.URL.revokeObjectURL(url);

        this.notification.success(`Reporte ${formatLabel} descargado correctamente`);
        this.downloadingReport.set(false);
      },
      error: (error) => {
        console.error('Error downloading report:', error);
        this.notification.error(`Error al descargar el reporte ${formatLabel}`);
        this.downloadingReport.set(false);
      },
    });
  }
}
