import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, catchError, of, debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { NotificationService } from '@core/services/notification.service';
import { SidebarService } from '@core/services/sidebar.service';
import { ProductsService } from '../../products/services/products.service';
import { Product } from '../../products/models/product.model';
import { ProjectsService } from '../../projects/services/projects.service';
import { Project } from '../../projects/models/project.model';
import { ProductionLotsService } from '../../projects/services/production-lots.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PmHasPermissionDirective } from '@core/directives/pm-has-permission.directive';
import { PERMISSIONS } from '@core/auth/permissions';
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
import { FinalProductTraceabilityQrDialogComponent } from '../components/final-product-traceability-qr-dialog.component';
import { TraceabilityQrDialogComponent } from '../components/traceability-qr-dialog.component';
import {
  PrimaryLotCreationWizardComponent,
  PrimaryLotWizardResult,
} from '../components/primary-lot-creation-wizard.component';
import {
  SecondaryLotCreationWizardComponent,
  SecondaryLotWizardResult,
} from '../components/secondary-lot-creation-wizard.component';
import {
  ProductionLotLocationMapDialogComponent,
  ProductionLotLocationDialogData,
} from '../components/production-lot-location-map-dialog.component';

/** Respuesta vacía usada como fallback cuando una llamada paralela falla. */
const EMPTY_PAGE = { items: [] as ProductionLotRecord[], total: 0, page: 0, size: 0 };

