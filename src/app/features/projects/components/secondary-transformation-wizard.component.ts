import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@core/services/notification.service';
import {
  CreateSecondaryProductionLotRequest,
  ProductionLot,
  TransportType,
} from '../models/production-lot.model';
import { TransportInfoRequest } from '../../collection-batches/models/collection-batch.model';
import { ProductionLotsService } from '../services/production-lots.service';

export interface SecondaryTransformationWizardData {
  parentLot: ProductionLot;
}

export interface SecondaryTransformationWizardResult {
  created: true;
  lot: ProductionLot;
}

@Component({
  selector: 'app-secondary-transformation-wizard',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './secondary-transformation-wizard.component.html',
  styleUrl: './secondary-transformation-wizard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecondaryTransformationWizardComponent {
  private dialogRef = inject(MatDialogRef<SecondaryTransformationWizardComponent>);
  readonly data = inject<SecondaryTransformationWizardData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private lotsService = inject(ProductionLotsService);
  private notification = inject(NotificationService);

  currentStep = signal<1 | 2>(1);
  saving = signal(false);

  readonly transportTypes: { value: TransportType; label: string }[] = [
    { value: 'terrestre', label: 'Terrestre' },
    { value: 'fluvial', label: 'Fluvial' },
  ];

  readonly documentTypes = ['DNI', 'CE', 'PASAPORTE', 'RUC'];

  primaryForm = this.fb.group({
    quantity: [this.data.parentLot.quantity ?? null, [Validators.required, Validators.min(0.01)]],
    totalSacksCount: [this.data.parentLot.totalSacksCount ?? null, [Validators.min(1)]],
    totalJabasCount: [this.data.parentLot.totalJabasCount ?? null, [Validators.min(1)]],
    transformationNotes: [
      this.data.parentLot.transformationNotes ?? '',
      [Validators.maxLength(1000)],
    ],
  });

  transportForm = this.fb.group({
    transportType: ['terrestre' as TransportType, Validators.required],
    transporterName: ['', [Validators.required, Validators.maxLength(200)]],
    transporterDocumentType: ['DNI', Validators.required],
    transporterDocumentNumber: ['', [Validators.required, Validators.maxLength(20)]],
    originLocation: ['', [Validators.required, Validators.maxLength(200)]],
    destinationLocation: ['', [Validators.required, Validators.maxLength(200)]],
  });

  goToStep2(): void {
    this.primaryForm.markAllAsTouched();
    if (this.primaryForm.invalid) return;
    this.currentStep.set(2);
  }

  goBackToStep1(): void {
    this.currentStep.set(1);
  }

  close(): void {
    this.dialogRef.close(null);
  }

  createSecondaryLot(): void {
    this.primaryForm.markAllAsTouched();
    this.transportForm.markAllAsTouched();

    if (this.primaryForm.invalid || this.transportForm.invalid || this.saving()) return;

    const primary = this.primaryForm.getRawValue();
    const transport = this.transportForm.getRawValue();

    const transportInfo: TransportInfoRequest = {
      transportType: transport.transportType as TransportType,
      transporterName: (transport.transporterName ?? '').trim(),
      transporterDocumentType: (transport.transporterDocumentType ?? '').trim(),
      transporterDocumentNumber: (transport.transporterDocumentNumber ?? '').trim(),
      originLocation: (transport.originLocation ?? '').trim(),
      destinationLocation: (transport.destinationLocation ?? '').trim(),
    };

    const request: CreateSecondaryProductionLotRequest = {
      parentLotId: this.data.parentLot.id,
      quantity: Number(primary.quantity),
      totalSacksCount: primary.totalSacksCount ? Number(primary.totalSacksCount) : null,
      totalJabasCount: primary.totalJabasCount ? Number(primary.totalJabasCount) : null,
      transformationNotes: primary.transformationNotes?.trim() || null,
      transportInfo,
    };

    this.saving.set(true);
    this.lotsService.createSecondaryLot(request).subscribe({
      next: (lot) => {
        this.saving.set(false);
        this.notification.success('Lote de transformación secundaria creado correctamente');
        this.dialogRef.close({ created: true, lot } satisfies SecondaryTransformationWizardResult);
      },
      error: (error: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.notification.error(
          error?.error?.message ?? 'Error al crear el lote de transformación secundaria',
        );
      },
    });
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
      return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }
}
