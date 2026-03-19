import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { ProductionLotsService } from '../../projects/services/production-lots.service';
import { NotificationService } from '@core/services/notification.service';
import { SidebarService } from '@core/services/sidebar.service';
import { PERMISSIONS } from '@core/auth/permissions';
import {
  ProductionLotLocationMapDialogComponent,
  ProductionLotLocationDialogData,
} from '../components/production-lot-location-map-dialog.component';
import {
  ProductionLotDetail,
  ProductionLotStatus,
  ProductionLotDocumentCode,
  ProductionLotDocument,
  ProductionLotBatchReception,
  ProductionLotProcessingRecord,
  SavePackagingRecordRequest,
  SaveStorageRecordRequest,
  GenerateFruitReceptionRecordRequest,
  GeneratePulpProcessingRecordRequest,
  PRODUCTION_LOT_STATUS_LABELS,
  PRODUCTION_LOT_DOCUMENT_LABELS,
  TRANSFORMATION_STAGE_LABELS,
} from '../../projects/models/production-lot.model';

// ─── Stage configuration ────────────────────────────────────────────────────

export interface StageNextOption {
  status: ProductionLotStatus;
  label: string;
  icon: string;
  description: string;
  isPrimary: boolean;
}

export interface StageConfig {
  status: ProductionLotStatus;
  label: string;
  icon: string;
  accentColor: string;
  bgColor: string;
  documentCode: ProductionLotDocumentCode | null;
  isOptional: boolean;
  description: string;
  nextOptions: StageNextOption[];
}

export const STAGE_CONFIGS: StageConfig[] = [
  {
    status: 'recepcion',
    label: 'Recepción',
    icon: 'input',
    accentColor: '#2563eb',
    bgColor: '#eff6ff',
    documentCode: 'FRUIT_RECEPTION_RECORD',
    isOptional: false,
    description:
      'Registro de ingreso y verificación de los lotes de acopio al proceso de transformación primaria.',
    nextOptions: [
      {
        status: 'acondicionado',
        label: 'Pasar a Acondicionado',
        icon: 'build_circle',
        description: 'Preparar el material para el procesamiento',
        isPrimary: true,
      },
    ],
  },
  {
    status: 'acondicionado',
    label: 'Acondicionado',
    icon: 'build_circle',
    accentColor: '#d97706',
    bgColor: '#fef3c7',
    documentCode: 'PULP_PROCESSING_RECORD',
    isOptional: false,
    description: 'Preparación y acondicionamiento del material para el procesamiento.',
    nextOptions: [
      {
        status: 'ablandamiento',
        label: 'Ir a Ablandamiento',
        icon: 'water_drop',
        description: 'Aplicar proceso de ablandamiento previo al pulpeado',
        isPrimary: false,
      },
      {
        status: 'pulpeado',
        label: 'Pasar directo a Pulpeado',
        icon: 'blender',
        description: 'Omitir ablandamiento y avanzar directo a pulpeado',
        isPrimary: true,
      },
    ],
  },
  {
    status: 'ablandamiento',
    label: 'Ablandamiento',
    icon: 'water_drop',
    accentColor: '#c2410c',
    bgColor: '#fff7ed',
    documentCode: 'PULP_PROCESSING_RECORD',
    isOptional: true,
    description:
      'Proceso opcional de ablandamiento del material para facilitar la extracción de pulpa.',
    nextOptions: [
      {
        status: 'pulpeado',
        label: 'Pasar a Pulpeado',
        icon: 'blender',
        description: 'Iniciar proceso de extracción de pulpa',
        isPrimary: true,
      },
    ],
  },
  {
    status: 'pulpeado',
    label: 'Pulpeado',
    icon: 'blender',
    accentColor: '#9333ea',
    bgColor: '#faf5ff',
    documentCode: 'PULP_PROCESSING_RECORD',
    isOptional: false,
    description: 'Extracción y procesamiento de la pulpa del producto.',
    nextOptions: [
      {
        status: 'envasado',
        label: 'Pasar a Envasado',
        icon: 'inventory',
        description: 'Iniciar proceso de envasado del producto transformado',
        isPrimary: true,
      },
    ],
  },
  {
    status: 'envasado',
    label: 'Envasado',
    icon: 'inventory',
    accentColor: '#16a34a',
    bgColor: '#f0fdf4',
    documentCode: 'PACKAGING_RECORD',
    isOptional: false,
    description: 'Envasado y empaque del producto transformado.',
    nextOptions: [
      {
        status: 'almacenamiento',
        label: 'Pasar a Almacenamiento',
        icon: 'warehouse',
        description: 'Registrar producto en almacén',
        isPrimary: true,
      },
    ],
  },
  {
    status: 'almacenamiento',
    label: 'Almacenamiento',
    icon: 'warehouse',
    accentColor: '#0891b2',
    bgColor: '#ecfeff',
    documentCode: 'STORAGE_CONTROL_RECORD',
    isOptional: true,
    description: 'Control y registro del producto procesado en almacenamiento.',
    nextOptions: [],
  },
];

