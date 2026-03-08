import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormArray,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CollectionBatchesService } from '../../collection-batches/services/collection-batches.service';
import {
  CollectionBatchLight,
  BATCH_STATUS_LABELS,
} from '../../collection-batches/models/collection-batch.model';
import { ProductionLotsService } from '../services/production-lots.service';
import { ProductionLot, CreateProductionLotRequest } from '../models/production-lot.model';
import { NotificationService } from '@core/services/notification.service';

export interface ProductionLotWizardData {
  projectId: string;
}

export interface ProductionLotWizardResult {
  created: true;
  lot: ProductionLot;
}

@Component({
  selector: 'app-production-lot-creation-wizard',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
  ],
  templateUrl: './production-lot-creation-wizard.component.html',
  styleUrl: './production-lot-creation-wizard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionLotCreationWizardComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ProductionLotCreationWizardComponent>);
  readonly dialogData: ProductionLotWizardData = inject(MAT_DIALOG_DATA);
  private batchesService = inject(CollectionBatchesService);
  private lotsService = inject(ProductionLotsService);
  private fb = inject(FormBuilder);
  private notification = inject(NotificationService);

  currentStep = signal(1);
  loadingBatches = signal(true);
  saving = signal(false);

  availableBatches = signal<CollectionBatchLight[]>([]);
  selectedBatchIds = signal<Set<string>>(new Set());
  searchTerm = signal('');

  readonly STATUS_LABELS = BATCH_STATUS_LABELS;

  filteredBatches = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const batches = this.availableBatches();
    if (!term) return batches;
    return batches.filter(
      (b) =>
        b.batchNumber.toLowerCase().includes(term) ||
        (b.productName?.toLowerCase().includes(term) ?? false) ||
        (b.communityName?.toLowerCase().includes(term) ?? false) ||
        (b.areaName?.toLowerCase().includes(term) ?? false),
    );
  });

  selectedBatches = computed(() => {
    const ids = this.selectedBatchIds();
    return this.availableBatches().filter((b) => ids.has(b.id));
  });

  canProceedStep2 = computed(() => this.selectedBatchIds().size > 0);

  receptionForm = this.fb.group({
    entries: this.fb.array<FormGroup>([]),
  });

  get entries(): FormArray {
    return this.receptionForm.get('entries') as FormArray;
  }

  getEntry(index: number): FormGroup {
    return this.entries.at(index) as FormGroup;
  }

  ngOnInit(): void {
    this.loadBatches();
  }

  loadBatches(): void {
    this.loadingBatches.set(true);
    this.batchesService.getBatchesByProjectLight(this.dialogData.projectId, 0, 200).subscribe({
      next: (response) => {
        // Excluir borradores — cualquier lote aprobado es válido para transformación
        this.availableBatches.set(response.items.filter((b) => b.status !== 'draft'));
        this.loadingBatches.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        const msg = error?.error?.message;
        if (msg) this.notification.error(msg);
        else this.notification.error('Error al cargar los lotes de acopio');
        this.availableBatches.set([]);
        this.loadingBatches.set(false);
      },
    });
  }

  toggleBatch(batch: CollectionBatchLight): void {
    const current = new Set(this.selectedBatchIds());
    if (current.has(batch.id)) {
      current.delete(batch.id);
    } else {
      current.add(batch.id);
    }
    this.selectedBatchIds.set(current);
  }

  isSelected(id: string): boolean {
    return this.selectedBatchIds().has(id);
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  goToStep2(): void {
    const batches = this.selectedBatches();
    while (this.entries.length > 0) this.entries.removeAt(0);
    batches.forEach((batch) => {
      this.entries.push(
        this.fb.group({
          batchId: [batch.id],
          weightKg: [batch.totalWeightKg > 0 ? batch.totalWeightKg : null, [Validators.min(0.01)]],
          sacksCount: [batch.totalSacks > 0 ? batch.totalSacks : null, [Validators.min(1)]],
          observations: ['', [Validators.maxLength(500)]],
        }),
      );
    });
    this.currentStep.set(2);
  }

  goToStep3(): void {
    this.currentStep.set(3);
  }

  goToStep1(): void {
    this.currentStep.set(1);
  }

  goToStep2FromStep3(): void {
    this.currentStep.set(2);
  }

  close(): void {
    this.dialogRef.close(null);
  }

  getTotalWeight(): number {
    return this.entries.controls.reduce((sum, g) => {
      const val = Number((g as FormGroup).get('weightKg')?.value);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }

  getTotalSacks(): number {
    return this.entries.controls.reduce((sum, g) => {
      const val = Number((g as FormGroup).get('sacksCount')?.value);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }

  getBatchByIndex(index: number): CollectionBatchLight | undefined {
    return this.selectedBatches()[index];
  }

  createLot(): void {
    if (this.saving()) return;
    this.saving.set(true);

    const request: CreateProductionLotRequest = {
      projectId: this.dialogData.projectId,
      sourceCollectionBatchIds: this.selectedBatches().map((b) => b.id),
      receptions: this.entries.controls.map((control) => {
        const g = control as FormGroup;
        const weightKg = g.get('weightKg')?.value as number | null;
        const sacksCount = g.get('sacksCount')?.value as number | null;
        const observations = g.get('observations')?.value as string;
        return {
          collectionBatchId: g.get('batchId')?.value as string,
          weightKg: weightKg ? Number(weightKg) : undefined,
          sacksCount: sacksCount ? Number(sacksCount) : undefined,
          observations: observations || undefined,
        };
      }),
    };

    this.lotsService.createLot(request).subscribe({
      next: (lot) => {
        this.saving.set(false);
        this.notification.success('Lote de producción creado correctamente');
        this.dialogRef.close({ created: true, lot } satisfies ProductionLotWizardResult);
      },
      error: (error: { error?: { message?: string } }) => {
        this.saving.set(false);
        const msg = error?.error?.message;
        if (msg) this.notification.error(msg);
        else this.notification.error('Error al crear el lote de producción');
      },
    });
  }

  formatDate(dateStr: string | null | undefined): string {
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

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      validated: 'badge--validated',
      documents_generated: 'badge--docs',
      pending: 'badge--pending',
      closed: 'badge--closed',
      draft: 'badge--draft',
    };
    return classes[status] ?? '';
  }
}
