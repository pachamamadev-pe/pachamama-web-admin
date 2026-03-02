import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@core/services/notification.service';
import { ProductionLotsService } from '../services/production-lots.service';
import { ProductionLot } from '../models/production-lot.model';
import { TransformationSummaryComponent } from './transformation-summary.component';
import { TransformationEntriesTableComponent } from './transformation-entries-table.component';

/**
 * Tab principal de Transformación Primaria
 * Se muestra desde la etapa 'primary_transformation' en adelante
 */
@Component({
  selector: 'app-primary-transformation-tab',
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    TransformationSummaryComponent,
    TransformationEntriesTableComponent,
  ],
  template: `
    <div class="primary-transformation-container">
      <!-- KPIs por estado -->
      <app-transformation-summary [projectId]="projectId()" [lots]="lots()" />

      <!-- Grid de cards -->
      <app-transformation-entries-table
        [projectId]="projectId()"
        [lots]="lots()"
        [loading]="loading()"
        (lotCreated)="loadLots()"
      />
    </div>
  `,
  styles: [
    `
      .primary-transformation-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 1rem 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrimaryTransformationTabComponent {
  private lotsService = inject(ProductionLotsService);
  private notification = inject(NotificationService);

  projectId = input.required<string>();
  shouldLoad = input<boolean>(false);

  lots = signal<ProductionLot[]>([]);
  loading = signal(false);

  constructor() {
    effect(() => {
      if (this.shouldLoad()) {
        this.loadLots();
      }
    });
  }

  loadLots(): void {
    this.loading.set(true);
    this.lotsService.getLotsByProject(this.projectId(), 0, 100).subscribe({
      next: (response) => {
        this.lots.set(response.items);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading production lots:', error);
        const msg = error?.error?.message;
        if (msg) this.notification.error(msg);
        this.lots.set([]);
        this.loading.set(false);
      },
    });
  }
}
