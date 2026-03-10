import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { SidebarService } from '@core/services/sidebar.service';
import { NotificationService } from '@core/services/notification.service';
import { CollectionBatchesService } from '../../collection-batches/services/collection-batches.service';
import {
  CollectionBatchLight,
  BATCH_STATUS_LABELS,
  BATCH_STATUS_CLASSES,
} from '../../collection-batches/models/collection-batch.model';
import { ProductionLotsService } from '../../projects/services/production-lots.service';
import { CreatePrimaryProductionLotRequest } from '../models/production-lot-search.model';

export interface PrimaryLotWizardResult {
  created: boolean;
}

@Component({
  selector: 'app-primary-lot-creation-wizard',
  templateUrl: './primary-lot-creation-wizard.component.html',
  styleUrl: './primary-lot-creation-wizard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    MatPaginatorModule,
    MatDividerModule,
  ],
})
export class PrimaryLotCreationWizardComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<PrimaryLotCreationWizardComponent>);
  private lotsService = inject(ProductionLotsService);
  private batchesService = inject(CollectionBatchesService);
  private sidebarService = inject(SidebarService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  // ── Lookup tables ──────────────────────────────────────────────────────────
  readonly BATCH_STATUS_LABELS = BATCH_STATUS_LABELS;
  readonly BATCH_STATUS_CLASSES = BATCH_STATUS_CLASSES;
  readonly year = new Date().getFullYear();

  // ── Step management ────────────────────────────────────────────────────────
  currentStep = signal(1);

  // ── Step 1: batch list + selection ────────────────────────────────────────
  loadingBatches = signal(true);
  allBatches = signal<CollectionBatchLight[]>([]);
  selectedBatchIds = signal<Set<string>>(new Set());
  searchTerm = signal('');
  currentPage = signal(0);
  pageSize = signal(20);
  totalBatches = signal(0);

  filteredBatches = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.allBatches();
    return this.allBatches().filter(
      (b) =>
        b.batchNumber.toLowerCase().includes(term) ||
        (b.productName ?? '').toLowerCase().includes(term) ||
        (b.projectName ?? '').toLowerCase().includes(term) ||
        (b.communityName ?? '').toLowerCase().includes(term),
    );
  });

  selectedBatches = computed(() =>
    this.allBatches().filter((b) => this.selectedBatchIds().has(b.id)),
  );

  totalSelectedWeight = computed(() =>
    this.selectedBatches().reduce((sum, b) => sum + (b.totalWeightKg ?? 0), 0),
  );

  totalSelectedSacks = computed(() =>
    this.selectedBatches().reduce((sum, b) => sum + (b.totalSacks ?? 0), 0),
  );

  // ── Step 2: reception form ─────────────────────────────────────────────────
  receptionForm!: FormGroup;
  expandedBatchIds = signal<Set<string>>(new Set());
  receptionTotals = signal({ weight: 0, sacks: 0, jabas: 0 });

  // ── Step 3: notes ──────────────────────────────────────────────────────────
  notesControl = new FormControl<string | null>(null, Validators.maxLength(1000));

  // ── Saving ─────────────────────────────────────────────────────────────────
  saving = signal(false);

  // ── FormArray accessor ─────────────────────────────────────────────────────
  get entries(): FormArray {
    return this.receptionForm?.get('entries') as FormArray;
  }

  getEntry(i: number): FormGroup {
    return this.entries.at(i) as FormGroup;
  }

  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadBatches();
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  loadBatches(): void {
    const companyId = this.sidebarService.tenantId();
    if (!companyId) {
      this.notification.error('No se pudo identificar la empresa activa');
      this.loadingBatches.set(false);
      return;
    }

    this.loadingBatches.set(true);
    this.batchesService
      .getByCompanyLight(companyId, this.currentPage(), this.pageSize())
      .subscribe({
        next: (res) => {
          this.allBatches.set(res.items ?? []);
          this.totalBatches.set(res.total ?? 0);
          this.loadingBatches.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.notification.error('Error al cargar los lotes de acopio disponibles');
          this.loadingBatches.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadBatches();
  }

  // ── Step 1 interactions ────────────────────────────────────────────────────

  toggleBatch(batch: CollectionBatchLight): void {
    const ids = new Set(this.selectedBatchIds());
    if (ids.has(batch.id)) {
      ids.delete(batch.id);
    } else {
      ids.add(batch.id);
    }
    this.selectedBatchIds.set(ids);
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

  canProceedStep2(): boolean {
    return this.selectedBatchIds().size > 0;
  }

  // ── Step 1 → Step 2 ────────────────────────────────────────────────────────

  goToStep2(): void {
    this.buildReceptionForm();
    // Expand all cards by default for easy editing
    const allIds = new Set(this.selectedBatches().map((b) => b.id));
    this.expandedBatchIds.set(allIds);
    this.updateReceptionTotals();
    this.currentStep.set(2);
  }

  private buildReceptionForm(): void {
    const controls = this.selectedBatches().map((b) =>
      this.fb.group({
        collectionBatchId: [b.id],
        weightKg: [b.totalWeightKg ?? null, [Validators.min(0.01)]],
        sacksCount: [b.totalSacks ?? null, [Validators.min(0)]],
        jabasCount: [b.totalUnits ?? null, [Validators.min(0)]],
        observations: [null as string | null, [Validators.maxLength(500)]],
      }),
    );

    this.receptionForm = this.fb.group({ entries: this.fb.array(controls) });

    // Keep live totals in sync with form changes
    this.receptionForm.valueChanges
      .pipe(debounceTime(100), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateReceptionTotals());
  }

  private updateReceptionTotals(): void {
    const entries: {
      weightKg: number | null;
      sacksCount: number | null;
      jabasCount: number | null;
    }[] = this.entries?.value ?? [];
    const weight = entries.reduce((s, e) => s + (e.weightKg ?? 0), 0);
    const sacks = entries.reduce((s, e) => s + (e.sacksCount ?? 0), 0);
    const jabas = entries.reduce((s, e) => s + (e.jabasCount ?? 0), 0);
    this.receptionTotals.set({ weight, sacks, jabas });
  }

  // ── Step 2 interactions ────────────────────────────────────────────────────

  toggleExpanded(batchId: string): void {
    const ids = new Set(this.expandedBatchIds());
    if (ids.has(batchId)) {
      ids.delete(batchId);
    } else {
      ids.add(batchId);
    }
    this.expandedBatchIds.set(ids);
  }

  isExpanded(batchId: string): boolean {
    return this.expandedBatchIds().has(batchId);
  }

  getBatchByIndex(i: number): CollectionBatchLight | undefined {
    return this.selectedBatches()[i];
  }

  expandAll(): void {
    this.expandedBatchIds.set(new Set(this.selectedBatches().map((b) => b.id)));
  }

  collapseAll(): void {
    this.expandedBatchIds.set(new Set());
  }

  goToStep1(): void {
    this.currentStep.set(1);
  }

  canProceedStep3(): boolean {
    return this.receptionForm?.valid ?? false;
  }

  goToStep3(): void {
    if (this.canProceedStep3()) {
      this.currentStep.set(3);
    } else {
      this.receptionForm.markAllAsTouched();
    }
  }

  goToStep2FromStep3(): void {
    this.currentStep.set(2);
  }

  // ── Step 3 helpers ─────────────────────────────────────────────────────────

  getTotalWeight(): number {
    return (
      this.entries?.value?.reduce(
        (s: number, e: { weightKg: number | null }) => s + (e.weightKg ?? 0),
        0,
      ) ?? 0
    );
  }

  getTotalSacks(): number {
    return (
      this.entries?.value?.reduce(
        (s: number, e: { sacksCount: number | null }) => s + (e.sacksCount ?? 0),
        0,
      ) ?? 0
    );
  }

  getTotalJabas(): number {
    return (
      this.entries?.value?.reduce(
        (s: number, e: { jabasCount: number | null }) => s + (e.jabasCount ?? 0),
        0,
      ) ?? 0
    );
  }

  // ── Create lot ─────────────────────────────────────────────────────────────

  createLot(): void {
    if (this.saving()) return;

    const selected = this.selectedBatches();
    const entries: {
      collectionBatchId: string;
      weightKg: number | null;
      sacksCount: number | null;
      jabasCount: number | null;
      observations: string | null;
    }[] = this.entries.value;

    const request: CreatePrimaryProductionLotRequest = {
      transformationNotes: this.notesControl.value ?? undefined,
      sourceBatches: selected.map((b) => ({
        collectionBatchId: b.id,
        contributedWeightKg: b.totalWeightKg ?? undefined,
        contributedSacksCount: b.totalSacks ?? undefined,
        contributedJabasCount: b.totalUnits ?? undefined,
      })),
      receptions: entries.map((e) => ({
        collectionBatchId: e.collectionBatchId,
        weightKg: e.weightKg ?? undefined,
        sacksCount: e.sacksCount ?? undefined,
        jabasCount: e.jabasCount ?? undefined,
        observations: e.observations ?? undefined,
      })),
    };

    this.saving.set(true);

    this.lotsService.createPrimaryLot(request).subscribe({
      next: () => {
        this.notification.success('Lote de transformación primaria creado correctamente');
        this.dialogRef.close({ created: true } satisfies PrimaryLotWizardResult);
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Error al crear el lote de transformación';
        this.notification.error(msg);
        this.saving.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }

  // ── Formatting helpers ─────────────────────────────────────────────────────

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return date;
    }
  }

  getStatusClass(status: string): string {
    return this.BATCH_STATUS_CLASSES[status as keyof typeof this.BATCH_STATUS_CLASSES] ?? '';
  }
}
