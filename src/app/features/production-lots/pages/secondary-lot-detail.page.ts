import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { ProductionLotsService } from '../../projects/services/production-lots.service';
import { NotificationService } from '@core/services/notification.service';
import {
  ProductionLotDetail,
  ProductionLotSourceLot,
  SecondaryReceptionRecordRequest,
  SaveSecondaryTransportRequest,
  PRODUCTION_LOT_STATUS_LABELS,
  TRANSFORMATION_STAGE_LABELS,
} from '../../projects/models/production-lot.model';
import { TransportInfoRequest } from '../../collection-batches/models/collection-batch.model';
import {
  ProductionLotLocationMapDialogComponent,
  ProductionLotLocationDialogData,
} from '../components/production-lot-location-map-dialog.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

const RECEPTION_DOC_CODE = 'FRUIT_RECEPTION_RECORD' as const;
const TRANSPORT_DOC_CODE = 'TRANSPORT_WAYBILL' as const;

@Component({
  selector: 'app-secondary-lot-detail-company-page',
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
    MatStepperModule,
    MatDialogModule,
    DecimalPipe,
    NgxExtendedPdfViewerModule,
  ],
  templateUrl: './secondary-lot-detail.page.html',
  styleUrl: './secondary-lot-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecondaryLotDetailCompanyPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lotsService = inject(ProductionLotsService);
  private azureStorage = inject(AzureStorageService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  readonly STATUS_LABELS = PRODUCTION_LOT_STATUS_LABELS;
  readonly TRANSFORMATION_LABELS = TRANSFORMATION_STAGE_LABELS;

  // ─── Estado ──────────────────────────────────────────────────────────────────
  lot = signal<ProductionLotDetail | null>(null);
  loading = signal(true);

  // PDF
  pdfUrl = signal<string | null>(null);
  loadingPdf = signal(false);
  activePanel = signal<'reception' | 'transport'>('reception');

  // Lotes fuente (edición de contribuciones)
  expandedSourceLotId = signal<string | null>(null);
  generatingDocument = signal(false);
  sourceLotForms: Record<string, FormGroup> = {};

  // Modal de lotes fuente
  showSourceLotsModal = signal(false);

  // Transporte
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
  sourceLots = computed(() => this.lot()?.sourceLots ?? []);

  receptionDocument = computed(
    () => this.lot()?.documents?.find((d) => d.codeDocument === RECEPTION_DOC_CODE) ?? null,
  );

  transportDocument = computed(
    () => this.lot()?.documents?.find((d) => d.codeDocument === TRANSPORT_DOC_CODE) ?? null,
  );

  receptionTotals = computed(() => {
    const list = this.sourceLots();
    return {
      totalWeight: list.reduce((sum, s) => sum + (s.contributedWeightKg ?? 0), 0),
      totalSacks: list.reduce((sum, s) => sum + (s.contributedSacksCount ?? 0), 0),
      totalJabas: list.reduce((sum, s) => sum + (s.contributedJabasCount ?? 0), 0),
    };
  });

  isFluvialTransport = computed(() => this.selectedTransportType() === 'fluvial');

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

  // ─── Ciclo de vida ───────────────────────────────────────────────────────────
  ngOnInit(): void {
    const lotId = this.route.snapshot.paramMap.get('id');
    if (lotId) this.loadLot(lotId);
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────────
  loadLot(id: string): void {
    this.loading.set(true);
    this.lotsService.getLotById(id).subscribe({
      next: (lot) => {
        this.lot.set(lot);
        this.initSourceLotForms(lot.sourceLots ?? []);
        this.prefillTransportForm(lot);
        this.loadInitialPdf(lot);
        this.loading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        const msg = error?.error?.message;
        if (msg) this.notification.error(msg);
        this.loading.set(false);
      },
    });
  }

  private initSourceLotForms(sourceLots: ProductionLotSourceLot[]): void {
    this.sourceLotForms = {};
    for (const s of sourceLots) {
      this.sourceLotForms[s.id] = this.fb.group({
        contributedWeightKg: [s.contributedWeightKg, [Validators.min(0)]],
        contributedSacksCount: [s.contributedSacksCount, [Validators.min(0)]],
        contributedJabasCount: [s.contributedJabasCount, [Validators.min(0)]],
        observations: [s.observations ?? '', Validators.maxLength(500)],
      });
    }
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

  // ─── Acciones de lotes fuente (recepción secundaria) ─────────────────────────
  getSourceLotForm(id: string): FormGroup {
    return this.sourceLotForms[id];
  }

  toggleSourceLot(id: string): void {
    this.expandedSourceLotId.update((current) => (current === id ? null : id));
  }

  saveSecondaryReception(): void {
    const lot = this.lot();
    if (!lot || !this.sourceLots().length) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Generar ficha de recepción?',
        message:
          'Una vez generado el documento ya no podrás editar la información de recepción. ¿Deseas continuar?',
        confirmText: 'Generar documento',
        type: 'warning',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.doGenerateReception(lot);
    });
  }

  private doGenerateReception(lot: ProductionLotDetail): void {
    this.generatingDocument.set(true);

    const requests: SecondaryReceptionRecordRequest[] = this.sourceLots().map((s) => {
      const raw = this.sourceLotForms[s.id]?.getRawValue() ?? {};
      return {
        productionLotId: lot.id,
        sourcePrimaryLotId: s.sourcePrimaryLotId,
        quantity: Number(raw['contributedWeightKg'] ?? s.contributedWeightKg ?? 0),
        totalSacksCount:
          raw['contributedSacksCount'] != null ? Number(raw['contributedSacksCount']) : null,
        totalJabasCount:
          raw['contributedJabasCount'] != null ? Number(raw['contributedJabasCount']) : null,
        transformationNotes: (raw['observations'] as string)?.trim() || null,
      };
    });

    this.lotsService.generateSecondaryFruitReceptionRecord(lot.id, requests).subscribe({
      next: (updatedLot) => {
        this.expandedSourceLotId.set(null);
        this.generatingDocument.set(false);
        this.activePanel.set('reception');
        const doc = updatedLot.documents?.find((d) => d.codeDocument === RECEPTION_DOC_CODE);
        this.pdfUrl.set(null);
        if (doc?.blobName) this.loadPdf(doc.blobName);
        this.reloadLot();
        this.notification.success('Ficha de recepción secundaria generada correctamente');
      },
      error: (err: { error?: { message?: string } }) => {
        this.generatingDocument.set(false);
        const msg = err?.error?.message;
        this.notification.error(msg ?? 'Error al generar el documento de recepción');
      },
    });
  }

  // ─── Modal de lotes fuente ────────────────────────────────────────────────────
  openSourceLotsModal(): void {
    this.showSourceLotsModal.set(true);
  }

  closeSourceLotsModal(): void {
    this.showSourceLotsModal.set(false);
  }

  navigateToSourceLot(sourcePrimaryLotId: string): void {
    this.closeSourceLotsModal();
    this.router.navigate(['/production-lots', sourcePrimaryLotId]);
  }

  // ─── Acciones de transporte ───────────────────────────────────────────────────
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

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Generar guía de transporte?',
        message:
          'Una vez generado el documento ya no podrás editar la información de transporte. ¿Deseas continuar?',
        confirmText: 'Generar documento',
        type: 'warning',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.doSaveTransport(lot, fv);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private doSaveTransport(lot: ProductionLotDetail, fv: any): void {
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

  // ─── Cambio de panel ─────────────────────────────────────────────────────────
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
  // ─── Navegación ───────────────────────────────────────────────────────────────
  goBack(): void {
    this.router.navigate(['/production-lots']);
  }

  // ─── Privados ─────────────────────────────────────────────────────────────────
  private reloadLot(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loadLot(id);
  }

  // ─── Utilidades ───────────────────────────────────────────────────────────────
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
