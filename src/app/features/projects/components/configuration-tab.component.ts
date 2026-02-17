import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { CalculatedFieldsService } from '../services/calculated-fields.service';
import {
  CalculatedField,
  AGGREGATION_TYPE_LABELS,
  AGGREGATION_TYPE_ICONS,
  DomainAttribute,
  RecalculateResponse,
  CreateCalculatedFieldRequest,
  UpdateCalculatedFieldRequest,
} from '../models/calculated-field.model';
import { CalculatedFieldFormDialogComponent } from './calculated-field-form-dialog.component';
/**
 * Componente para configurar columnas calculadas y agregaciones
 */
@Component({
  selector: 'app-configuration-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatTabsModule,
    EmptyStateComponent,
  ],
  templateUrl: './configuration-tab.component.html',
  styleUrl: './configuration-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigurationTabComponent {
  private calculatedFieldsService = inject(CalculatedFieldsService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  // Inputs
  projectId = input.required<string>();
  shouldLoad = input(false);

  // State
  loading = signal(true);
  recalculating = signal(false);
  fields = signal<CalculatedField[]>([]);
  availableAttributes = signal<DomainAttribute[]>([]);
  private hasLoaded = false;

  // Computed: filtrar por scope
  activityFormulas = computed(() =>
    this.fields().filter((f) => f.calculationScope === 'activity' && f.status === 'active'),
  );

  projectAggregations = computed(() =>
    this.fields().filter((f) => f.calculationScope === 'project' && f.status === 'active'),
  );

  // Expose constants for template
  readonly AGGREGATION_TYPE_LABELS = AGGREGATION_TYPE_LABELS;
  readonly AGGREGATION_TYPE_ICONS = AGGREGATION_TYPE_ICONS;

  constructor() {
    // Effect para cargar datos cuando shouldLoad cambia a true
    effect(() => {
      if (this.shouldLoad() && !this.hasLoaded) {
        this.hasLoaded = true;
        this.loadData();
      }
    });
  }

  loadData(): void {
    this.loading.set(true);
    Promise.all([
      this.calculatedFieldsService.getCalculatedFieldsByProject(this.projectId()).toPromise(),
      this.calculatedFieldsService.getAvailableAttributes(this.projectId()).toPromise(),
    ])
      .then(([fields, attributes]) => {
        this.fields.set(fields || []);
        this.availableAttributes.set(attributes || []);
        this.loading.set(false);
      })
      .catch((error) => {
        console.error('Error loading configuration data:', error);
        this.notification.error('Error al cargar configuración');
        this.loading.set(false);
      });
  }

  openCreateFormulaDialog(): void {
    const dialogRef = this.dialog.open(CalculatedFieldFormDialogComponent, {
      width: '100%',
      maxWidth: '700px',
      data: {
        mode: 'create',
        scope: 'activity',
        projectId: this.projectId(),
        availableAttributes: this.availableAttributes(),
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.createField(result);
      }
    });
  }

  openCreateAggregationDialog(): void {
    const dialogRef = this.dialog.open(CalculatedFieldFormDialogComponent, {
      width: '100%',
      maxWidth: '700px',
      data: {
        mode: 'create',
        scope: 'project',
        projectId: this.projectId(),
        availableAttributes: this.availableAttributes(),
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.createField(result);
      }
    });
  }

  openEditDialog(field: CalculatedField): void {
    const dialogRef = this.dialog.open(CalculatedFieldFormDialogComponent, {
      width: '100%',
      maxWidth: '700px',
      data: {
        mode: 'edit',
        scope: field.calculationScope,
        projectId: this.projectId(),
        field: field,
        availableAttributes: this.availableAttributes(),
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.updateField(field.id, result);
      }
    });
  }

  archiveField(field: CalculatedField): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Archivar fórmula?',
        message: `La fórmula "${field.name}" dejará de aplicarse a nuevas actividades. Las actividades ya calculadas mantendrán sus valores.`,
        confirmText: 'Archivar',
        type: 'warning',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.performArchive(field.id);
      }
    });
  }

  recalculateAll(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Recalcular todas las columnas?',
        message:
          'Esto aplicará todas las fórmulas activas a las actividades aprobadas del proyecto. El proceso puede tardar unos minutos.',
        confirmText: 'Recalcular',
        type: 'info',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.performRecalculation();
      }
    });
  }

  private createField(data: CreateCalculatedFieldRequest): void {
    this.calculatedFieldsService.createCalculatedField(data).subscribe({
      next: () => {
        this.notification.success(
          data.calculationScope === 'activity'
            ? 'Fórmula creada correctamente'
            : 'Agregación creada correctamente',
        );
        this.loadData();
      },
      error: (error) => {
        console.error('Error creating field:', error);
        this.notification.error('Error al crear columna calculada');
      },
    });
  }

  private updateField(fieldId: string, data: UpdateCalculatedFieldRequest): void {
    this.calculatedFieldsService.updateCalculatedField(fieldId, data).subscribe({
      next: () => {
        this.notification.success('Columna actualizada correctamente');
        this.loadData();
      },
      error: (error) => {
        console.error('Error updating field:', error);
        this.notification.error('Error al actualizar columna calculada');
      },
    });
  }

  private performArchive(fieldId: string): void {
    this.calculatedFieldsService.archiveCalculatedField(fieldId).subscribe({
      next: () => {
        this.notification.success('Fórmula archivada correctamente');
        this.loadData();
      },
      error: (error) => {
        console.error('Error archiving field:', error);
        this.notification.error('Error al archivar fórmula');
      },
    });
  }

  private performRecalculation(): void {
    this.recalculating.set(true);
    this.notification.info('Recalculando columnas...');

    this.calculatedFieldsService.recalculateProject(this.projectId()).subscribe({
      next: (result: RecalculateResponse) => {
        this.recalculating.set(false);
        this.notification.success(
          `Recálculo completado: ${result.activitiesRecalculated} actividades actualizadas`,
        );
      },
      error: (error) => {
        console.error('Error recalculating:', error);
        this.recalculating.set(false);
        this.notification.error('Error al recalcular columnas');
      },
    });
  }

  getAttributeName(code: string): string {
    const attr = this.availableAttributes().find((a) => a.code === code);
    return attr?.name || code;
  }
}
