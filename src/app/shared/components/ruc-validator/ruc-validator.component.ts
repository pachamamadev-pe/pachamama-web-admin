import { ChangeDetectionStrategy, Component, output, signal, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  RucValidationService,
  RucValidationResponse,
} from '@shared/services/ruc-validation.service';
import { NotificationService } from '@core/services/notification.service';
import { rucValidator } from '@shared/utils/validators';

export interface RucValidationResult {
  ruc: string;
  businessName?: string;
  tradeName?: string;
  address?: string;
  legalRepresentatives?: string;
  sunatData?: NonNullable<RucValidationResponse['resultado']>;
}

/**
 * Componente reutilizable para validación de RUC con SUNAT
 *
 * @example
 * ```html
 * <app-ruc-validator
 *   [showResetButton]="true"
 *   (rucValidated)="onRucValidated($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-ruc-validator',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    @if (!isValidated()) {
      <!-- Validation Section -->
      <div class="ruc-validation-section">
        <!-- Info Banner -->
        <div class="info-banner">
          <div class="banner-content">
            <mat-icon class="text-secondary">info</mat-icon>
            <div class="banner-text">
              <p class="text-sm font-semibold text-secondary mb-1">Validar RUC con SUNAT</p>
              <p class="text-xs text-neutral-subheading">
                Ingresa el RUC {{ entityType() }} para validar su información ante SUNAT
              </p>
            </div>
          </div>
        </div>

        <!-- RUC Input -->
        <div class="ruc-input-container">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>RUC {{ entityLabel() }}</mat-label>
            <mat-icon matPrefix class="text-secondary">badge</mat-icon>
            <input
              matInput
              [formControl]="rucControl"
              placeholder="Ej: 20123456789"
              maxlength="11"
              [disabled]="isValidating()"
              (keydown.enter)="validateRuc()"
            />
            @if (rucControl.hasError('required') && rucControl.touched) {
              <mat-error>El RUC es obligatorio</mat-error>
            }
            @if (rucControl.hasError('ruc') && rucControl.touched) {
              <mat-error>El RUC debe tener exactamente 11 dígitos numéricos</mat-error>
            }
          </mat-form-field>

          <button
            mat-raised-button
            class="btn-primary validate-btn"
            [disabled]="rucControl.invalid || isValidating()"
            (click)="validateRuc()"
          >
            <span class="button-content">
              @if (isValidating()) {
                <mat-spinner diameter="20" class="inline-spinner"></mat-spinner>
                <span>Validando...</span>
              } @else {
                <mat-icon>search</mat-icon>
                <span>Validar RUC</span>
              }
            </span>
          </button>
        </div>

        <!-- Validation Error -->
        @if (validationError()) {
          <div class="validation-error animate-fade-in">
            <div class="error-banner">
              <mat-icon class="text-red-500">error_outline</mat-icon>
              <div class="error-text">
                <p class="text-sm font-semibold text-red-800">RUC no válido</p>
                <p class="text-xs text-red-600 mt-1">{{ validationError() }}</p>
              </div>
            </div>
          </div>
        }
      </div>
    } @else {
      <!-- Success Banner -->
      <div class="validation-success animate-fade-in">
        <div class="success-banner">
          <mat-icon class="text-secondary">check_circle</mat-icon>
          <div class="success-text">
            <p class="text-sm font-semibold text-secondary mb-1">✓ RUC Validado Exitosamente</p>
            <p class="text-xs text-neutral-subheading">
              {{ successMessage() || 'Información validada con SUNAT correctamente' }}
            </p>
          </div>
          @if (showResetButton()) {
            <button
              mat-icon-button
              class="text-neutral-subheading"
              (click)="resetValidation()"
              matTooltip="Validar otro RUC"
            >
              <mat-icon>edit</mat-icon>
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .ruc-validation-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
    }

    /* Info Banner */
    .info-banner {
      background: #f4fbf6;
      border-left: 4px solid #218358;
      border-radius: 0 8px 8px 0;
      padding: 16px;
    }

    .banner-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .banner-text {
      flex: 1;
    }

    /* RUC Input */
    .ruc-input-container {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .validate-btn {
      min-width: 140px;
      height: 56px;
      flex-shrink: 0;
    }

    .button-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .inline-spinner {
      display: inline-block;
      vertical-align: middle;

      ::ng-deep circle {
        stroke: white !important;
      }
    }

    /* Validation Error */
    .validation-error {
      margin-top: 4px;
    }

    .error-banner {
      background: #fef3f2;
      border-left: 4px solid #dc2626;
      border-radius: 0 8px 8px 0;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .error-text {
      flex: 1;
    }

    /* Success Banner */
    .validation-success {
      margin-bottom: 24px;
    }

    .success-banner {
      background: #f4fbf6;
      border-left: 4px solid #218358;
      border-radius: 0 8px 8px 0;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .success-text {
      flex: 1;
    }

    /* Animations */
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .ruc-input-container {
        flex-direction: column;
        gap: 8px;
      }

      .validate-btn {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RucValidatorComponent {
  private rucValidationService = inject(RucValidationService);
  private notification = inject(NotificationService);

  // Inputs
  /** Tipo de entidad (empresa/comunidad) para personalizar mensajes */
  entityType = input<string>('de la empresa');

  /** Label para el campo RUC */
  entityLabel = input<string>('de la Empresa');

  /** Mostrar botón para resetear validación */
  showResetButton = input<boolean>(true);

  /** Mensaje de éxito personalizado */
  successMessage = input<string>('');

  // Outputs
  /** Emite cuando el RUC es validado exitosamente */
  rucValidated = output<RucValidationResult>();

  /** Emite cuando se resetea la validación */
  validationReset = output<void>();

  // Signals
  isValidating = signal(false);
  isValidated = signal(false);
  validationError = signal<string | null>(null);

  // Form Control
  rucControl = new FormControl('', [Validators.required, rucValidator()]);

  /**
   * Valida el RUC mediante API de SUNAT
   */
  validateRuc(): void {
    if (this.rucControl.invalid) {
      this.rucControl.markAsTouched();
      return;
    }

    const ruc = this.rucControl.value?.trim();
    if (!ruc) {
      return;
    }

    this.isValidating.set(true);
    this.validationError.set(null);

    this.rucValidationService.validateRuc(ruc).subscribe({
      next: (response) => {
        this.isValidating.set(false);

        if (response.estado && response.resultado) {
          this.isValidated.set(true);
          this.notification.success('RUC validado correctamente');

          // Procesar datos de SUNAT
          const sunatData = response.resultado;
          const result: RucValidationResult = {
            ruc: ruc,
            businessName: this.cleanSunatValue(sunatData.razon_social),
            tradeName: this.cleanSunatValue(sunatData.nombre_comercial),
            address: this.cleanSunatValue(sunatData.direccion),
            legalRepresentatives: this.processLegalRepresentatives(
              sunatData.representantes_legales ?? undefined,
            ),
            sunatData: sunatData,
          };

          this.rucValidated.emit(result);
        } else {
          this.validationError.set(response.mensaje || 'No se encontró información para este RUC');
        }
      },
      error: (error) => {
        this.isValidating.set(false);
        console.error('Error validating RUC:', error);
        this.validationError.set(
          'Error al validar el RUC. Por favor, intenta nuevamente o ingresa los datos manualmente.',
        );
      },
    });
  }

  /**
   * Resetea la validación para permitir validar otro RUC
   */
  resetValidation(): void {
    this.isValidated.set(false);
    this.validationError.set(null);
    this.rucControl.reset();
    this.validationReset.emit();
  }

  /**
   * Limpia valores "-" que vienen de SUNAT
   */
  private cleanSunatValue(value: string | undefined): string | undefined {
    if (!value || value === '-') {
      return undefined;
    }
    return value;
  }

  /**
   * Procesa representantes legales (puede ser array o string)
   */
  private processLegalRepresentatives(
    representatives: string | string[] | undefined,
  ): string | undefined {
    if (!representatives) {
      return undefined;
    }

    if (Array.isArray(representatives)) {
      return representatives.join(', ');
    }

    return this.cleanSunatValue(representatives);
  }

  /**
   * Obtiene el valor actual del RUC
   */
  getRucValue(): string {
    return this.rucControl.value || '';
  }

  /**
   * Establece el estado de validación (útil para modo edición)
   */
  setValidated(validated: boolean): void {
    this.isValidated.set(validated);
  }
}
