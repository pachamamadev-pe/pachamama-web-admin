import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';

export interface PublishFormDialogResult {
  validFrom: string; // ISO date string YYYY-MM-DD
  validUntil: string; // ISO date string YYYY-MM-DD
}

/**
 * Dialog para capturar fechas de vigencia al publicar un formulario
 */
@Component({
  selector: 'app-publish-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="dialog-icon">publish</mat-icon>
      Publicar Formulario
    </h2>

    <mat-dialog-content>
      <p class="dialog-description text-body text-neutral-subheading mb-4">
        Define el período de vigencia durante el cual este formulario estará activo y disponible
        para su uso.
      </p>

      <div class="date-fields">
        <!-- Fecha desde -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Válido Desde</mat-label>
          <input
            matInput
            [matDatepicker]="pickerFrom"
            [ngModel]="validFrom()"
            (ngModelChange)="validFrom.set($event)"
            [min]="minDate"
            placeholder="Seleccionar fecha de inicio"
            required
          />
          <mat-datepicker-toggle matSuffix [for]="pickerFrom" />
          <mat-datepicker #pickerFrom />
          <mat-icon matIconPrefix>calendar_today</mat-icon>
          <mat-hint>Fecha desde la cual el formulario es válido</mat-hint>
        </mat-form-field>

        <!-- Fecha hasta -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Válido Hasta</mat-label>
          <input
            matInput
            [matDatepicker]="pickerUntil"
            [ngModel]="validUntil()"
            (ngModelChange)="validUntil.set($event)"
            [min]="validFrom() || minDate"
            placeholder="Seleccionar fecha de fin"
            required
          />
          <mat-datepicker-toggle matSuffix [for]="pickerUntil" />
          <mat-datepicker #pickerUntil />
          <mat-icon matIconPrefix>event</mat-icon>
          <mat-hint>Fecha hasta la cual el formulario es válido</mat-hint>
        </mat-form-field>
      </div>

      @if (validationError()) {
        <div class="validation-error">
          <mat-icon>error</mat-icon>
          <span>{{ validationError() }}</span>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancelar</button>
      <button mat-raised-button class="btn-primary" [disabled]="!isFormValid()" (click)="confirm()">
        <mat-icon>publish</mat-icon>
        Publicar
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .dialog-icon {
        vertical-align: middle;
        margin-right: 8px;
        color: var(--secondary);
      }

      .dialog-description {
        margin-bottom: 16px;
      }

      .date-fields {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-top: 16px;
      }

      .full-width {
        width: 100%;
      }

      .validation-error {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        margin-top: 16px;
        background-color: #fee;
        border-left: 4px solid #f44336;
        border-radius: 4px;
        color: #c62828;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        span {
          font-size: 14px;
        }
      }

      mat-dialog-actions {
        padding: 16px 24px;
        margin: 0;
      }

      .btn-primary {
        background-color: var(--secondary);
        color: white;

        &:disabled {
          background-color: #ccc;
          color: #666;
        }
      }
    `,
  ],
})
export class PublishFormDialogComponent {
  private dialogRef = inject(MatDialogRef<PublishFormDialogComponent>);

  // State
  validFrom = signal<Date | null>(null);
  validUntil = signal<Date | null>(null);
  minDate = new Date(); // No permitir fechas pasadas

  // Computed: validación automática
  validationError = computed(() => {
    const from = this.validFrom();
    const until = this.validUntil();

    if (!from && !until) {
      return null; // No mostrar error si ambos están vacíos
    }

    if (!from || !until) {
      return 'Ambas fechas son obligatorias';
    }

    if (from >= until) {
      return 'La fecha "Válido Hasta" debe ser posterior a "Válido Desde"';
    }

    return null;
  });

  /**
   * Verifica si el formulario es válido (sin efectos secundarios)
   */
  isFormValid(): boolean {
    const from = this.validFrom();
    const until = this.validUntil();

    if (!from || !until) {
      return false;
    }

    if (from >= until) {
      return false;
    }

    return true;
  }

  /**
   * Convierte Date a formato ISO (YYYY-MM-DD)
   */
  private formatDateToISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Confirma y cierra el dialog con las fechas
   */
  confirm(): void {
    if (!this.isFormValid()) {
      return;
    }

    const result: PublishFormDialogResult = {
      validFrom: this.formatDateToISO(this.validFrom()!),
      validUntil: this.formatDateToISO(this.validUntil()!),
    };

    this.dialogRef.close(result);
  }

  /**
   * Cancela y cierra el dialog
   */
  cancel(): void {
    this.dialogRef.close();
  }
}