@Component({
  selector: 'app-production-lots-page',
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
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
    PmHasPermissionDirective,
  ],
  templateUrl: './production-lots.page.html',
  styleUrl: './production-lots.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionLotsPage implements OnInit {
  private lotsService = inject(ProductionLotsService);
  private productsService = inject(ProductsService);
  private projectsService = inject(ProjectsService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly sidebarService = inject(SidebarService);
  protected readonly PERMISSIONS = PERMISSIONS;

  private readonly searchSubject = new Subject<string>();

  // ── Labels ──────────────────────────────────────────────────────
  readonly STATUS_LABELS = PRODUCTION_LOT_STATUS_LABELS;
  readonly STAGE_LABELS = TRANSFORMATION_STAGE_LABELS;
  readonly STAGE_SHORT_LABELS = STAGE_SHORT_LABELS;

  // ── Permission gates ─────────────────────────────────────────────
  /**
   * true si el usuario puede acceder a la sección de transformación primaria.
   * Tanto READ (gestor) como STORAGE (gestor almacenamiento temporal) dan acceso.
   */
  canSeePrimary = computed(
    () =>
      this.sidebarService.hasPermission(PERMISSIONS.TRANSFORMATION_PRIMARY.READ) ||
      this.sidebarService.hasPermission(PERMISSIONS.TRANSFORMATION_PRIMARY.STORAGE),
  );

  /** true si el usuario puede acceder a la sección de transformación secundaria. */
  canSeeSecondary = computed(() =>
    this.sidebarService.hasPermission(PERMISSIONS.TRANSFORMATION_SECONDARY.READ),
  );

  // ── Carga inicial (spinner de página completa en el primer fetch) ─
  initialLoading = signal(true);

  // ── Estado sección Primaria ──────────────────────────────────────
  primaryLots = signal<ProductionLotRecord[]>([]);
  primaryTotal = signal(0);
  primaryPage = signal(0);
  primaryPageSize = signal(20);
  primaryLoading = signal(false);

  // ── Estado sección Secundaria ────────────────────────────────────
  secondaryLots = signal<ProductionLotRecord[]>([]);
  secondaryTotal = signal(0);
  secondaryPage = signal(0);
  secondaryPageSize = signal(20);
  secondaryLoading = signal(false);

  // ── Filtros ──────────────────────────────────────────────────────
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

  /**
   * true cuando el usuario solo tiene STORAGE (no PROCESS) para transformación primaria.
   * GESTOR_ALMACENAMIENTO_TEMPORAL solo puede ver lotes en estado 'almacenamiento'.
   */
  isStorageOnlyUser = computed(
    () =>
      this.sidebarService.hasPermission(PERMISSIONS.TRANSFORMATION_PRIMARY.STORAGE) &&
      !this.sidebarService.hasPermission(PERMISSIONS.TRANSFORMATION_PRIMARY.PROCESS),
  );

  /**
   * Lotes primarios visibles según el rol.
   * GESTOR_ALMACENAMIENTO_TEMPORAL solo ve los que están en 'almacenamiento'.
   */
  filteredPrimaryLots = computed(() => {
    if (this.isStorageOnlyUser()) {
      return this.primaryLots().filter((l) => l.status === 'almacenamiento');
    }
    return this.primaryLots();
  });

  /** Total paginado de lotes primarios – badge del tab y header de sección. */
  primaryCount = computed(() => this.primaryTotal());

  /** Total paginado de lotes secundarios – badge del tab y header de sección. */
  secondaryCount = computed(() => this.secondaryTotal());

  /** Total combinado para el tab "Todos". */
  totalCount = computed(() => this.primaryTotal() + this.secondaryTotal());

  /**
   * true cuando no hay ningún lote en ninguna sección y no hay filtros activos.
   * Se usa para mostrar el estado vacío de página completa.
   */
  isEmpty = computed(
    () =>
      !this.initialLoading() &&
      this.primaryTotal() === 0 &&
      this.secondaryTotal() === 0 &&
      !this.searchTerm() &&
      !this.selectedProductId() &&
      !this.selectedProjectId(),
  );

  // ── Lifecycle ────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadProducts();
    this.loadProjects();
    this.loadLots();

    // Búsqueda con debounce → resetea ambas páginas y recarga en paralelo
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.primaryPage.set(0);
        this.secondaryPage.set(0);
        this.loadLots();
      });
  }

  // ── Data loading ─────────────────────────────────────────────────

  /**
   * Carga inicial y recarga por cambio de filtros.
   * - Ambas secciones accesibles → forkJoin paralelo con catchError individual.
   * - Solo primaria → llamada única para primaria.
   * - Solo secundaria → llamada única para secundaria.
   */
  loadLots(): void {
    const companyId = this.sidebarService.tenantId();
    if (!companyId) {
      this.notification.error('No se pudo identificar la empresa activa');
      this.initialLoading.set(false);
      return;
    }

    const canP = this.canSeePrimary();
    const canS = this.canSeeSecondary();

    const baseParams = {
      companyId,
      q: this.searchTerm() || undefined,
      productId: this.selectedProductId() ?? undefined,
      projectId: this.selectedProjectId() ?? undefined,
    };

    if (canP && canS) {
      // ── Carga paralela ──────────────────────────────────────────
      this.primaryLoading.set(true);
      this.secondaryLoading.set(true);

      forkJoin({
        primary: this.lotsService
          .search({
            ...baseParams,
            transformationStage: 'primaria',
            page: this.primaryPage(),
            size: this.primaryPageSize(),
          })
          .pipe(
            catchError((err) => {
              const msg = err?.error?.message;
              this.notification.error(msg ?? 'Error al cargar lotes de transformación primaria');
              return of({ ...EMPTY_PAGE });
            }),
          ),
        secondary: this.lotsService
          .search({
            ...baseParams,
            transformationStage: 'secundaria',
            page: this.secondaryPage(),
            size: this.secondaryPageSize(),
          })
          .pipe(
            catchError((err) => {
              const msg = err?.error?.message;
              this.notification.error(msg ?? 'Error al cargar lotes de transformación secundaria');
              return of({ ...EMPTY_PAGE });
            }),
          ),
      }).subscribe(({ primary, secondary }) => {
        this.primaryLots.set(primary.items ?? []);
        this.primaryTotal.set(primary.total ?? 0);
        this.secondaryLots.set(secondary.items ?? []);
        this.secondaryTotal.set(secondary.total ?? 0);
        this.primaryLoading.set(false);
        this.secondaryLoading.set(false);
        this.initialLoading.set(false);
      });
    } else if (canP) {
      // ── Solo primaria ───────────────────────────────────────────
      this.primaryLoading.set(true);
      this.lotsService
        .search({
          ...baseParams,
          transformationStage: 'primaria',
          page: this.primaryPage(),
          size: this.primaryPageSize(),
        })
        .subscribe({
          next: (res) => {
            this.primaryLots.set(res.items ?? []);
            this.primaryTotal.set(res.total ?? 0);
            this.primaryLoading.set(false);
            this.initialLoading.set(false);
          },
          error: (err) => {
            const msg = err?.error?.message;
            this.notification.error(msg ?? 'Error al cargar lotes de transformación primaria');
            this.primaryLots.set([]);
            this.primaryTotal.set(0);
            this.primaryLoading.set(false);
            this.initialLoading.set(false);
          },
        });
    } else if (canS) {
      // ── Solo secundaria ─────────────────────────────────────────
      this.secondaryLoading.set(true);
      this.lotsService
        .search({
          ...baseParams,
          transformationStage: 'secundaria',
          page: this.secondaryPage(),
          size: this.secondaryPageSize(),
        })
        .subscribe({
          next: (res) => {
            this.secondaryLots.set(res.items ?? []);
            this.secondaryTotal.set(res.total ?? 0);
            this.secondaryLoading.set(false);
            this.initialLoading.set(false);
          },
          error: (err) => {
            const msg = err?.error?.message;
            this.notification.error(msg ?? 'Error al cargar lotes de transformación secundaria');
            this.secondaryLots.set([]);
            this.secondaryTotal.set(0);
            this.secondaryLoading.set(false);
            this.initialLoading.set(false);
          },
        });
    } else {
      // Sin permisos para ninguna sección
      this.initialLoading.set(false);
    }
  }

  /**
   * Recarga SOLO la sección primaria.
   * Invocado exclusivamente desde la paginación independiente de esa sección.
   */
  private loadPrimarySection(): void {
    const companyId = this.sidebarService.tenantId();
    if (!companyId) return;
    this.primaryLoading.set(true);
    this.lotsService
      .search({
        companyId,
        transformationStage: 'primaria',
        page: this.primaryPage(),
        size: this.primaryPageSize(),
        q: this.searchTerm() || undefined,
        productId: this.selectedProductId() ?? undefined,
        projectId: this.selectedProjectId() ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.primaryLots.set(res.items ?? []);
          this.primaryTotal.set(res.total ?? 0);
          this.primaryLoading.set(false);
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.notification.error(msg ?? 'Error al cargar lotes de transformación primaria');
          this.primaryLots.set([]);
          this.primaryTotal.set(0);
          this.primaryLoading.set(false);
        },
      });
  }

  /**
   * Recarga SOLO la sección secundaria.
   * Invocado exclusivamente desde la paginación independiente de esa sección.
   */
  private loadSecondarySection(): void {
    const companyId = this.sidebarService.tenantId();
    if (!companyId) return;
    this.secondaryLoading.set(true);
    this.lotsService
      .search({
        companyId,
        transformationStage: 'secundaria',
        page: this.secondaryPage(),
        size: this.secondaryPageSize(),
        q: this.searchTerm() || undefined,
        productId: this.selectedProductId() ?? undefined,
        projectId: this.selectedProjectId() ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.secondaryLots.set(res.items ?? []);
          this.secondaryTotal.set(res.total ?? 0);
          this.secondaryLoading.set(false);
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.notification.error(msg ?? 'Error al cargar lotes de transformación secundaria');
          this.secondaryLots.set([]);
          this.secondaryTotal.set(0);
          this.secondaryLoading.set(false);
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

  viewLotDetail(lot: ProductionLotRecord): void {
    if (lot.transformationStage === 'secundaria') {
      this.router.navigate(['/production-lots/secondary', lot.id]);
    } else {
      this.router.navigate(['/production-lots', lot.id]);
    }
  }

  // ── Filtros y Paginación ─────────────────────────────────────────

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
    this.selectedProjectId.set(null);
    this.loadProjects(productId);
    this.primaryPage.set(0);
    this.secondaryPage.set(0);
    this.loadLots();
  }

  onProjectChange(projectId: string | null): void {
    this.selectedProjectId.set(projectId);
    this.primaryPage.set(0);
    this.secondaryPage.set(0);
    this.loadLots();
  }

  /** Paginación independiente de la sección Primaria. */
  onPrimaryPageChange(event: PageEvent): void {
    this.primaryPage.set(event.pageIndex);
    this.primaryPageSize.set(event.pageSize);
    this.loadPrimarySection();
  }

  /** Paginación independiente de la sección Secundaria. */
  onSecondaryPageChange(event: PageEvent): void {
    this.secondaryPage.set(event.pageIndex);
    this.secondaryPageSize.set(event.pageSize);
    this.loadSecondarySection();
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

  generateFinalProductTraceabilityQr(lot: ProductionLotRecord): void {
    this.dialog.open(FinalProductTraceabilityQrDialogComponent, {
      width: '100%',
      maxWidth: '760px',
      data: {
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        companyName: lot.derivedCompanyName ?? undefined,
      },
    });
  }

  syncTraceabilityWithLandingPage(lot: ProductionLotRecord): void {
    this.lotsService.syncTraceability(lot.id).subscribe({
      next: () => this.notification.success('Sincronización con Landing Page iniciada'),
      error: (err) => {
        const msg = err?.error?.message;
        this.notification.error(msg ?? 'No se pudo sincronizar con Landing Page');
      },
    });
  }

  openLocationDialog(event: Event, lot: ProductionLotRecord): void {
    event.stopPropagation();
    if (!lot.location) return;
    const data: ProductionLotLocationDialogData = {
      lotNumber: lot.lotNumber,
      transformationStage: lot.transformationStage,
      location: lot.location,
    };
    this.dialog.open(ProductionLotLocationMapDialogComponent, {
      width: '100%',
      maxWidth: '560px',
      data,
    });
  }

  clearFilters(): void {
    this.selectedProductId.set(null);
    this.selectedProjectId.set(null);
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.loadProjects();
    this.primaryPage.set(0);
    this.secondaryPage.set(0);
    this.loadLots();
  }

  // ── Helpers ──────────────────────────────────────────────────────

  formatQuantity(lot: ProductionLotRecord): string {
    if (lot.quantity == null) return '—';
    const unit = lot.unit ?? '';
    return `${lot.quantity} ${unit}`.trim();
  }

  openCreatePrimaryDirect(): void {
    const dialogRef = this.dialog.open(PrimaryLotCreationWizardComponent, {
      width: '100%',
      maxWidth: '760px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: PrimaryLotWizardResult | null) => {
      if (result?.created) {
        this.primaryPage.set(0);
        this.loadLots();
      }
    });
  }

  openCreateSecondaryDirect(): void {
    const dialogRef = this.dialog.open(SecondaryLotCreationWizardComponent, {
      width: '100%',
      maxWidth: '820px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: SecondaryLotWizardResult | null) => {
      if (result?.created) {
        this.secondaryPage.set(0);
        this.loadLots();
      }
    });
  }
}

// Alias para el tipo de retorno del diálogo selector
type LotTypeChoice = TransformationStage | null;
