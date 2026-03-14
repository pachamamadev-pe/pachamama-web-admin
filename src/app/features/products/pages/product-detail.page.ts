import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ProductsService } from '../services/products.service';
import { Product } from '../models';
import { NotificationService } from '@core/services/notification.service';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { ProductRequirementsCardComponent } from '../components/product-requirements-card.component';
import { ProductConservationChartComponent } from '../components/product-conservation-chart.component';
import { ProductConceptsEditorDialogComponent } from '../components/product-concepts-editor-dialog.component';
import { ProductHtmlUpdateDto } from '../models/product-html-update.dto';
import { ProductTreeConceptsComponent } from '../components/product-tree-concepts.component';
import {
  ProductCollectionProtocolComponent,
  ProjectStage,
} from '../components/product-collection-protocol.component';
import {
  ProductProtocolFormSidePanelComponent,
  ProductProtocolFormSidePanelResult,
} from '../components/product-protocol-form-side-panel.component';
import { ProductProtocolsService } from '../services/product-protocols.service';
import { ProductProtocol, CreateProductProtocolDto, UpdateProductProtocolDto } from '../models';
import { ReorderProductProtocolsDto } from '../models/reorder-product-protocols.dto';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

//import { PmHasPermissionDirective } from '@core/directives/pm-has-permission.directive';
import { SidebarService } from '@core/services/sidebar.service';
import { PERMISSIONS } from '@core/auth/permissions';

/**
 * Página de detalle del producto
 * Muestra información completa del producto en 3 pestañas:
 * - Información: Datos del producto, requerimientos, conceptos, estadísticas
 * - Proyectos: Proyectos asociados (en construcción)
 * - Protocolo de recolección: Formularios dinámicos (en construcción)
 */