export const STAGE_ORDER: ProductionLotStatus[] = [
  'recepcion',
  'acondicionado',
  'ablandamiento',
  'pulpeado',
  'envasado',
  'almacenamiento',
];

export const STAGE_INDEX: Record<ProductionLotStatus, number> = {
  recepcion: 0,
  acondicionado: 1,
  ablandamiento: 2,
  pulpeado: 3,
  envasado: 4,
  almacenamiento: 5,
};

// ─── Component ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-production-lot-detail-page',
  imports: [
    CommonModule,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    NgxExtendedPdfViewerModule,
  ],
  templateUrl: './production-lot-detail.page.html',
  styleUrl: './production-lot-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionLotDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lotsService = inject(ProductionLotsService);
  private azureStorage = inject(AzureStorageService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  readonly sidebarService = inject(SidebarService);
  protected readonly PERMISSIONS = PERMISSIONS;

  // ─── State ────────────────────────────────────────────────────────────────
  lot = signal<ProductionLotDetail | null>(null);
  loading = signal(true);

  /** Stage the user is currently VIEWING (may differ from lot's actual status) */
  viewingStage = signal<ProductionLotStatus>('recepcion');

  pdfUrl = signal<string | null>(null);
  loadingPdf = signal(false);

  // ─── Reception state (recepcion stage) ─────────────────────────────────────
  receptions = signal<ProductionLotBatchReception[]>([]);
  loadingReceptions = signal(false);
  expandedReceptionId = signal<string | null>(null);
  /** true while POST /fruit-reception-record is in flight (both buttons share this) */
  generatingDocument = signal(false);
  /** true while PATCH /{id}/status is in flight */
  advancingStage = signal(false);
  private receptionForms: Record<string, FormGroup> = {};

  // ─── Processing record state (envasado / almacenamiento) ───────────────────
  processingRecord = signal<ProductionLotProcessingRecord | null>(null);
  loadingProcessingRecord = signal(false);
  savingProcessingRecord = signal(false);
  processingForm!: FormGroup; /** Saldo computado reactivamente desde unitsIn - unitsOut */
  unitsBalanceDisplay = signal<number>(0);
  private balanceSub?: Subscription;
  // ─── Static references ─────────────────────────────────────────────────────
  readonly STAGE_CONFIGS = STAGE_CONFIGS;
  readonly STAGE_ORDER = STAGE_ORDER;
  readonly STAGE_INDEX = STAGE_INDEX;
  readonly STATUS_LABELS = PRODUCTION_LOT_STATUS_LABELS;
  readonly DOCUMENT_LABELS = PRODUCTION_LOT_DOCUMENT_LABELS;
  readonly TRANSFORMATION_LABELS = TRANSFORMATION_STAGE_LABELS;

  // ─── Computed ──────────────────────────────────────────────────────────────

  currentStageConfig = computed<StageConfig>(
    () => STAGE_CONFIGS.find((s) => s.status === this.viewingStage()) ?? STAGE_CONFIGS[0],
  );

  /**
   * Document associated with the stage the user is viewing.
   * PULP_PROCESSING_RECORD is shared across acondicionado/ablandamiento/pulpeado —
   * we pick the first matching document.
   */
  currentDocument = computed<ProductionLotDocument | null>(() => {
    const lot = this.lot();
    if (!lot?.documents) return null;
    const code = this.currentStageConfig().documentCode;
    if (!code) return null;
    return lot.documents.find((d) => d.codeDocument === code) ?? null;
  });

  /** Nombre(s) de producto derivados de sourceBatches (lotes primarios) */
  lotProductLabel = computed<string>(() => {
    const lot = this.lot();
    if (!lot) return '—';
    if (lot.sourceBatches?.length) {
      const names = [...new Set(lot.sourceBatches.map((b) => b.productName))];
      return names.join(', ');
    }
    return '—';
  });

  /** Is the user viewing the lot's CURRENT (active) stage? */
  isViewingCurrentStage = computed(() => this.lot()?.status === this.viewingStage());

  /**
   * true cuando el usuario solo tiene STORAGE (y no PROCESS).
   * Representa al GESTOR_ALMACENAMIENTO_TEMPORAL.
   */
  isStorageOnlyUser = computed(
    () =>
      this.sidebarService.hasPermission(PERMISSIONS.TRANSFORMATION_PRIMARY.STORAGE) &&
      !this.sidebarService.hasPermission(PERMISSIONS.TRANSFORMATION_PRIMARY.PROCESS),
  );

  /**
   * true si el usuario puede editar la etapa que está viendo.
   * Para GESTOR_ALMACENAMIENTO_TEMPORAL, solo es editable la etapa 'almacenamiento'.
   */
  canEditStage = computed(() => {
    if (!this.isStorageOnlyUser()) return true;
    return this.viewingStage() === 'almacenamiento';
  });

  /**
   * true cuando el lote primario ya fue utilizado como origen de un lote secundario.
   * En ese caso se ocultan todos los botones de edición y generación de documentos.
   */
  isLockedBySecondaryLot = computed(() => this.lot()?.usedInSecondaryLot === true);

  /** Status of the stage the user is viewing relative to the lot's progress */
  viewingStageRelation = computed<'done' | 'current' | 'locked'>(() => {
    const lot = this.lot();
    if (!lot) return 'locked';
    const lotIdx = STAGE_INDEX[lot.status];
    const viewIdx = STAGE_INDEX[this.viewingStage()];
    if (viewIdx < lotIdx) return 'done';
    if (viewIdx === lotIdx) return 'current';
    return 'locked';
  });

  /** Next stage options to show in footer (only when viewing current stage) */
  nextOptions = computed<StageNextOption[]>(() => {
    if (!this.isViewingCurrentStage()) return [];
    return this.currentStageConfig().nextOptions;
  });

  /**
   * Can advance to next stage only if document for current stage is generated.
   * Stages without a required document can always advance.
   */
  canAdvance = computed(() => {
    const code = this.currentStageConfig().documentCode;
    if (!code) return true;
    return !!this.currentDocument()?.blobName;
  });

  /**
   * documentCode que corresponde a la etapa visualizada para cargar recepciones.
   * null cuando la etapa no tiene panel de recepciones (envasado, almacenamiento).
   */
  receptionDocumentCode = computed<ProductionLotDocumentCode | null>(() => {
    const stage = this.viewingStage();
    if (stage === 'recepcion') return 'FRUIT_RECEPTION_RECORD';
    if (stage === 'acondicionado' || stage === 'ablandamiento' || stage === 'pulpeado') {
      return 'PULP_PROCESSING_RECORD';
    }
    return null;
  });

  /**
   * documentCode para el panel de registro único (envasado / almacenamiento).
   * null para todas las demás etapas.
   */
  processingRecordStageCode = computed<ProductionLotDocumentCode | null>(() => {
    const stage = this.viewingStage();
    if (stage === 'envasado') return 'PACKAGING_RECORD';
    if (stage === 'almacenamiento') return 'STORAGE_CONTROL_RECORD';
    return null;
  });

  receptionTotals = computed(() => ({
    totalWeight: this.receptions().reduce((sum, r) => sum + (r.weightKg ?? 0), 0),
    totalSacks: this.receptions().reduce((sum, r) => sum + (r.sacksCount ?? 0), 0),
    count: this.receptions().length,
  }));

  pulpTotals = computed(() => ({
    totalJabasRipening: this.receptions().reduce((sum, r) => sum + (r.jabasRipeningCount ?? 0), 0),
    count: this.receptions().length,
  }));

  locationCenter = computed<google.maps.LatLngLiteral>(() => {
    const loc = this.lot()?.location;
    return loc ? { lat: loc.latitude, lng: loc.longitude } : { lat: -9.19, lng: -75.0152 };
  });

  readonly locationMapOptions: google.maps.MapOptions = {
    mapTypeId: 'roadmap',
    disableDefaultUI: true,
    zoomControl: false,
    scrollwheel: false,
    clickableIcons: false,
  };

  readonly locationMarkerOptions: google.maps.MarkerOptions = {
    draggable: false,
    animation: google.maps.Animation.DROP,
  };

  constructor() {
    // React to stage/lot changes → refresh PDF URL
    effect(() => {
      const lot = this.lot();
      const doc = this.currentDocument();
      if (!lot) return;

      if (doc?.blobName) {
        this.loadPdf(doc.blobName);
      } else {
        this.pdfUrl.set(null);
      }
    });

    // Carga recepciones reactivamente al navegar entre etapas relevantes
    effect(() => {
      const lot = this.lot();
      const docCode = this.receptionDocumentCode();
      this.expandedReceptionId.set(null);
      if (lot && docCode) {
        this.loadReceptions(lot.id, docCode);
      } else {
        this.receptions.set([]);
        this.receptionForms = {};
      }
    });

    // Carga el registro de procesamiento al entrar a envasado o almacenamiento
    effect(() => {
      const lot = this.lot();
      const stageCode = this.processingRecordStageCode();
      if (lot && stageCode) {
        this.loadProcessingRecord(lot.id, stageCode);
      } else {
        this.processingRecord.set(null);
        this.processingForm = this.fb.group({});
      }
    });
  }

  ngOnInit(): void {
    const lotId = this.route.snapshot.paramMap.get('id');
    if (lotId) this.loadLot(lotId);
  }

  // ─── Data loading ──────────────────────────────────────────────────────────

  loadLot(id: string): void {
    this.loading.set(true);
    this.lotsService.getLotById(id).subscribe({
      next: (lot) => {
        this.lot.set(lot);
        this.viewingStage.set(lot.status);
        this.loading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        const msg = error?.error?.message;
        if (msg) this.notification.error(msg);
        this.loading.set(false);
      },
    });
  }

  private reloadLot(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loadLot(id);
  }

  loadPdf(blobName: string): void {
    this.loadingPdf.set(true);
    this.azureStorage.clearCacheEntry(blobName);
    this.azureStorage.getFileUrl(blobName).subscribe({
      next: (url) => {
        this.pdfUrl.set(url);
        this.loadingPdf.set(false);
      },
      error: () => {
        this.pdfUrl.set(null);
        this.loadingPdf.set(false);
      },
    });
  }

  loadReceptions(lotId: string, documentCode: ProductionLotDocumentCode): void {
    this.loadingReceptions.set(true);
    this.lotsService.getBatchReceptions(lotId, documentCode).subscribe({
      next: (list) => {
        this.receptions.set(list);
        this.initReceptionForms(list);
        this.loadingReceptions.set(false);
      },
      error: () => {
        this.loadingReceptions.set(false);
      },
    });
  }

  loadProcessingRecord(lotId: string, stageCode: ProductionLotDocumentCode): void {
    this.loadingProcessingRecord.set(true);
    this.processingRecord.set(null);
    this.lotsService.getProcessingRecord(lotId, stageCode).subscribe({
      next: (record) => {
        this.processingRecord.set(record);
        this.initProcessingForm(record);
        this.loadingProcessingRecord.set(false);
      },
      error: () => {
        // 404 means no record yet — init empty form
        this.processingRecord.set(null);
        this.initProcessingForm(null);
        this.loadingProcessingRecord.set(false);
      },
    });
  }

  private initProcessingForm(record: ProductionLotProcessingRecord | null): void {
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const nowTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const stage = this.processingRecordStageCode();

    if (stage === 'PACKAGING_RECORD') {
      this.processingForm = this.fb.group({
        inputs: [record?.inputs ?? ''],
        startDate: [record?.startDate ?? todayISO],
        startTime: [record?.startTime ? record.startTime.substring(0, 5) : nowTime],
        productionEndDatetime: [this.toDatetimeLocalFull(record?.productionEndDatetime)],
        brixDegrees: [record?.brixDegrees ?? null],
        ph: [record?.ph ?? null],
        packages1kgCount: [record?.packages1kgCount ?? null],
        packages5kgCount: [record?.packages5kgCount ?? null],
        packages20kgCount: [record?.packages20kgCount ?? null],
        packages50kgCount: [record?.packages50kgCount ?? null],
        quantityKg: [record?.quantityKg ?? null],
        observations: [record?.observations ?? ''],
      });
    } else {
      this.balanceSub?.unsubscribe();
      const initialBalance = (record?.unitsIn ?? 0) - (record?.unitsOut ?? 0);
      this.unitsBalanceDisplay.set(initialBalance);
      this.processingForm = this.fb.group({
        expirationDate: [record?.expirationDate ?? ''],
        storageFormat: [record?.storageFormat ?? ''],
        unitsIn: [record?.unitsIn ?? null],
        unitsOut: [record?.unitsOut ?? null],
        observations: [record?.observations ?? ''],
      });
      this.balanceSub = this.processingForm.valueChanges.subscribe((vals) => {
        this.unitsBalanceDisplay.set((vals['unitsIn'] ?? 0) - (vals['unitsOut'] ?? 0));
      });
    }
  }

  saveProcessingRecord(): void {
    const lot = this.lot();
    if (!lot || !this.processingForm) return;
    const stage = this.processingRecordStageCode();
    if (!stage) return;

    this.savingProcessingRecord.set(true);
    const raw = this.processingForm.getRawValue();

    if (stage === 'PACKAGING_RECORD') {
      const request: SavePackagingRecordRequest = {
        productionLotId: lot.id,
        processingStage: 'PACKAGING_RECORD',
        inputs: (raw['inputs'] as string) || null,
        startDate: (raw['startDate'] as string) || null,
        startTime: (raw['startTime'] as string) || null,
        productionEndDatetime: this.fromDatetimeLocalFull(raw['productionEndDatetime'] as string),
        brixDegrees: (raw['brixDegrees'] as number) ?? null,
        ph: (raw['ph'] as number) ?? null,
        packages1kgCount: (raw['packages1kgCount'] as number) ?? null,
        packages5kgCount: (raw['packages5kgCount'] as number) ?? null,
        packages20kgCount: (raw['packages20kgCount'] as number) ?? null,
        packages50kgCount: (raw['packages50kgCount'] as number) ?? null,
        quantityKg: (raw['quantityKg'] as number) ?? null,
        observations: (raw['observations'] as string) || null,
      };
      this.lotsService.savePackagingRecord(lot.id, request).subscribe({
        next: () => {
          this.pdfUrl.set(null);
          this.reloadLot();
          this.savingProcessingRecord.set(false);
          this.notification.success('Registro de envasado guardado correctamente');
        },
        error: (err: { error?: { message?: string } }) => {
          this.savingProcessingRecord.set(false);
          this.notification.error(err?.error?.message ?? 'Error al guardar el registro');
        },
      });
    } else {
      const request: SaveStorageRecordRequest = {
        productionLotId: lot.id,
        processingStage: 'STORAGE_CONTROL_RECORD',
        expirationDate: (raw['expirationDate'] as string) || null,
        storageFormat: (raw['storageFormat'] as string) || null,
        unitsIn: (raw['unitsIn'] as number) ?? null,
        unitsOut: (raw['unitsOut'] as number) ?? null,
        unitsBalance: this.unitsBalanceDisplay(),
        observations: (raw['observations'] as string) || null,
        handlerName: '',
        handlerTime: '',
        handlerRole: '',
        shift: '',
      };
      this.lotsService.saveStorageRecord(lot.id, request).subscribe({
        next: () => {
          this.pdfUrl.set(null);
          this.reloadLot();
          this.savingProcessingRecord.set(false);
          this.notification.success('Registro de almacenamiento guardado correctamente');
        },
        error: (err: { error?: { message?: string } }) => {
          this.savingProcessingRecord.set(false);
          this.notification.error(err?.error?.message ?? 'Error al guardar el registro');
        },
      });
    }
  }

  private initReceptionForms(receptions: ProductionLotBatchReception[]): void {
    const isPulp = this.receptionDocumentCode() === 'PULP_PROCESSING_RECORD';
    this.receptionForms = {};
    for (const r of receptions) {
      this.receptionForms[r.id] = isPulp
        ? this.fb.group({
            jabasRipeningCount: [r.jabasRipeningCount],
            ripeningTub: [r.ripeningTub ?? ''],
            ripeningStartTime: [this.toDatetimeLocal(r.ripeningStartTime)],
            observations: [r.observations ?? ''],
          })
        : this.fb.group({
            weightKg: [r.weightKg],
            sacksCount: [r.sacksCount],
            jabasCount: [r.jabasCount],
            observations: [r.observations ?? ''],
          });
    }
  }

  getReceptionForm(id: string): FormGroup {
    return this.receptionForms[id];
  }

  toggleReception(id: string): void {
    this.expandedReceptionId.update((current) => (current === id ? null : id));
  }

  /**
   * Guardar recepción:
   * - En etapa recepcion → genera la ficha de frutos (incluye datos del form)
   * - En otras etapas → sólo actualiza los datos vía PATCH
   */
  saveReception(reception: ProductionLotBatchReception): void {
    this.generateDocument(reception.id);
  }

  private saveReceptionData(reception: ProductionLotBatchReception): void {
    const lot = this.lot();
    if (!lot) return;
    const form = this.receptionForms[reception.id];
    if (!form) return;
    this.generatingDocument.set(true);
    const raw = form.getRawValue();
    this.lotsService
      .updateBatchReception(lot.id, reception.id, {
        weightKg: raw.weightKg ?? null,
        sacksCount: raw.sacksCount ?? null,
        jabasCount: raw.jabasCount ?? null,
        observations: (raw.observations as string) || null,
      })
      .subscribe({
        next: (updated) => {
          this.receptions.update((list) => list.map((r) => (r.id === reception.id ? updated : r)));
          this.receptionForms[reception.id] = this.fb.group({
            weightKg: [updated.weightKg],
            sacksCount: [updated.sacksCount],
            jabasCount: [updated.jabasCount],
            observations: [updated.observations ?? ''],
          });
          this.expandedReceptionId.set(null);
          this.generatingDocument.set(false);
          this.notification.success('Recepción actualizada correctamente');
        },
        error: () => {
          this.generatingDocument.set(false);
          this.notification.error('Error al actualizar la recepción');
        },
      });
  }

  /**
   * Enruta al generador correcto según la etapa visualizada.
   */
  generateDocument(editedReceptionId?: string): void {
    if (this.receptionDocumentCode() === 'PULP_PROCESSING_RECORD') {
      this.generatePulpDocument(editedReceptionId);
    } else {
      this.generateFruitDocument(editedReceptionId);
    }
  }

  private generateFruitDocument(editedReceptionId?: string): void {
    const lot = this.lot();
    if (!lot) return;
    this.generatingDocument.set(true);

    const receptions = this.receptions().map((r) => {
      if (editedReceptionId && r.id === editedReceptionId) {
        const raw = this.receptionForms[r.id]?.getRawValue() ?? {};
        return {
          collectionBatchId: r.collectionBatchId,
          weightKg: (raw['weightKg'] as number) ?? null,
          sacksCount: (raw['sacksCount'] as number) ?? null,
          jabasCount: (raw['jabasCount'] as number) ?? null,
          observations: (raw['observations'] as string) || null,
        };
      }
      return {
        collectionBatchId: r.collectionBatchId,
        weightKg: r.weightKg ?? null,
        sacksCount: r.sacksCount ?? null,
        jabasCount: r.jabasCount ?? null,
        observations: r.observations ?? null,
      };
    });

    const request: GenerateFruitReceptionRecordRequest = { receptions };
    this.lotsService.generateFruitReceptionRecord(lot.id, request).subscribe({
      next: () => {
        this.pdfUrl.set(null);
        this.reloadLot();
        this.expandedReceptionId.set(null);
        this.generatingDocument.set(false);
        this.notification.success('Ficha de recepción generada correctamente');
      },
      error: (err: { error?: { message?: string } }) => {
        this.generatingDocument.set(false);
        const msg = err?.error?.message;
        this.notification.error(msg ?? 'Error al generar el documento');
      },
    });
  }

  private generatePulpDocument(editedReceptionId?: string): void {
    const lot = this.lot();
    if (!lot) return;
    this.generatingDocument.set(true);

    const receptions = this.receptions().map((r) => {
      const isEdited = !!editedReceptionId && r.id === editedReceptionId;
      const raw = isEdited ? (this.receptionForms[r.id]?.getRawValue() ?? {}) : null;
      return {
        collectionBatchId: r.collectionBatchId,
        weightKg: r.weightKg ?? null,
        sacksCount: r.sacksCount ?? null,
        jabasCount: r.jabasCount ?? null,
        observations: raw ? (raw['observations'] as string) || null : (r.observations ?? null),
        processingStage: r.processingStage,
        jabasRipeningCount: raw
          ? ((raw['jabasRipeningCount'] as number) ?? null)
          : (r.jabasRipeningCount ?? null),
        ripeningTub: raw ? (raw['ripeningTub'] as string) || null : (r.ripeningTub ?? null),
        ripeningStartTime: raw
          ? this.fromDatetimeLocal(raw['ripeningStartTime'] as string)
          : (r.ripeningStartTime ?? null),
      };
    });

    const request: GeneratePulpProcessingRecordRequest = { receptions };
    this.lotsService.generatePulpProcessingRecord(lot.id, request).subscribe({
      next: () => {
        this.pdfUrl.set(null);
        this.reloadLot();
        this.expandedReceptionId.set(null);
        this.generatingDocument.set(false);
        this.notification.success('Registro de procesamiento generado correctamente');
      },
      error: (err: { error?: { message?: string } }) => {
        this.generatingDocument.set(false);
        const msg = err?.error?.message;
        this.notification.error(msg ?? 'Error al generar el documento');
      },
    });
  }

  // ─── Stage navigation ──────────────────────────────────────────────────────

  navigateToStage(stage: ProductionLotStatus): void {
    const lot = this.lot();
    if (!lot) return;
    // Only allow navigating to current or past stages
    if (STAGE_INDEX[stage] <= STAGE_INDEX[lot.status]) {
      this.viewingStage.set(stage);
    }
  }

  goToPreviousStage(): void {
    const idx = STAGE_INDEX[this.viewingStage()];
    if (idx > 0) {
      this.viewingStage.set(STAGE_ORDER[idx - 1]);
    }
  }

  openLocationDialog(): void {
    const lot = this.lot();
    if (!lot?.location) return;
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

  goBack(): void {
    this.router.navigate(['/production-lots']);
  }

  /**
   * Avanza el lote a la siguiente etapa vía PATCH /{id}/status
   */
  advanceToStage(status: ProductionLotStatus): void {
    const lot = this.lot();
    if (!lot) return;
    this.advancingStage.set(true);
    this.lotsService.updateLotStatus(lot.id, status).subscribe({
      next: (updatedLot) => {
        this.viewingStage.set(updatedLot.status);
        this.reloadLot();
        this.advancingStage.set(false);
        this.notification.success(
          `Lote avanzado a ${PRODUCTION_LOT_STATUS_LABELS[updatedLot.status]}`,
        );
      },
      error: (err: { error?: { message?: string } }) => {
        this.advancingStage.set(false);
        const msg = err?.error?.message;
        this.notification.error(msg ?? 'Error al actualizar el estado del lote');
      },
    });
  }

  // ─── Stage display helpers ─────────────────────────────────────────────────

  getStageNodeClass(stage: ProductionLotStatus): string {
    const lot = this.lot();
    if (!lot) return 'stage-node--locked';
    const lotIdx = STAGE_INDEX[lot.status];
    const stageIdx = STAGE_INDEX[stage];
    // Current active stage of the lot always shows as highlighted
    if (stageIdx === lotIdx) return 'stage-node--active';
    // Past stage being browsed shows as amber "viewing"
    if (stageIdx < lotIdx && stage === this.viewingStage()) return 'stage-node--viewing';
    // Other past stages show as done (green check)
    if (stageIdx < lotIdx) return 'stage-node--done';
    return 'stage-node--locked';
  }

  isStageAccessible(stage: ProductionLotStatus): boolean {
    const lot = this.lot();
    if (!lot) return false;
    return STAGE_INDEX[stage] <= STAGE_INDEX[lot.status];
  }

  getDocumentStatusIcon(doc: ProductionLotDocument | null): string {
    if (!doc?.blobName) return 'radio_button_unchecked';
    return 'check_circle';
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  /** Extrae HH:MM de un ISO Instant para mostrarlo en un input type=time */
  private toDatetimeLocal(isoStr: string | null | undefined): string {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      return `${hh}:${mm}`;
    } catch {
      return '';
    }
  }

  /** Combina la hora seleccionada con la fecha de hoy y devuelve un ISO Instant */
  private fromDatetimeLocal(value: string | null | undefined): string | null {
    if (!value) return null;
    const [hours, minutes] = value.split(':').map(Number);
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  }

  /** Extrae "YYYY-MM-DDThh:mm" de un ISO Instant para input type=datetime-local */
  private toDatetimeLocalFull(isoStr: string | null | undefined): string {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  }

  /** Convierte "YYYY-MM-DDThh:mm" a ISO Instant */
  private fromDatetimeLocalFull(value: string | null | undefined): string | null {
    if (!value) return null;
    try {
      return new Date(value).toISOString();
    } catch {
      return null;
    }
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  formatDateShort(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  formatFileSize(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
}
