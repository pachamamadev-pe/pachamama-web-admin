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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { CollectionBatchesService } from '../services/collection-batches.service';
import { NotificationService } from '@core/services/notification.service';
import {
  AvailableRequest,
  CollectionBatch,
  CreateBatchRequest,
  TransportInfoRequest,
  TransportType,
} from '../models/collection-batch.model';

interface WizardData {
  projectId: string;
}

@Component({
  selector: 'app-batch-creation-wizard',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSelectModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './batch-creation-wizard.component.html',
  styleUrl: './batch-creation-wizard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchCreationWizardComponent implements OnInit {
  private data = inject<WizardData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<BatchCreationWizardComponent>);
  private batchesService = inject(CollectionBatchesService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);

  // ─── Step state ─────────────────────────────────────────────────────────────
  currentStep = signal(1);

  // ─── Step 1: request selection ──────────────────────────────────────────────
  availableRequests = signal<AvailableRequest[]>([]);
  loadingRequests = signal(true);
  selectedRequestId = signal<string | null>(null);
  expandedRequestIds = signal<Set<string>>(new Set());

  // ─── Step 2: form ────────────────────────────────────────────────────────────
  saving = signal(false);
  batchForm: FormGroup = this.fb.group({
    batchDate: [new Date(), Validators.required],
    totalWeightKg: [null, [Validators.required, Validators.min(0.01)]],
    totalSacks: [null, [Validators.required, Validators.min(1)]],
    totalUnits: [null, [Validators.min(1)]],
    notes: ['', Validators.maxLength(1000)],
  });

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
    transportNotes: ['', Validators.maxLength(1000)],
  });

  // ─── Computed ────────────────────────────────────────────────────────────────
  selectedRequests = computed(() => {
    const id = this.selectedRequestId();
    return id ? this.availableRequests().filter((r) => r.requestId === id) : [];
  });

  totalSelectedActivities = computed(() =>
    this.selectedRequests().reduce((sum, r) => sum + r.availableActivitiesCount, 0),
  );

  totalSelectedStumps = computed(() =>
    this.selectedRequests().reduce((sum, r) => sum + r.totalStumpsCount, 0),
  );

  canProceedStep2 = computed(() => this.selectedRequestId() !== null);

  currentTransportType = signal<TransportType>('terrestre');
  isFluvialTransport = computed(() => this.currentTransportType() === 'fluvial');

  /**
   * Formatea una fecha ISO (YYYY-MM-DD) a formato legible en español
   */
  formatPeriodDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAvailableRequests();
  }

  private loadAvailableRequests(): void {
    this.loadingRequests.set(true);
    this.batchesService.getAvailableRequests(this.data.projectId).subscribe({
      next: (requests) => {
        this.availableRequests.set(requests);
        this.loadingRequests.set(false);
      },
      error: () => {
        this.notification.error('Error al cargar solicitudes disponibles');
        this.loadingRequests.set(false);
      },
    });
  }

  // ─── Step 1 actions ──────────────────────────────────────────────────────────
  isSelected(requestId: string): boolean {
    return this.selectedRequestId() === requestId;
  }

  selectRequest(request: AvailableRequest): void {
    if (request.fullyIncludedInOtherBatch) return;
    this.selectedRequestId.set(request.requestId);
  }

  isExpanded(requestId: string): boolean {
    return this.expandedRequestIds().has(requestId);
  }

  toggleExpand(event: Event, requestId: string): void {
    event.stopPropagation();
    const next = new Set(this.expandedRequestIds());
    if (next.has(requestId)) {
      next.delete(requestId);
    } else {
      next.add(requestId);
    }
    this.expandedRequestIds.set(next);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────
  goToStep2(): void {
    if (this.canProceedStep2()) {
      // Pre-cargar unidades con el total de trozas de las solicitudes seleccionadas
      const totalStumps = this.totalSelectedStumps();
      if (totalStumps > 0) {
        this.batchForm.patchValue({ totalUnits: totalStumps });
      }
      this.currentStep.set(2);
    }
  }

  goToStep1(): void {
    this.currentStep.set(1);
  }

  goToStep3(): void {
    if (this.batchForm.valid) {
      this.currentStep.set(3);
    }
  }

  goToStep2FromStep3(): void {
    this.currentStep.set(2);
  }

  onTransportTypeChange(value: TransportType): void {
    this.currentTransportType.set(value);
  }

  // ─── Create batch ────────────────────────────────────────────────────────────
  createBatch(): void {
    if (this.batchForm.invalid || this.transportForm.invalid || this.saving()) return;

    this.saving.set(true);
    const { batchDate, totalWeightKg, totalSacks, totalUnits, notes } = this.batchForm.value;
    const {
      transportType,
      transporterName,
      transporterDocumentType,
      transporterDocumentNumber,
      transporterLicense,
      transporterPhone,
      vehiclePlate,
      vehicleType,
      vehicleBrand,
      vehicleModel,
      vehicleCapacityKg,
      boatRegistration,
      boatMotorHp,
      originLocation,
      destinationLocation,
      estimatedDurationHours,
      transportNotes,
    } = this.transportForm.value;

    const dateStr =
      batchDate instanceof Date ? batchDate.toISOString().split('T')[0] : (batchDate as string);

    const transportInfo: TransportInfoRequest = {
      transportType: transportType as TransportType,
      transporterName: transporterName as string,
      transporterDocumentType: transporterDocumentType as string,
      transporterDocumentNumber: transporterDocumentNumber as string,
      transporterLicense: transporterLicense || undefined,
      transporterPhone: transporterPhone || undefined,
      vehiclePlate: vehiclePlate || undefined,
      vehicleType: vehicleType || undefined,
      vehicleBrand: vehicleBrand || undefined,
      vehicleModel: vehicleModel || undefined,
      vehicleCapacityKg: vehicleCapacityKg || undefined,
      boatRegistration: boatRegistration || undefined,
      boatMotorHp: boatMotorHp || undefined,
      originLocation: originLocation as string,
      destinationLocation: destinationLocation as string,
      estimatedDurationHours: estimatedDurationHours || undefined,
      notes: transportNotes || undefined,
    };

    const request: CreateBatchRequest = {
      projectId: this.data.projectId,
      collectionRequestId: this.selectedRequestId()!,
      batchDate: dateStr,
      totalWeightKg: totalWeightKg as number,
      totalSacks: totalSacks as number,
      totalUnits: totalUnits ? (totalUnits as number) : undefined,
      notes: notes || undefined,
      transportInfo,
    };

    this.batchesService.createBatch(request).subscribe({
      next: (batch: CollectionBatch) => {
        this.saving.set(false);
        this.dialogRef.close({ created: true, batch });
      },
      error: (error: unknown) => {
        console.error('Error creating batch:', error);
        this.notification.error('Error al crear el lote de acopio');
        this.saving.set(false);
      },
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
