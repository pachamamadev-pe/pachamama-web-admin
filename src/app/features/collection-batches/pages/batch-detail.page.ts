import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDialog } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { CollectionBatchesService } from '../services/collection-batches.service';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { parseDateValue } from '@shared/utils/date-helpers';
import {
  CollectionBatch,
  BatchDocumentType,
  BatchDocumentStatus,
  CollectorSummary,
  CollectorsRegisterData,
  OriginCertificateData,
  TransportInfoRequest,
  TransportWaybillData,
  AuthorizationType,
  UnitOfMeasure,
  CertificateProvenance,
  BATCH_STATUS_LABELS,
  BATCH_DOCUMENT_STATUS_LABELS,
  BATCH_DOCUMENT_TYPE_LABELS,
} from '../models/collection-batch.model';

interface DocumentTabState {
  type: BatchDocumentType;
  label: string;
  icon: string;
  status: BatchDocumentStatus;
  pdfUrl?: string;
  observationNotes?: string;
}

@Component({
  selector: 'app-batch-detail-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatTooltipModule,
    MatChipsModule,
    MatDividerModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatStepperModule,
    NgxExtendedPdfViewerModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './batch-detail.page.html',
  styleUrl: './batch-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private batchesService = inject(CollectionBatchesService);
  private notification = inject(NotificationService);
  private azureStorage = inject(AzureStorageService);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);

  // ─── State ──────────────────────────────────────────────────────────────────
  batch = signal<CollectionBatch | null>(null);
  loading = signal(true);
  submitting = signal(false);
  savingDoc = signal<BatchDocumentType | null>(null);
  generatingDoc = signal<BatchDocumentType | null>(null);
  selectedDocTab = signal(0);
  selectedTransportType = signal<'terrestre' | 'fluvial'>('terrestre');

  /** URLs resueltas de Azure Storage para mostrar PDFs (key = BatchDocumentType) */
  pdfUrls = signal<Partial<Record<BatchDocumentType, string>>>({});

  // ─── Document states ─────────────────────────────────────────────────────────
  documents = signal<DocumentTabState[]>([
    {
      type: 'collectors-register',
      label: 'Registro de Recolectores',
      icon: 'group',
      status: 'not_started',
    },
    {
      type: 'transport-permit',
      label: 'Permiso de Transporte',
      icon: 'assignment',
      status: 'not_started',
    },
    {
      type: 'transport-info',
      label: 'Información de Transportista',
      icon: 'local_shipping',
      status: 'not_started',
    },
  ]);

  // ─── Forms ──────────────────────────────────────────────────────────────────

  /** Documento 1 — Ficha de Registro de Manejo */
  handlingRecordForm: FormGroup = this.fb.group({
    contract: ['', Validators.maxLength(200)],
    startDate: [null as Date | null],
    endDate: [null as Date | null],
    collectors: this.fb.array([]),
  });

  get collectorsArray(): FormArray {
    return this.handlingRecordForm.get('collectors') as FormArray;
  }

  getCollectorGroup(index: number): FormGroup {
    return this.collectorsArray.at(index) as FormGroup;
  }

  /** Documento 2 — Certificado de Procedencia (OriginCertificateSaveRequest) */
  originCertForm: FormGroup = this.fb.group({
    // 1. Destinatario
    recipientName: ['', [Validators.required, Validators.maxLength(150)]],
    recipientPosition: ['', [Validators.required, Validators.maxLength(150)]],
    anpName: ['', [Validators.required, Validators.maxLength(150)]],
    requestDate: [new Date() as Date | null, Validators.required],
    // 2. Solicitante
    applicantFullName: ['', [Validators.required, Validators.maxLength(200)]],
    applicantDni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    organizationName: ['', [Validators.required, Validators.maxLength(150)]],
    organizationPosition: ['', [Validators.required, Validators.maxLength(100)]],
    // 3. Derecho otorgado
    authorizationType: [null as string | null, Validators.required],
    resolutionNumber: ['', Validators.maxLength(100)],
    yearsPeriod: [null as number | null, [Validators.min(1), Validators.max(99)]],
    validityStart: [null as Date | null],
    validityEnd: [null as Date | null],
    // 4. Recurso
    sector: ['', Validators.maxLength(150)],
    internalLocation: ['', Validators.maxLength(200)],
    resourceName: ['', Validators.maxLength(150)],
    harvestedQuantity: [null as number | null, Validators.min(0)],
    unitOfMeasure: ['kilos' as string | null],
    // 5. Declaraciones
    paymentMade: [false],
    recordSheetsAttached: [false],
  });

  /** Documento 3 — Información de Transportista (pre-filled from batch) */
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
  readonly BATCH_STATUS_LABELS = BATCH_STATUS_LABELS;
  readonly BATCH_DOCUMENT_STATUS_LABELS = BATCH_DOCUMENT_STATUS_LABELS;
  readonly BATCH_DOCUMENT_TYPE_LABELS = BATCH_DOCUMENT_TYPE_LABELS;

  /** Número de documentos generados (según los flags del batch) */
  generatedDocsCount = computed(() => {
    const b = this.batch();
    if (!b) return 0;
    return [
      b.handlingRecordGenerated,
      b.originCertificateGenerated,
      b.transportWaybillGenerated,
    ].filter(Boolean).length;
  });

  /** El lote se puede enviar si los 3 documentos están generados y está en draft */
  allDocsGenerated = computed(() => {
    const b = this.batch();
    return (
      !!b?.handlingRecordGenerated &&
      !!b?.originCertificateGenerated &&
      !!b?.transportWaybillGenerated
    );
  });

  /** El lote está en modo solo lectura (formularios y botones de guardar ocultos) */
  isReadOnly = computed(
    () =>
      this.batch()?.status === 'pending' ||
      this.batch()?.status === 'validated' ||
      this.batch()?.status === 'closed' ||
      this.batch()?.status === 'documents_generated',
  );

  /** Puede mostrar el botón de finalizar generación: docs generados y estado draft */
  canFinalizeDocuments = computed(
    () => this.batch()?.status === 'draft' && this.allDocsGenerated(),
  );

  /** Recolectores del resumen de actividades (para Doc 1) */
  collectorsFromBatch = computed(() => this.batch()?.activitiesByCollector?.collectors ?? []);

  /** Tipo de transporte activo para mostrar campos condicionales */
  activeTransportType = computed(() => this.selectedTransportType());
  isFluvialTransport = computed(() => this.activeTransportType() === 'fluvial');

  // ─── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const batchId = this.route.snapshot.paramMap.get('batchId');
    if (!batchId) {
      this.notification.error('ID de lote no encontrado');
      this.goBack();
      return;
    }
    this.loadBatch(batchId);
  }

  onDocumentTabChange(index: number): void {
    this.selectedDocTab.set(index);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('resize'));
      }
    }, 80);
  }

  onTransportTypeChange(value: 'terrestre' | 'fluvial'): void {
    this.selectedTransportType.set(value);
  }

  // ─── Data loading ────────────────────────────────────────────────────────────
  private loadBatch(id: string): void {
    this.loading.set(true);
    this.batchesService.getBatchById(id).subscribe({
      next: (batch) => {
        this.batch.set(batch);
        this.prefillTransportForm(batch);
        this.initDocumentStatuses(batch);
        this.prefillHandlingRecordDates(batch);
        this.prefillOriginCertForm(batch);
        this.buildCollectorsArray(batch.activitiesByCollector?.collectors ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading batch:', err);
        this.notification.error('Error al cargar el lote de acopio');
        this.loading.set(false);
        this.goBack();
      },
    });
  }

  /** Pre-rellena el formulario de transporte con los datos ya guardados en el lote */
  private prefillTransportForm(batch: CollectionBatch): void {
    const ti = batch.transportInfo;
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

    // If transport info is already saved, mark doc 3 as in_progress
    this.updateDocumentStatus('transport-info', 'in_progress');
  }

  /** Inicializa los estados de documentos desde los flags booleanos del batch */
  private initDocumentStatuses(batch: CollectionBatch): void {
    if (batch.handlingRecordGenerated) {
      this.updateDocumentStatus('collectors-register', 'generated');
    }
    if (batch.originCertificateGenerated) {
      this.updateDocumentStatus('transport-permit', 'generated');
    }
    if (batch.transportWaybillGenerated) {
      this.updateDocumentStatus('transport-info', 'generated');
    }
    // Pre-load SAS URL for HANDLING_RECORD_FORM if already generated
    const handlingDoc = batch.documents?.find((d) => d.codeDocument?.includes('HANDLING_RECORD'));
    const handlingDocPath = this.getDocumentBlobPath(handlingDoc);
    if (handlingDocPath) {
      this.azureStorage.getFileUrl(handlingDocPath).subscribe({
        next: (sasUrl) => {
          this.pdfUrls.update((urls) => ({ ...urls, 'collectors-register': sasUrl }));
        },
        error: () => console.warn('No se pudo cargar el PDF de la ficha de registro'),
      });
    }
    // Pre-load SAS URL for ORIGIN_CERTIFICATE if already generated
    const originDoc = batch.documents?.find((d) => d.codeDocument?.includes('ORIGIN_CERTIFICATE'));
    const originDocPath = this.getDocumentBlobPath(originDoc);
    if (originDocPath) {
      this.azureStorage.getFileUrl(originDocPath).subscribe({
        next: (sasUrl) => {
          this.pdfUrls.update((urls) => ({ ...urls, 'transport-permit': sasUrl }));
        },
        error: () => console.warn('No se pudo cargar el PDF del certificado de procedencia'),
      });
    }

    // Pre-load SAS URL for TRANSPORT_WAYBILL if already generated
    const waybillDoc = batch.documents?.find((d) => d.codeDocument?.includes('TRANSPORT_WAYBILL'));
    const waybillDocPath = this.getDocumentBlobPath(waybillDoc);
    if (waybillDocPath) {
      this.azureStorage.getFileUrl(waybillDocPath).subscribe({
        next: (sasUrl) => {
          this.pdfUrls.update((urls) => ({ ...urls, 'transport-info': sasUrl }));
        },
        error: () => console.warn('No se pudo cargar el PDF de la guía de transporte'),
      });
    }
  }

  /** Pre-rellena el formulario Doc 1 (contrato, fechas) desde metadata del lote y solicitud */
  private prefillHandlingRecordDates(batch: CollectionBatch): void {
    const meta = batch.metadata;
    const patch: Partial<{ contract: string; startDate: Date; endDate: Date }> = {};

    // Contrato: desde metadata si está disponible
    if (meta?.['contract'] && typeof meta['contract'] === 'string') {
      patch.contract = meta['contract'];
    }

    // Fecha inicio: prefiere metadata, si no requestStartDate
    const metaStart = meta?.['startDate'];
    if (metaStart && typeof metaStart === 'string') {
      patch.startDate = parseDateValue(metaStart) ?? undefined;
    } else if (batch.requestStartDate) {
      patch.startDate = parseDateValue(batch.requestStartDate) ?? undefined;
    }

    // Fecha fin: prefiere metadata, si no requestEndDate
    const metaEnd = meta?.['endDate'];
    if (metaEnd && typeof metaEnd === 'string') {
      patch.endDate = parseDateValue(metaEnd) ?? undefined;
    } else if (batch.requestEndDate) {
      patch.endDate = parseDateValue(batch.requestEndDate) ?? undefined;
    }

    if (Object.keys(patch).length > 0) {
      this.handlingRecordForm.patchValue(patch);
    }
  }

  /** Pre-rellena el formulario del Certificado de Procedencia desde los datos del lote */
  private prefillOriginCertForm(batch: CollectionBatch): void {
    const cert: CertificateProvenance | undefined = batch.certificateProvenance;
    if (cert) {
      // Pre-fill all fields from the saved certificateProvenance object
      this.originCertForm.patchValue({
        recipientName: cert.recipientName ?? '',
        recipientPosition: cert.recipientPosition ?? '',
        anpName: cert.anpName ?? '',
        requestDate: cert.requestDate ? (parseDateValue(cert.requestDate) ?? null) : null,
        applicantFullName: cert.applicantFullName ?? '',
        applicantDni: cert.applicantDni ?? '',
        organizationName: cert.organizationName ?? '',
        organizationPosition: cert.organizationPosition ?? '',
        authorizationType: cert.authorizationType ?? null,
        resolutionNumber: cert.resolutionNumber ?? '',
        yearsPeriod: cert.yearsPeriod ?? null,
        validityStart: cert.validityStart ? (parseDateValue(cert.validityStart) ?? null) : null,
        validityEnd: cert.validityEnd ? (parseDateValue(cert.validityEnd) ?? null) : null,
        sector: cert.sector ?? '',
        internalLocation: cert.internalLocation ?? '',
        resourceName: cert.resourceName ?? '',
        harvestedQuantity: cert.harvestedQuantity ?? null,
        unitOfMeasure: cert.unitOfMeasure ?? 'kilos',
        paymentMade: cert.paymentMade ?? false,
        recordSheetsAttached: cert.recordSheetsAttached ?? false,
      });
    } else {
      // No saved certificate yet — pre-fill from batch data as defaults
      this.originCertForm.patchValue({
        organizationName: batch.communityName ?? '',
        resourceName: batch.productName ?? '',
        harvestedQuantity: batch.totalWeightKg ?? null,
        unitOfMeasure: 'kilos',
      });
    }
  }

  /** Construye el FormArray de recolectores desde la lista de CollectorSummary */
  private buildCollectorsArray(collectors: CollectorSummary[]): void {
    const fa = this.collectorsArray;
    fa.clear();
    for (const c of collectors) {
      fa.push(
        this.fb.group({
          collectorId: [c.collectorId],
          collectorName: [c.collectorName],
          brigadeName: [c.brigadeName],
          activitiesCount: [c.activitiesCount],
          bunchesCount: [c.bunchesCount ?? (null as number | null), Validators.min(0)],
          weightKg: [c.estimatedWeightKg ?? (null as number | null), Validators.min(0)],
          sacksCount: [c.sacksCount ?? (null as number | null), Validators.min(0)],
          species: [c.species ?? '', Validators.maxLength(200)],
          pricePerSack: [c.sackPrice ?? (null as number | null), Validators.min(0)],
          observations: [c.notes ?? '', Validators.maxLength(500)],
        }),
      );
    }
  }

  // ─── Document status helpers ─────────────────────────────────────────────────
  updateDocumentStatus(
    type: BatchDocumentType,
    status: BatchDocumentStatus,
    pdfUrl?: string,
  ): void {
    this.documents.update((docs) =>
      docs.map((d) => (d.type === type ? { ...d, status, pdfUrl } : d)),
    );
  }

  getDocumentState(type: BatchDocumentType): DocumentTabState {
    return this.documents().find((d) => d.type === type)!;
  }

  private getDocumentBlobPath(
    doc: { blobName?: string; blobUrl?: string } | undefined,
  ): string | null {
    return doc?.blobName ?? null;
  }

  // ─── Document actions ────────────────────────────────────────────────────────

  saveCollectorsRegister(): void {
    if (this.handlingRecordForm.invalid) {
      this.handlingRecordForm.markAllAsTouched();
      return;
    }
    const batch = this.batch()!;
    const fv = this.handlingRecordForm.value;
    const startDate = fv.startDate ? this.formatDateForApi(fv.startDate as Date) : '';
    const endDate = fv.endDate ? this.formatDateForApi(fv.endDate as Date) : '';

    if (!fv.contract || !startDate || !endDate) {
      this.notification.error('Contrato, fecha inicio y fecha fin son requeridos');
      return;
    }

    const data: CollectorsRegisterData = {
      batchId: batch.id,
      contract: fv.contract as string,
      startDate,
      endDate,
      collectors: this.collectorsArray.controls.map((ctrl) => {
        const g = ctrl as FormGroup;
        return {
          collectorId: g.value.collectorId as string,
          bunchesCount: (g.value.bunchesCount as number) ?? undefined,
          estimatedWeightKg: (g.value.weightKg as number) ?? undefined,
          sacksCount: (g.value.sacksCount as number) ?? undefined,
          species: (g.value.species as string) || undefined,
          sackPrice: (g.value.pricePerSack as number) ?? undefined,
          notes: (g.value.observations as string) || undefined,
        };
      }),
    };

    this.savingDoc.set('collectors-register');
    this.batchesService.saveHandlingRecord(batch.id, data).subscribe({
      next: (updatedBatch) => {
        this.batch.set(updatedBatch);
        this.refreshDocumentFlags(updatedBatch);
        this.notification.success('Ficha de registro guardada y documento generado');
        this.savingDoc.set(null);
        const doc = updatedBatch.documents?.find((d) =>
          d.codeDocument?.includes('HANDLING_RECORD'),
        );
        const docPath = this.getDocumentBlobPath(doc);
        if (docPath) {
          // Invalidar caché y forzar remontaje del viewer con la nueva URL
          this.azureStorage.clearCacheEntry(docPath);
          this.pdfUrls.update((urls) => ({ ...urls, 'collectors-register': '' }));
          this.azureStorage.getFileUrl(docPath).subscribe({
            next: (sasUrl) => {
              this.pdfUrls.update((urls) => ({ ...urls, 'collectors-register': sasUrl }));
            },
            error: () =>
              this.notification.error('Documento generado pero no se pudo cargar el PDF'),
          });
        }
      },
      error: (err) => {
        console.error(err);
        this.savingDoc.set(null);
      },
    });
  }

  saveOriginCertificate(): void {
    if (this.originCertForm.invalid) {
      this.originCertForm.markAllAsTouched();
      return;
    }
    const batch = this.batch()!;
    const fv = this.originCertForm.value;

    const data: OriginCertificateData = {
      batchId: batch.id,
      recipientName: (fv.recipientName as string) || undefined,
      recipientPosition: (fv.recipientPosition as string) || undefined,
      anpName: (fv.anpName as string) || undefined,
      requestDate: fv.requestDate ? this.formatDateForApi(fv.requestDate as Date) : undefined,
      applicantFullName: (fv.applicantFullName as string) || undefined,
      applicantDni: (fv.applicantDni as string) || undefined,
      organizationName: (fv.organizationName as string) || undefined,
      organizationPosition: (fv.organizationPosition as string) || undefined,
      authorizationType: (fv.authorizationType as AuthorizationType) || undefined,
      resolutionNumber: (fv.resolutionNumber as string) || undefined,
      yearsPeriod: (fv.yearsPeriod as number) ?? undefined,
      validityStart: fv.validityStart ? this.formatDateForApi(fv.validityStart as Date) : undefined,
      validityEnd: fv.validityEnd ? this.formatDateForApi(fv.validityEnd as Date) : undefined,
      sector: (fv.sector as string) || undefined,
      internalLocation: (fv.internalLocation as string) || undefined,
      resourceName: (fv.resourceName as string) || undefined,
      harvestedQuantity: (fv.harvestedQuantity as number) ?? undefined,
      unitOfMeasure: (fv.unitOfMeasure as UnitOfMeasure) || undefined,
      paymentMade: fv.paymentMade as boolean,
      recordSheetsAttached: fv.recordSheetsAttached as boolean,
    };

    this.savingDoc.set('transport-permit');
    this.batchesService.saveOriginCertificate(batch.id, data).subscribe({
      next: (updatedBatch) => {
        this.batch.set(updatedBatch);
        this.refreshDocumentFlags(updatedBatch);
        this.notification.success('Certificado de procedencia guardado y documento generado');
        this.savingDoc.set(null);
        const doc = updatedBatch.documents?.find((d) =>
          d.codeDocument?.includes('ORIGIN_CERTIFICATE'),
        );
        const docPath = this.getDocumentBlobPath(doc);
        if (docPath) {
          // Invalidar caché y forzar remontaje del viewer con la nueva URL
          this.azureStorage.clearCacheEntry(docPath);
          this.pdfUrls.update((urls) => ({ ...urls, 'transport-permit': '' }));
          this.azureStorage.getFileUrl(docPath).subscribe({
            next: (sasUrl) => {
              this.pdfUrls.update((urls) => ({ ...urls, 'transport-permit': sasUrl }));
            },
            error: () =>
              this.notification.error('Documento generado pero no se pudo cargar el PDF'),
          });
        }
      },
      error: (err) => {
        console.error(err);
        this.savingDoc.set(null);
      },
    });
  }

  saveTransportWaybill(): void {
    if (this.transportForm.invalid) {
      this.transportForm.markAllAsTouched();
      return;
    }

    const batch = this.batch()!;
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

    const data: TransportWaybillData = {
      batchId: batch.id,
      transportInfo,
    };

    this.savingDoc.set('transport-info');
    this.batchesService.saveTransportWaybill(batch.id, data).subscribe({
      next: (updatedBatch) => {
        this.batch.set(updatedBatch);
        this.refreshDocumentFlags(updatedBatch);
        this.notification.success('Guía de transporte guardada y documento generado');
        this.savingDoc.set(null);
        const doc = updatedBatch.documents?.find((d) =>
          d.codeDocument?.includes('TRANSPORT_WAYBILL'),
        );
        const docPath = this.getDocumentBlobPath(doc);
        if (docPath) {
          // Invalidar caché y forzar remontaje del viewer con la nueva URL
          this.azureStorage.clearCacheEntry(docPath);
          this.pdfUrls.update((urls) => ({ ...urls, 'transport-info': '' }));
          this.azureStorage.getFileUrl(docPath).subscribe({
            next: (sasUrl) => {
              this.pdfUrls.update((urls) => ({ ...urls, 'transport-info': sasUrl }));
            },
            error: () =>
              this.notification.error('Documento generado pero no se pudo cargar el PDF'),
          });
        }
      },
      error: (err) => {
        console.error(err);
        this.savingDoc.set(null);
      },
    });
  }

  generateDocument(type: BatchDocumentType): void {
    const batchId = this.batch()!.id;
    this.generatingDoc.set(type);
    this.batchesService.generateDocument(batchId, type).subscribe({
      next: () => {
        this.updateDocumentStatus(type, 'generated');
        this.notification.success('Documento generado correctamente');
        this.generatingDoc.set(null);
      },
      error: (err) => {
        console.error(err);
        this.generatingDoc.set(null);
      },
    });
  }

  // ─── Finalize documents ───────────────────────────────────────────────────────
  confirmFinalizeDocuments(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Finalizar generación de documentos?',
        message:
          'Una vez finalizado, no podrás editar ningún documento del lote. Esta acción es permanente.',
        confirmText: 'Finalizar',
        type: 'warning',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.finalizeDocumentsGenerated();
      }
    });
  }

  private finalizeDocumentsGenerated(): void {
    this.submitting.set(true);
    const batchId = this.batch()!.id;
    this.batchesService.markDocumentsGenerated(batchId).subscribe({
      next: () => {
        this.batchesService.getBatchById(batchId).subscribe({
          next: (updated) => {
            this.batch.set(updated);
            this.notification.success(
              'Documentos finalizados. El lote ya no puede ser modificado.',
            );
            this.submitting.set(false);
          },
          error: () => this.submitting.set(false),
        });
      },
      error: (err) => {
        console.error(err);
        this.submitting.set(false);
      },
    });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────
  goBack(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.router.navigate(['/projects', projectId]);
    } else {
      this.router.navigate(['/projects']);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Actualiza los flags de estado de documentos sin lanzar llamadas Azure */
  private refreshDocumentFlags(batch: CollectionBatch): void {
    if (batch.handlingRecordGenerated)
      this.updateDocumentStatus('collectors-register', 'generated');
    if (batch.originCertificateGenerated)
      this.updateDocumentStatus('transport-permit', 'generated');
    if (batch.transportWaybillGenerated) this.updateDocumentStatus('transport-info', 'generated');
  }

  formatDate(dateString: string): string {
    const date = parseDateValue(dateString);
    if (!date) return '-';
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  private formatDateForApi(date: Date | string): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      draft: 'status-draft',
      pending: 'status-pending',
      validated: 'status-validated',
      closed: 'status-closed',
      documents_generated: 'status-documents-generated',
    };
    return map[status] ?? 'status-draft';
  }

  getDocStatusClass(status: BatchDocumentStatus): string {
    const map: Record<BatchDocumentStatus, string> = {
      not_started: 'doc-status--not-started',
      in_progress: 'doc-status--in-progress',
      generated: 'doc-status--generated',
      observed: 'doc-status--observed',
      approved: 'doc-status--approved',
    };
    return map[status];
  }

  getDocStatusIcon(status: BatchDocumentStatus): string {
    const map: Record<BatchDocumentStatus, string> = {
      not_started: 'radio_button_unchecked',
      in_progress: 'pending',
      generated: 'check_circle',
      observed: 'warning',
      approved: 'verified',
    };
    return map[status];
  }
}
