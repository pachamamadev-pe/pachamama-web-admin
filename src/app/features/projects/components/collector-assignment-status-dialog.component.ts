import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CollectorAssignmentStatus } from '../models/collector-assignment-status.model';

export interface CollectorAssignmentStatusDialogData {
  collectorName: string;
  currentStatus: CollectorAssignmentStatus;
  allowedTransitions: CollectorAssignmentStatus[];
}

export interface CollectorAssignmentStatusDialogResult {
  newStatus: CollectorAssignmentStatus;
  reason: string;
}

@Component({
  selector: 'app-collector-assignment-status-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="title-icon">published_with_changes</mat-icon>
      Cambiar estado de asignación
    </h2>

    <mat-dialog-content class="dialog-content">
      <p class="collector-name">
        Recolector: <strong>{{ data.collectorName }}</strong>
      </p>

      <p class="current-status">Estado actual: {{ getStatusLabel(data.currentStatus) }}</p>

      <form [formGroup]="form" class="status-form">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Nuevo estado</mat-label>
          <mat-select formControlName="newStatus">
            @for (status of data.allowedTransitions; track status) {
              <mat-option [value]="status">{{ getStatusLabel(status) }}</mat-option>
            }
          </mat-select>
          @if (form.controls.newStatus.touched && form.controls.newStatus.invalid) {
            <mat-error>Selecciona un estado válido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Motivo del cambio</mat-label>
          <textarea
            matInput
            formControlName="reason"
            rows="4"
            placeholder="Describe el motivo del cambio de estado"
          ></textarea>
          @if (form.controls.reason.touched && form.controls.reason.hasError('required')) {
            <mat-error>El motivo es obligatorio</mat-error>
          }
          @if (form.controls.reason.touched && form.controls.reason.hasError('minlength')) {
            <mat-error>El motivo debe tener al menos 5 caracteres</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="close()">Cancelar</button>
      <button mat-raised-button class="btn-primary" (click)="submit()">Guardar cambio</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .title-icon {
        color: #218358;
      }

      .dialog-content {
        min-width: 380px;
      }

      .collector-name {
        margin: 0 0 4px 0;
      }

      .current-status {
        margin: 0 0 16px 0;
        font-size: 12px;
        color: #737373;
      }

      .status-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      @media (max-width: 640px) {
        .dialog-content {
          min-width: 0;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorAssignmentStatusDialogComponent {
  private dialogRef = inject(MatDialogRef<CollectorAssignmentStatusDialogComponent>);
  private fb = inject(FormBuilder);

  data = inject<CollectorAssignmentStatusDialogData>(MAT_DIALOG_DATA);

  form = this.fb.group({
    newStatus: [this.data.allowedTransitions[0] ?? null, Validators.required],
    reason: ['', [Validators.required, Validators.minLength(5)]],
  });

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const result: CollectorAssignmentStatusDialogResult = {
      newStatus: this.form.controls.newStatus.value as CollectorAssignmentStatus,
      reason: (this.form.controls.reason.value ?? '').trim(),
    };

    this.dialogRef.close(result);
  }

  getStatusLabel(status: CollectorAssignmentStatus): string {
    const labels: Record<CollectorAssignmentStatus, string> = {
      active: 'Activo',
      inactive: 'Inactivo',
      archived: 'Archivado',
    };

    return labels[status];
  }
}
