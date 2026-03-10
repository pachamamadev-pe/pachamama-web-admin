import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { ProductionLotsService } from '../services/production-lots.service';
import { NotificationService } from '@core/services/notification.service';
import {
  ProductionLotDetail,
  ProductionLotBatchReception,
  GenerateFruitReceptionRecordRequest,
  SaveSecondaryTransportRequest,
  PRODUCTION_LOT_STATUS_LABELS,
  TRANSFORMATION_STAGE_LABELS,
} from '../models/production-lot.model';
import { TransportInfoRequest } from '../../collection-batches/models/collection-batch.model';

const RECEPTION_DOC_CODE = 'FRUIT_RECEPTION_RECORD' as const;
const TRANSPORT_DOC_CODE = 'TRANSPORT_WAYBILL' as const;

@Component({
  selector: 'app-secondary-lot-detail-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSelectModule,
    MatDividerModule,
    MatChipsModule,
    NgxExtendedPdfViewerModule,
  ],
  templateUrl: './secondary-lot-detail.page.html',
  styleUrl: './secondary-lot-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecondaryLotDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lotsService = inject(ProductionLotsService);
  private azureStorage = inject(AzureStorageService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);

  readonly STATUS_LABELS = PRODUCTION_LOT_STATUS_LABELS;
  readonly TRANSFORMATION_LABELS = TRANSFORMATION_STAGE_LABELS;

  // ─── State ──────────────────────────────────────────────────────────────────
  lot = signal<ProductionLotDetail | null>(null);
  loading = signal(true);

  // PDF panel
  pdfUrl = signal<string | null>(null);
  loadingPdf = signal(false);
  /** Which document's PDF is currently being shown in the left panel */
  activePanel = signal<'reception' | 'transport'>('reception');

  // Reception
  receptions = signal<ProductionLotBatchReception[]>([]);
  loadingReceptions = signal(false);
  expandedReceptionId = signal<string | null>(null);
  generatingDocument = signal(false);
  receptionForms: Record<string, FormGroup> = {};

  // Transport
  savingTransport = signal(false);
  selectedTransportType = signal<'terrestre' | 'fluvial'>('terrestre');

  transportForm: FormGroup = this.fb.group({
    transportType: ['terrestre', Validators.required],
    transporterName: ['', [Validators.required, Validators.maxLength(200)]],
    transporterDocumentType: ['DNI', Validators.required],
    transporterDocumentNumber: ['', [Validators.required, Validators.maxLength(20)]],
    transporterLicense: ['', Validators.maxLength(50)],
    transporterPhone: ['', Validators.maxLength(20)],
    vehiclePlate: ['', Validators.maxLength(20)],
    vehicleType: ['', Validators.maxLength(100)],
    vehicleBrand: ['', Validators.maxLength(100)],
    vehicleModel: ['', Validators.maxLength(100)],
    vehicleCapacityKg: [null, Validators.min(0.01)],
    boatRegistration: ['', Validators.maxLength(50)],
    boatMotorHp: [null, Validators.min(1)],
    originLocation: ['', [Validators.required, Validators.maxLength(200)]],
    destinationLocation: ['', [Validators.required, Validators.maxLength(200)]],
    estimatedDurationHours: [null, Validators.min(0.1)],
    notes: ['', Validators.maxLength(1000)],
    collectionCenterAddress: ['', Validators.maxLength(300)],
    collectionCenterManagerName: ['', Validators.maxLength(200)],
    collectionCenterManagerDni: ['', [Validators.maxLength(20), Validators.pattern(/^\d*$/)]],
    buyerName: ['', Validators.maxLength(200)],
    buyerDocumentType: ['', Validators.maxLength(20)],
    buyerDocumentNumber: ['', Validators.maxLength(20)],
    buyerLegalAddress: ['', Validators.maxLength(300)],
    metadata: ['', Validators.maxLength(2000)],
  });

  // ─── Computed ────────────────────────────────────────────────────────────────
  receptionDocument = computed(
    () => this.lot()?.documents?.find((d) => d.codeDocument === RECEPTION_DOC_CODE) ?? null,
  );

  transportDocument = computed(
    () => this.lot()?.documents?.find((d) => d.codeDocument === TRANSPORT_DOC_CODE) ?? null,
  );

  receptionTotals = computed(() => {
    const list = this.receptions();
    return {
      totalWeight: list.reduce((sum, r) => sum + (r.weightKg ?? 0), 0),
      totalSacks: list.reduce((sum, r) => sum + (r.sacksCount ?? 0), 0),
    };
  });

  isFluvialTransport = computed(() => this.selectedTransportType() === 'fluvial');

  /** Número del lote primario origen (para lotes secundarios) */
  parentLotLabel = computed(() => this.lot()?.sourceLots?.[0]?.sourcePrimaryLotNumber ?? null);

  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const lotId = this.route.snapshot.paramMap.get('lotId');
    if (lotId) this.loadLot(lotId);
  }

  // ─── Data loading ─────────────────────────────────────────────────────────────
  loadLot(id: string): void {
    this.loading.set(true);
    this.lotsService.getLotById(id).subscribe({
      next: (lot) => {
        this.lot.set(lot);
        this.prefillTransportForm(lot);
        this.loadInitialPdf(lot);
        this.loadReceptions(lot.id);
        this.loading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        const msg = error?.error?.message;
        if (msg) this.notification.error(msg);
        this.loading.set(false);
      },
    });
  }

  private prefillTransportForm(lot: ProductionLotDetail): void {
    const ti = lot.transportInfo;
    if (!ti) return;
    this.transportForm.patchValue({
      transportType: ti.transportType ?? 'terrestre',
      transporterName: ti.transporterName ?? '',
      transporterDocumentType: ti.transporterDocumentType ?? 'DNI',
      transporterDocumentNumber: ti.transporterDocumentNumber ?? '',
      transporterLicense: ti.transporterLicense ?? '',
      transporterPhone: ti.transporterPhone ?? '',
      vehiclePlate: ti.vehiclePlate ?? '',
      vehicleType: ti.vehicleType ?? '',
      vehicleBrand: ti.vehicleBrand ?? '',
      vehicleModel: ti.vehicleModel ?? '',
      vehicleCapacityKg: ti.vehicleCapacityKg ?? null,
      boatRegistration: ti.boatRegistration ?? '',
      boatMotorHp: ti.boatMotorHp ?? null,
      originLocation: ti.originLocation ?? '',
      destinationLocation: ti.destinationLocation ?? '',
      estimatedDurationHours: ti.estimatedDurationHours ?? null,
      notes: ti.notes ?? '',
      collectionCenterAddress: ti.collectionCenterAddress ?? '',
      collectionCenterManagerName: ti.collectionCenterManagerName ?? '',
      collectionCenterManagerDni: ti.collectionCenterManagerDni ?? '',
      buyerName: ti.buyerName ?? '',
      buyerDocumentType: ti.buyerDocumentType ?? '',
      buyerDocumentNumber: ti.buyerDocumentNumber ?? '',
      buyerLegalAddress: ti.buyerLegalAddress ?? '',
      metadata: ti.metadata ?? '',
    });
    this.selectedTransportType.set((ti.transportType ?? 'terrestre') as 'terrestre' | 'fluvial');
  }

  private loadInitialPdf(lot: ProductionLotDetail): void {
    // Auto-load reception PDF if already generated; fall back to transport PDF
    const recDoc = lot.documents?.find((d) => d.codeDocument === RECEPTION_DOC_CODE);
    if (recDoc?.blobName) {
      this.activePanel.set('reception');
      this.loadPdf(recDoc.blobName);
      return;
    }
    const trDoc = lot.documents?.find((d) => d.codeDocument === TRANSPORT_DOC_CODE);
    if (trDoc?.blobName) {
      this.activePanel.set('transport');
      this.loadPdf(trDoc.blobName);
    }
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

  loadReceptions(lotId: string): void {
    this.loadingReceptions.set(true);
    this.lotsService.getBatchReceptions(lotId, RECEPTION_DOC_CODE).subscribe({
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

  private initReceptionForms(receptions: ProductionLotBatchReception[]): void {
    this.receptionForms = {};
    for (const r of receptions) {
      this.receptionForms[r.id] = this.fb.group({
        weightKg: [r.weightKg],
        sacksCount: [r.sacksCount],
        observations: [r.observations ?? ''],
      });
    }
  }

  // ─── Reception actions ────────────────────────────────────────────────────────
  getReceptionForm(id: string): FormGroup {
    return this.receptionForms[id];
  }

  toggleReception(id: string): void {
    this.expandedReceptionId.update((current) => (current === id ? null : id));
  }

  saveReception(reception: ProductionLotBatchReception): void {
    const lot = this.lot();
    if (!lot) return;
    this.generatingDocument.set(true);

    const receptions = this.receptions().map((r) => {
      if (r.id === reception.id) {
        const raw = this.receptionForms[r.id]?.getRawValue() ?? {};
        return {
          collectionBatchId: r.collectionBatchId,
          weightKg: (raw['weightKg'] as number) ?? null,
          sacksCount: (raw['sacksCount'] as number) ?? null,
          jabasCount: null,
          observations: (raw['observations'] as string) || null,
        };
      }
      return {
        collectionBatchId: r.collectionBatchId,
        weightKg: r.weightKg ?? null,
        sacksCount: r.sacksCount ?? null,
        jabasCount: null,
        observations: r.observations ?? null,
      };
    });

    const request: GenerateFruitReceptionRecordRequest = { receptions };
    this.lotsService.generateFruitReceptionRecord(lot.id, request).subscribe({
      next: (updatedLot) => {
        this.expandedReceptionId.set(null);
        this.generatingDocument.set(false);
        this.activePanel.set('reception');
        const doc = updatedLot.documents?.find((d) => d.codeDocument === RECEPTION_DOC_CODE);
        this.pdfUrl.set(null);
        if (doc?.blobName) this.loadPdf(doc.blobName);
        this.reloadLot();
        this.notification.success('Ficha de recepción generada correctamente');
      },
      error: (err: { error?: { message?: string } }) => {
        this.generatingDocument.set(false);
        const msg = err?.error?.message;
        this.notification.error(msg ?? 'Error al generar el documento');
      },
    });
  }

  // ─── Transport actions ────────────────────────────────────────────────────────
  onTransportTypeChange(value: 'terrestre' | 'fluvial'): void {
    this.selectedTransportType.set(value);
  }

  saveTransportWaybill(): void {
    if (this.transportForm.invalid) {
      this.transportForm.markAllAsTouched();
      return;
    }
    const lot = this.lot();
    if (!lot) return;
    const fv = this.transportForm.value;

    if (fv.transportType === 'fluvial' && !fv.boatRegistration) {
      this.notification.error('El transporte fluvial requiere matrícula de embarcación');
      return;
    }

    const transportInfo: TransportInfoRequest = {
      transportType: fv.transportType as 'terrestre' | 'fluvial',
      transporterName: (fv.transporterName as string) || '',
      transporterDocumentType: (fv.transporterDocumentType as string) || '',
      transporterDocumentNumber: (fv.transporterDocumentNumber as string) || '',
      transporterLicense: (fv.transporterLicense as string) || undefined,
      transporterPhone: (fv.transporterPhone as string) || undefined,
      vehiclePlate: (fv.vehiclePlate as string) || undefined,
      vehicleType: (fv.vehicleType as string) || undefined,
      vehicleBrand: (fv.vehicleBrand as string) || undefined,
      vehicleModel: (fv.vehicleModel as string) || undefined,
      vehicleCapacityKg: (fv.vehicleCapacityKg as number) ?? undefined,
      boatRegistration:
        fv.transportType === 'fluvial' ? (fv.boatRegistration as string) || undefined : undefined,
      boatMotorHp:
        fv.transportType === 'fluvial' ? ((fv.boatMotorHp as number) ?? undefined) : undefined,
      originLocation: (fv.originLocation as string) || '',
      destinationLocation: (fv.destinationLocation as string) || '',
      estimatedDurationHours: (fv.estimatedDurationHours as number) ?? undefined,
      notes: (fv.notes as string) || undefined,
      collectionCenterAddress: (fv.collectionCenterAddress as string) || undefined,
      collectionCenterManagerName: (fv.collectionCenterManagerName as string) || undefined,
      collectionCenterManagerDni: (fv.collectionCenterManagerDni as string) || undefined,
      buyerName: (fv.buyerName as string) || undefined,
      buyerDocumentType: (fv.buyerDocumentType as string) || undefined,
      buyerDocumentNumber: (fv.buyerDocumentNumber as string) || undefined,
      buyerLegalAddress: (fv.buyerLegalAddress as string) || undefined,
      metadata: (fv.metadata as string) || undefined,
    };

    const request: SaveSecondaryTransportRequest = { transportInfo };
    this.savingTransport.set(true);
    this.lotsService.saveTransportWaybill(lot.id, request).subscribe({
      next: (updatedLot) => {
        this.savingTransport.set(false);
        this.notification.success('Guía de transporte guardada y documento generado');
        this.activePanel.set('transport');
        const doc = updatedLot.documents?.find((d) => d.codeDocument === TRANSPORT_DOC_CODE);
        this.pdfUrl.set(null);
        if (doc?.blobName) {
          this.azureStorage.clearCacheEntry(doc.blobName);
          this.loadPdf(doc.blobName);
        }
        this.reloadLot();
      },
      error: (err: { error?: { message?: string } }) => {
        this.savingTransport.set(false);
        const msg = err?.error?.message;
        this.notification.error(msg ?? 'Error al guardar la guía de transporte');
      },
    });
  }

  // ─── Panel switcher ───────────────────────────────────────────────────────────
  switchPanel(panel: 'reception' | 'transport'): void {
    this.activePanel.set(panel);
    const lot = this.lot();
    if (!lot) return;

    if (panel === 'reception') {
      const doc = lot.documents?.find((d) => d.codeDocument === RECEPTION_DOC_CODE);
      this.pdfUrl.set(null);
      if (doc?.blobName) this.loadPdf(doc.blobName);
    } else {
      const doc = lot.documents?.find((d) => d.codeDocument === TRANSPORT_DOC_CODE);
      this.pdfUrl.set(null);
      if (doc?.blobName) this.loadPdf(doc.blobName);
    }
  }

  // ─── Navigation ───────────────────────────────────────────────────────────────
  goBack(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    this.router.navigate(projectId ? ['/projects', projectId] : ['/projects']);
  }

  goToParentLot(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    const parentLotId = this.lot()?.sourceLots?.[0]?.sourcePrimaryLotId ?? null;
    if (!parentLotId || !projectId) return;
    this.router.navigate(['/projects', projectId, 'production-lots', parentLotId]);
  }

  private reloadLot(): void {
    const id = this.route.snapshot.paramMap.get('lotId');
    if (!id) return;
    this.loadLot(id);
  }

  // ─── Utilities ────────────────────────────────────────────────────────────────
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

  formatFileSize(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
}
