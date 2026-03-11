import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from '@core/services/notification.service';
import { SidebarService } from '@core/services/sidebar.service';
import { ProductsService } from '../../products/services/products.service';
import { Product } from '../../products/models/product.model';
import { ProjectsService } from '../../projects/services/projects.service';
import { Project } from '../../projects/models/project.model';
import { ProductionLotsService } from '../../projects/services/production-lots.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import {
  ProductionLotRecord,
  StageFilter,
  TransformationStage,
  STAGE_SHORT_LABELS,
} from '../models/production-lot-search.model';
import {
  PRODUCTION_LOT_STATUS_LABELS,
  TRANSFORMATION_STAGE_LABELS,
} from '../../projects/models/production-lot.model';
import { LotTypeChooserDialogComponent } from '../components/lot-type-chooser-dialog.component';
import { TraceabilityQrDialogComponent } from '../components/traceability-qr-dialog.component';
import {
  PrimaryLotCreationWizardComponent,
  PrimaryLotWizardResult,
} from '../components/primary-lot-creation-wizard.component';
import {
  SecondaryLotCreationWizardComponent,
  SecondaryLotWizardResult,
} from '../components/secondary-lot-creation-wizard.component';

@Component({
  selector: 'app-production-lots-page',
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    EmptyStateComponent,
  ],
  templateUrl: './production-lots.page.html',
  styleUrl: './production-lots.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionLotsPage implements OnInit {
  private lotsService = inject(ProductionLotsService);
  private sidebarService = inject(SidebarService);
  private productsService = inject(ProductsService);
  private projectsService = inject(ProjectsService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  private readonly searchSubject = new Subject<string>();

  // ── Labels ──────────────────────────────────────────────────────
  readonly STATUS_LABELS = PRODUCTION_LOT_STATUS_LABELS;
  readonly STAGE_LABELS = TRANSFORMATION_STAGE_LABELS;
  readonly STAGE_SHORT_LABELS = STAGE_SHORT_LABELS;

  // ── State signals ────────────────────────────────────────────────
  loading = signal(true);
  lots = signal<ProductionLotRecord[]>([]);
  totalElements = signal(0);
  currentPage = signal(0);
  pageSize = signal(20);

  // ── Filter signals ───────────────────────────────────────────────
  searchTerm = signal('');
  activeStageFilter = signal<StageFilter>('all');
  selectedProductId = signal<string | null>(null);
  selectedProjectId = signal<string | null>(null);

  // ── Lookup data ───────────────────────────────────────────────────
  products = signal<Product[]>([]);
  loadingProducts = signal(false);
  projects = signal<Project[]>([]);
  loadingProjects = signal(false);

  // ── Computed ─────────────────────────────────────────────────────

  /** Lotes filtrados por etapa (client-side) */
  filteredLots = computed(() => {
    const filter = this.activeStageFilter();
    if (filter === 'all') return this.lots();
    return this.lots().filter((l) => l.transformationStage === filter);
  });

  /** Cantidad de lotes primarios en la página actual */
  primaryCount = computed(
    () => this.lots().filter((l) => l.transformationStage === 'primaria').length,
  );

  /** Cantidad de lotes secundarios en la página actual */
  secondaryCount = computed(
    () => this.lots().filter((l) => l.transformationStage === 'secundaria').length,
  );

  /** Lotes primarios del conjunto filtrado (para la sección Primaria) */
  primaryLots = computed(() =>
    this.filteredLots().filter((l) => l.transformationStage === 'primaria'),
  );

  /** Lotes secundarios del conjunto filtrado (para la sección Secundaria) */
  secondaryLots = computed(() =>
    this.filteredLots().filter((l) => l.transformationStage === 'secundaria'),
  );

  // ── Lifecycle ────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadProducts();
    this.loadProjects();
    this.loadLots();

    // Búsqueda con debounce → llama al backend
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentPage.set(0);
        this.loadLots();
      });
  }

  // ── Data loading ─────────────────────────────────────────────────

  loadLots(): void {
    const companyId = this.sidebarService.tenantId();
    if (!companyId) {
      this.notification.error('No se pudo identificar la empresa activa');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    this.lotsService
      .search({
        companyId,
        page: this.currentPage(),
        size: this.pageSize(),
        q: this.searchTerm() || undefined,
        productId: this.selectedProductId() ?? undefined,
        projectId: this.selectedProjectId() ?? undefined,
      })
      .subscribe({
        next: (response) => {
          this.lots.set(response.items ?? []);
          this.totalElements.set(response.total ?? 0);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading production lots:', error);
          const msg = error?.error?.message;
          this.notification.error(msg ?? 'Error al cargar los lotes de transformación');
          this.lots.set([]);
          this.totalElements.set(0);
          this.loading.set(false);
        },
      });
  }

  // ── Lookup loaders ───────────────────────────────────────────────

  private loadProducts(): void {
    this.loadingProducts.set(true);
    this.productsService.getProducts({ page: 0, size: 200 }).subscribe({
      next: (res) => {
        this.products.set(res.items ?? []);
        this.loadingProducts.set(false);
      },
      error: () => {
        this.products.set([]);
        this.loadingProducts.set(false);
      },
    });
  }

  /**
   * Carga proyectos.
   * Si hay un producto seleccionado, filtra por producto + empresa;
   * si no, trae todos los proyectos de la empresa.
   */
  loadProjects(productId?: string | null): void {
    const companyId = this.sidebarService.tenantId();
    if (!companyId) return;

    this.loadingProjects.set(true);

    const obs$ = productId
      ? this.projectsService.getProjectsByProductAndCompany(productId, companyId, 0, 200)
      : this.projectsService.getProjects(companyId, 0, 200);

    obs$.subscribe({
      next: (res) => {
        this.projects.set(res.items ?? []);
        this.loadingProjects.set(false);
      },
      error: () => {
        this.projects.set([]);
        this.loadingProjects.set(false);
      },
    });
  }

  // ── Actions ──────────────────────────────────────────────────────

  /**
   * Abre el diálogo selector de tipo de lote.
   * El wizard de creación se implementará en una segunda fase.
   */
  openCreateDialog(): void {
    const dialogRef = this.dialog.open(LotTypeChooserDialogComponent, {
      width: '100%',
      maxWidth: '760px',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((type: LotTypeChoice) => {
      if (type === 'primaria') {
        this.openCreatePrimaryDirect();
      } else if (type === 'secundaria') {
        this.openCreateSecondaryDirect();
      }
    });
  }

  /**
   * Navega al detalle del lote (ruta a nivel empresa).
   * Los lotes secundarios tienen su propia página de detalle.
   */
  viewLotDetail(lot: ProductionLotRecord): void {
    if (lot.transformationStage === 'secundaria') {
      this.router.navigate(['/production-lots/secondary', lot.id]);
    } else {
      this.router.navigate(['/production-lots', lot.id]);
    }
  }

  // ── Filters & Pagination ─────────────────────────────────────────

  setStageFilter(filter: StageFilter): void {
    this.activeStageFilter.set(filter);
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.searchSubject.next(term);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
  }

  onProductChange(productId: string | null): void {
    this.selectedProductId.set(productId);
    // Reset project filter and reload projects scoped to the selected product
    this.selectedProjectId.set(null);
    this.loadProjects(productId);
    this.currentPage.set(0);
    this.loadLots();
  }

  onProjectChange(projectId: string | null): void {
    this.selectedProjectId.set(projectId);
    this.currentPage.set(0);
    this.loadLots();
  }

  generateTraceabilityQr(lot: ProductionLotRecord): void {
    this.dialog.open(TraceabilityQrDialogComponent, {
      width: '100%',
      maxWidth: '520px',
      data: {
        lotNumber: lot.lotNumber,
        lotId: lot.id,
        transformationStage: lot.transformationStage,
        companyName: lot.derivedCompanyName ?? undefined,
      },
    });
  }

  clearFilters(): void {
    this.selectedProductId.set(null);
    this.selectedProjectId.set(null);
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.loadProjects();
    this.currentPage.set(0);
    this.loadLots();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadLots();
  }

  // ── Helpers ──────────────────────────────────────────────────────

  /** Texto de cantidad + unidad */
  formatQuantity(lot: ProductionLotRecord): string {
    if (lot.quantity == null) return '—';
    const unit = lot.unit ?? '';
    return `${lot.quantity} ${unit}`.trim();
  }

  /** Abre el wizard de creación de lote primario */
  openCreatePrimaryDirect(): void {
    const dialogRef = this.dialog.open(PrimaryLotCreationWizardComponent, {
      width: '100%',
      maxWidth: '760px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: PrimaryLotWizardResult | null) => {
      if (result?.created) {
        this.currentPage.set(0);
        this.loadLots();
      }
    });
  }

  /** Abre el wizard de creación de lote secundario multi-fuente */
  openCreateSecondaryDirect(): void {
    const dialogRef = this.dialog.open(SecondaryLotCreationWizardComponent, {
      width: '100%',
      maxWidth: '820px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: SecondaryLotWizardResult | null) => {
      if (result?.created) {
        this.currentPage.set(0);
        this.loadLots();
      }
    });
  }
}

// Alias for dialog return type
type LotTypeChoice = TransformationStage | null;
