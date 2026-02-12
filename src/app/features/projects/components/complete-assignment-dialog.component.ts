import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

export interface CompleteAssignmentDialogData {
  assignmentId: string;
  collectorName: string;
  brigadeName: string;
  startDate: string;
}

export interface CompleteAssignmentDialogResult {
  endDate: string;
  notes?: string;
}

@Component({
  selector: 'app-complete-assignment-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  template: `
    <div class="dialog-container">
      <header class="dialog-header">
        <div class="header-content">
          <div class="header-icon">
            <mat-icon class="text-secondary">event_busy</mat-icon>
          </div>
          <div class="header-text">
            <h2 class="text-title font-bold text-accent-titles">Finalizar asignacion</h2>
            <p class="text-subtitle text-neutral-subheading">
              {{ data.collectorName }} · {{ data.brigadeName }}
            </p>
          </div>
        </div>
        <button mat-icon-button (click)="close()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="dialog-content">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Fecha de fin</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate" [min]="minDate" />
            <mat-datepicker-toggle matSuffix [for]="endPicker" />
            <mat-datepicker #endPicker />
            @if (form.get('endDate')?.hasError('required')) {
              <mat-error>La fecha de fin es requerida</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Notas (opcional)</mat-label>
            <textarea
              matInput
              formControlName="notes"
              rows="3"
              placeholder="Motivo o comentario de cierre"
              maxlength="500"
            ></textarea>
            <mat-hint align="end">{{ form.get('notes')?.value?.length || 0 }}/500</mat-hint>
          </mat-form-field>
        </div>

        <footer class="dialog-footer">
          <button mat-stroked-button type="button" (click)="close()" [disabled]="saving()">
            Cancelar
          </button>
          <button mat-raised-button type="submit" class="btn-primary" [disabled]="form.invalid">
            Finalizar
          </button>
        </footer>
      </form>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 500px;
        max-height: 90vh;
        background: #ffffff;
      }

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 24px;
        border-bottom: 1px solid #e5e5e5;
        background: #f9fafb;
      }

      .header-content {
        display: flex;
        gap: 16px;
        flex: 1;
      }

      .header-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: #fef2f2;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          color: #dc2626;
        }
      }

      .header-text h2 {
        margin: 0;
        font-size: 20px;
      }

      .close-button {
        flex-shrink: 0;
        margin: -8px -8px 0 0;
      }

      .dialog-content {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .full-width {
        width: 100%;
      }

      .dialog-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 12px;
        padding: 16px 24px;
        border-top: 1px solid #e5e5e5;
        background: #f9fafb;
      }

      @media (max-width: 640px) {
        .dialog-container {
          max-width: 100vw;
          max-height: 100vh;
        }

        .dialog-header,
        .dialog-content,
        .dialog-footer {
          padding: 16px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompleteAssignmentDialogComponent {
  data = inject<CompleteAssignmentDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<CompleteAssignmentDialogComponent>);
  private fb = inject(FormBuilder);

  saving = signal(false);
  minDate = new Date(this.data.startDate);

  form = this.fb.group({
    endDate: [null, [Validators.required]],
    notes: ['', [Validators.maxLength(500)]],
  });

  close(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    const endDate = this.toDateString(this.form.get('endDate')?.value);
    const notes = this.form.get('notes')?.value?.trim() || undefined;

    this.dialogRef.close({ endDate, notes } as CompleteAssignmentDialogResult);
  }

  private toDateString(value?: Date | string | null): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