@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ProductRequirementsCardComponent,
    ProductTreeConceptsComponent,
    ProductConservationChartComponent,
    ProductProtocolFormSidePanelComponent,
    ProductCollectionProtocolComponent,
  ],
  templateUrl: './product-detail.page.html',
  styleUrl: './product-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productsService = inject(ProductsService);
  private azureStorage = inject(AzureStorageService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);
  private productProtocolsService = inject(ProductProtocolsService);

  readonly sidebarService = inject(SidebarService);
  protected readonly PERMISSIONS = PERMISSIONS;

  // ViewChild for side panel
  @ViewChild(ProductProtocolFormSidePanelComponent, { static: false })
  sidePanel!: ProductProtocolFormSidePanelComponent;

  // State
  product = signal<Product | null>(null);
  loading = signal(true);
  productImageUrl = signal<string | null>(null);
  protocols = signal<ProductProtocol[]>([]);
  loadingProtocols = signal(false);

  // Computed
  productName = computed(() => this.product()?.name ?? 'Cargando...');
  growthPercentage = computed(() => '+12.6%'); // Mock - será dinámico después

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');

    if (!productId) {
      this.notification.error('ID de producto no válido');
      this.router.navigate(['/products']);
      return;
    }

    this.loadProduct(productId);
  }

  loadProduct(id: string): void {
    this.loading.set(true);

    this.productsService.getProductById(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);

        // Cargar imagen si existe
        if (product.icon) {
          this.loadProductImage(product.icon);
        }

        // Cargar protocolos
        this.loadProtocols(product.id);
      },
      error: () => {
        this.loading.set(false);
        this.notification.error('Error al cargar el producto');
        this.router.navigate(['/products']);
      },
    });
  }

  loadProductImage(iconPath: string): void {
    this.azureStorage.getFileUrl(iconPath, 60).subscribe({
      next: (url) => this.productImageUrl.set(url),
      error: (error) => {
        console.error('Error cargando imagen del producto:', error);
        this.productImageUrl.set(null);
      },
    });
  }

  /**
   * Abre el editor de conceptos de árbol
   * Solo disponible para ADMIN_PACHAMAMA
   */
  openConceptsEditor(): void {
    const product = this.product();
    if (!product) return;

    const dialogRef = this.dialog.open(ProductConceptsEditorDialogComponent, {
      width: '100%',
      maxWidth: '900px',
      height: '700px',
      data: {
        productId: product.id,
        productName: product.name,
        currentHtml: product.descriptionHtml || '',
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.saved) {
        this.saveProductConcepts(product.id, result.html);
      }
    });
  }

  /**
   * Guarda los conceptos de árbol en HTML
   */
  private saveProductConcepts(productId: string, html: string): void {
    const dto: ProductHtmlUpdateDto = { descriptionHtml: html };

    this.productsService.updateHtmlDescription(productId, dto).subscribe({
      next: (updatedProduct) => {
        this.notification.success('Conceptos actualizados correctamente');
        // Actualizar el producto con la nueva información
        this.product.set(updatedProduct);
      },
      error: (error) => {
        console.error('Error actualizando conceptos:', error);
        this.notification.error('Error al actualizar los conceptos');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/products']);
  }

  /**
   * Carga los protocolos del producto
   */
  loadProtocols(productId: string): void {
    this.loadingProtocols.set(true);
    this.productProtocolsService.getProductProtocols(productId).subscribe({
      next: (protocols) => {
        this.protocols.set(protocols);
        this.loadingProtocols.set(false);
      },
      error: (error) => {
        console.error('Error loading protocols:', error);
        this.notification.error('Error al cargar protocolos');
        this.protocols.set([]);
        this.loadingProtocols.set(false);
      },
    });
  }

  /**
   * Abre el panel lateral para crear un nuevo protocolo
   */
  onCreateProtocol(): void {
    const product = this.product();
    if (!product) return;

    console.log('onCreateProtocol - sidePanel:', this.sidePanel);

    if (this.sidePanel) {
      this.sidePanel.open(
        {
          productId: product.id,
          productName: product.name,
          mode: 'create',
        },
        (result: ProductProtocolFormSidePanelResult | null) => {
          if (result && result.saved) {
            this.createProtocol(product.id, result.data as CreateProductProtocolDto);
          }
        },
      );
    } else {
      console.error('Side panel not available');
    }
  }

  /**
   * Abre el panel lateral para editar un protocolo
   */
  onEditProtocol(protocol: ProductProtocol): void {
    const product = this.product();
    if (!product) return;

    if (this.sidePanel) {
      this.sidePanel.open(
        {
          productId: product.id,
          productName: product.name,
          mode: 'edit',
          protocol: protocol,
        },
        (result: ProductProtocolFormSidePanelResult | null) => {
          if (result && result.saved) {
            this.updateProtocol(product.id, protocol.id, result.data as UpdateProductProtocolDto);
          }
        },
      );
    }
  }

  /**
   * Elimina un protocolo con confirmación
   */
  onDeleteProtocol(protocol: ProductProtocol): void {
    const product = this.product();
    if (!product) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Eliminar protocolo?',
        message: `Esta acción eliminará permanentemente el protocolo "${protocol.attribute.name}".`,
        confirmText: 'Eliminar',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deleteProtocol(product.id, protocol.id);
      }
    });
  }

  /**
   * Reordena los protocolos
   */
  onReorderProtocols(protocolIds: string[]): void {
    const product = this.product();
    if (!product) return;

    const dto: ReorderProductProtocolsDto = { protocolIds };
    this.productProtocolsService.reorderProductProtocols(product.id, dto).subscribe({
      next: (reorderedProtocols) => {
        this.protocols.set(reorderedProtocols);
        this.notification.success('Protocolos reordenados correctamente');
      },
      error: (error) => {
        console.error('Error reordering protocols:', error);
        this.notification.error('Error al reordenar protocolos');
        // Reload to restore original order
        this.loadProtocols(product.id);
      },
    });
  }

  /**
   * Crea un nuevo protocolo
   */
  private createProtocol(productId: string, dto: CreateProductProtocolDto): void {
    console.log('Creating protocol with DTO:', dto);
    this.productProtocolsService.createProductProtocol(productId, dto).subscribe({
      next: () => {
        this.notification.success('Protocolo creado correctamente');
        this.loadProtocols(productId);
      },
      error: (error) => {
        console.error('Error creating protocol:', error);
        const message =
          (error && error.error && (error.error.message as string | undefined)) ||
          (error && (error.message as string | undefined)) ||
          'Error al crear protocolo';
        this.notification.error(message);
      },
    });
  }

  /**
   * Actualiza un protocolo existente
   */
  private updateProtocol(
    productId: string,
    protocolId: string,
    dto: UpdateProductProtocolDto,
  ): void {
    this.productProtocolsService.updateProductProtocol(productId, protocolId, dto).subscribe({
      next: () => {
        this.notification.success('Protocolo actualizado correctamente');
        this.loadProtocols(productId);
      },
      error: (error) => {
        console.error('Error updating protocol:', error);
        this.notification.error('Error al actualizar protocolo');
      },
    });
  }

  /**
   * Elimina un protocolo
   */
  private deleteProtocol(productId: string, protocolId: string): void {
    this.productProtocolsService.deleteProductProtocol(productId, protocolId).subscribe({
      next: () => {
        this.notification.success('Protocolo eliminado correctamente');
        this.loadProtocols(productId);
      },
      error: (error) => {
        console.error('Error deleting protocol:', error);
        this.notification.error('Error al eliminar protocolo');
      },
    });
  }

  /**
   * Maneja la selección de un stage para crear formulario dinámico
   */
  onStageSelected(stage: ProjectStage): void {
    const product = this.product();
    if (!product) return;

    console.log('Stage selected:', stage);
    // TODO: Implementar navegación a creación de formulario dinámico
    this.notification.info(`Creación de formulario para stage "${stage}" - En desarrollo`);
  }
}
