import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { CollectionBatchesService } from '../services/collection-batches.service';
import { NotificationService } from '@core/services/notification.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { CollectionBatch, BATCH_STATUS_LABELS } from '../models/collection-batch.model';
import { parseDateValue } from '@shared/utils/date-helpers';
import { BatchCreationWizardComponent } from './batch-creation-wizard.component';
import { BatchLocationMapDialogComponent } from './batch-location-map-dialog.component';

/**
 * Tab de lotes de acopio
 * Muestra un grid de cards con los lotes del proyecto
 */
@Component({
  selector: 'app-collection-batches-tab',
  imports: [
    CommonModule,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    EmptyStateComponent,
  ],
  templateUrl: './collection-batches-tab.component.html',
  styleUrl: './collection-batches-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionBatchesTabComponent {
  private batchesService = inject(CollectionBatchesService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  // Inputs
  projectId = input.required<string>();
  shouldLoad = input(false);

  // State
  batches = signal<CollectionBatch[]>([]);
  loading = signal(false);

  // Labels
  readonly BATCH_STATUS_LABELS = BATCH_STATUS_LABELS;

  constructor() {
    effect(() => {
      if (this.shouldLoad()) {
        this.loadBatches();
      }
    });
  }

  /**
   * Carga los lotes de acopio del proyecto
   */
  loadBatches(): void {
    this.loading.set(true);
    const projectId = this.projectId();

    this.batchesService.getBatchesByProject(projectId, 0, 100).subscribe({
      next: (response) => {
        this.batches.set(response.items);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading batches:', error);
        this.notification.error('Error al cargar lotes de acopio');
        this.batches.set([]);
        this.loading.set(false);
      },
    });
  }

  /**
   * Abre el wizard para crear un nuevo lote
   */
  openCreateBatchDialog(): void {
    const dialogRef = this.dialog.open(BatchCreationWizardComponent, {
      width: '100%',
      maxWidth: '680px',
      height: '85vh',
      maxHeight: '720px',
      disableClose: true,
      data: { projectId: this.projectId() },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.created) {
        this.notification.success(`Lote ${result.batch.batchNumber} creado correctamente`);
        this.loadBatches();
      }
    });
  }

  /**
   * Obtiene la clase CSS según el estado del lote
   */
  getBatchStatusClass(status: string): string {
    const classMap: Record<string, string> = {
      draft: 'status-draft',
      pending: 'status-pending',
      validated: 'status-validated',
      closed: 'status-closed',
      documents_generated: 'status-documents-generated',
    };
    return classMap[status] || 'status-draft';
  }

  /**
   * Formatea una fecha para mostrar
   */
  formatDate(dateString: string): string {
    const date = parseDateValue(dateString);
    if (!date) return '-';
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /**
   * Abre el dialog de mapa con la ubicación del lote
   */
  openLocationDialog(event: Event, batch: CollectionBatch): void {
    event.stopPropagation();
    if (!batch.location) return;
    this.dialog.open(BatchLocationMapDialogComponent, {
      width: '100%',
      maxWidth: '560px',
      data: {
        batchNumber: batch.batchNumber,
        location: batch.location,
      },
    });
  }

  /**
   * Abre el detalle de un lote navegando a la ruta de detalle
   */
  openBatchDetail(batch: CollectionBatch): void {
    this.router.navigate(['/projects', this.projectId(), 'batches', batch.id]);
  }
}
