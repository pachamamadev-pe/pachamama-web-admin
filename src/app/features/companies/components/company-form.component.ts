import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { Company, LicenseType } from '../models/company.model';
import { CreateCompanyDto } from '../models/create-company.dto';
import { UpdateCompanyDto } from '../models/update-company.dto';
import { CompaniesService } from '../services/companies.service';
import {
  RucValidationService,
  RucValidationResponse,
} from '../../../shared/services/ruc-validation.service';
import { NotificationService } from '@core/services/notification.service';
import { rucValidator } from '../../../shared/utils/validators';

export interface CompanyFormData {
  mode: 'create' | 'edit';
  company?: Company;
}

@Component({
  selector: 'app-company-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="company-form-dialog">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-title font-bold text-accent-titles">
          {{ data.mode === 'create' ? 'Nueva Empresa' : 'Editar Empresa' }}
        </h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      @if (data.mode === 'create') {
        <!-- PASO 1: Validación de RUC (Solo en modo creación) -->
        @if (!rucValidated()) {
          <div class="ruc-validation-section">
            <!-- Info banner -->
            <div class="bg-secondary-light border-l-4 border-secondary p-4 mb-6 rounded-r-lg">
              <div class="flex items-start gap-3">
                <mat-icon class="text-secondary">info</mat-icon>
                <div>
                  <p class="text-sm font-semibold text-secondary mb-1">Paso 1: Validar RUC</p>
                  <p class="text-xs text-neutral-subheading">
                    Ingresa el RUC de la empresa para validar su información ante SUNAT
                  </p>
                </div>
              </div>
            </div>

            <!-- RUC Validation Form -->
            <div class="ruc-input-container">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>RUC de la Empresa</mat-label>
                <mat-icon matPrefix class="text-secondary">badge</mat-icon>
                <input
                  matInput
                  [formControl]="rucControl"
                  placeholder="Ej: 20123456789"
                  maxlength="11"
                  [disabled]="validatingRuc()"
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
                color="primary"
                class="btn-primary validate-btn"
                [disabled]="rucControl.invalid || validatingRuc()"
                (click)="validateRuc()"
              >
                @if (validatingRuc()) {
                  <ng-container>
                    <mat-spinner diameter="20" class="inline-spinner"></mat-spinner>
                    <span class="ml-2">Validando...</span>
                  </ng-container>
                } @else {
                  <ng-container>
                    <mat-icon>search</mat-icon>
                    <span>Validar RUC</span>
                  </ng-container>
                }
              </button>
            </div>

            <!-- Validation Result -->
            @if (validationError()) {
              <div class="validation-error mt-4 animate-fade-in">
                <div
                  class="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg flex items-start gap-3"
                >
                  <mat-icon class="text-red-500">error_outline</mat-icon>
                  <div>
                    <p class="text-sm font-semibold text-red-800">RUC no válido</p>
                    <p class="text-xs text-red-600 mt-1">{{ validationError() }}</p>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- PASO 2: Formulario completo (Después de validación exitosa) -->
        @if (rucValidated()) {
          <div class="validation-success mb-6 animate-fade-in">
            <div
              class="bg-secondary-light border-l-4 border-secondary p-4 rounded-r-lg flex items-start gap-3"
            >
              <mat-icon class="text-secondary">check_circle</mat-icon>
              <div class="flex-1">
                <p class="text-sm font-semibold text-secondary mb-1">✓ RUC Validado Exitosamente</p>
                <p class="text-xs text-neutral-subheading">
                  Hemos completado algunos campos con la información de SUNAT. Verifica y completa
                  los datos restantes.
                </p>
              </div>
              <button
                mat-icon-button
                class="text-neutral-subheading"
                (click)="resetRucValidation()"
                matTooltip="Validar otro RUC"
              >
                <mat-icon>edit</mat-icon>
              </button>
            </div>
          </div>
        }
      }

      <!-- Full Form (Edit mode OR after RUC validation) -->
      @if (data.mode === 'edit' || rucValidated()) {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 animate-slide-down">
          <!-- RUC (Read-only después de validar) -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>RUC</mat-label>
            <mat-icon matPrefix>badge</mat-icon>
            <input
              matInput
              formControlName="ruc"
              placeholder="20123456789"
              maxlength="11"
              [readonly]="data.mode === 'create'"
            />
            @if (form.get('ruc')?.hasError('required')) {
              <mat-error>El RUC es obligatorio</mat-error>
            }
            @if (form.get('ruc')?.hasError('ruc')) {
              <mat-error>El RUC debe tener exactamente 11 dígitos</mat-error>
            }
          </mat-form-field>

          <!-- Razón Social -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Razón Social</mat-label>
            <mat-icon matPrefix>business</mat-icon>
            <input
              matInput
              formControlName="businessName"
              placeholder="Agroindustrias Pachamama S.A.C."
            />
            @if (form.get('businessName')?.hasError('required')) {
              <mat-error>La razón social es obligatoria</mat-error>
            }
            @if (form.get('businessName')?.hasError('minlength')) {
              <mat-error>Debe tener al menos 3 caracteres</mat-error>
            }
          </mat-form-field>

          <!-- Nombre Comercial -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Nombre Comercial (opcional)</mat-label>
            <mat-icon matPrefix>store</mat-icon>
            <input matInput formControlName="tradeName" placeholder="Pachamama" />
          </mat-form-field>

          <!-- Dirección Fiscal -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Dirección Fiscal (opcional)</mat-label>
            <mat-icon matPrefix>location_on</mat-icon>
            <textarea
              matInput
              formControlName="taxAddress"
              placeholder="Av. Principal 123, Distrito, Provincia"
              rows="2"
            ></textarea>
          </mat-form-field>

          <!-- Email de Contacto -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Email de Contacto</mat-label>
            <mat-icon matPrefix>email</mat-icon>
            <input
              matInput
              formControlName="contactEmail"
              type="email"
              placeholder="contacto@empresa.com"
            />
            @if (form.get('contactEmail')?.hasError('required')) {
              <mat-error>El email es obligatorio</mat-error>
            }
            @if (form.get('contactEmail')?.hasError('email')) {
              <mat-error>Ingrese un email válido</mat-error>
            }
          </mat-form-field>

          <!-- Teléfono de Contacto -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Teléfono de Contacto (opcional)</mat-label>
            <mat-icon matPrefix>phone</mat-icon>
            <input matInput formControlName="contactPhone" placeholder="+51 999 999 999" />
          </mat-form-field>

          <!-- Representante Legal -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Representante Legal (opcional)</mat-label>
            <mat-icon matPrefix>person</mat-icon>
            <input matInput formControlName="legalRepresentative" placeholder="Juan Pérez García" />
          </mat-form-field>

          <!-- Tipo de Licencia -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Tipo de Licencia</mat-label>
            <mat-icon matPrefix>workspace_premium</mat-icon>
            <mat-select formControlName="licenseType">
              <mat-option [value]="LicenseType.BASIC">Básica</mat-option>
              <mat-option [value]="LicenseType.PREMIUM">Premium</mat-option>
              <mat-option [value]="LicenseType.ENTERPRISE">Enterprise</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-divider class="my-6"></mat-divider>

          @if (data.mode === 'create') {
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div class="flex">
                <mat-icon class="text-blue-400 mr-2">info</mat-icon>
                <div>
                  <p class="text-sm text-blue-700">
                    <strong>Paso 2 de 2:</strong> Después de crear la empresa, podrás subir los
                    documentos obligatorios.
                  </p>
                  <p class="text-xs text-blue-600 mt-1">
                    La empresa quedará en estado "Pendiente de documentos" hasta completar la carga.
                  </p>
                </div>
              </div>
            </div>
          }

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4">
            <button mat-stroked-button type="button" mat-dialog-close class="btn-secondary">
              Cancelar
            </button>

            <button
              mat-raised-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || submitting()"
              class="btn-primary"
            >
              {{
                submitting()
                  ? 'Guardando...'
                  : data.mode === 'create'
                    ? 'Crear Empresa'
                    : 'Guardar Cambios'
              }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [
    `
      .company-form-dialog {
        padding: 24px;
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        overflow-x: hidden;
        box-sizing: border-box;
      }

      .ruc-validation-section {
        padding: 16px 0;
      }

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

      .validate-btn {
        .mdc-button__label {
          display: flex;
        }
      }

      .inline-spinner {
        display: inline-block;
        vertical-align: middle;
      }

      .inline-spinner ::ng-deep circle {
        stroke: white !important;
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

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
          max-height: 0;
        }
        to {
          opacity: 1;
          transform: translateY(0);
          max-height: 2000px;
        }
      }

      .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
      }

      .animate-slide-down {
        animation: slideDown 0.4s ease-out;
      }

      @media (max-width: 768px) {
        .company-form-dialog {
          padding: 16px;
          max-width: 100%;
          max-height: 100vh;
        }

        .ruc-input-container {
          flex-direction: column;
          gap: 8px;
        }

        .validate-btn {
          width: 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private companiesService = inject(CompaniesService);
  private rucValidationService = inject(RucValidationService);
  private notification = inject(NotificationService);
  private dialogRef = inject(MatDialogRef<CompanyFormComponent>);

  data = inject<CompanyFormData>(MAT_DIALOG_DATA);

  // Signals
  submitting = signal(false);
  validatingRuc = signal(false);
  rucValidated = signal(false);
  validationError = signal<string | null>(null);

  // Forms
  form!: FormGroup;
  rucControl = this.fb.control('', [Validators.required, rucValidator()]);

  // Enum para el template
  readonly LicenseType = LicenseType;

  ngOnInit(): void {
    // En modo edición, inicializar el formulario directamente
    if (this.data.mode === 'edit') {
      this.initForm();
    }
  }

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

    this.validatingRuc.set(true);
    this.validationError.set(null);

    this.rucValidationService.validateRuc(ruc).subscribe({
      next: (response) => {
        this.validatingRuc.set(false);

        if (response.estado && response.resultado) {
          // ✅ RUC válido - Inicializar formulario con datos de SUNAT
          this.rucValidated.set(true);
          this.initFormWithSunatData(response.resultado);
          this.notification.success('RUC validado correctamente');
        } else {
          // ❌ RUC no encontrado
          this.validationError.set(response.mensaje || 'No se encontró información para este RUC');
        }
      },
      error: (error) => {
        this.validatingRuc.set(false);
        console.error('Error validating RUC:', error);
        this.validationError.set(
          'Error al validar el RUC. Por favor, intenta nuevamente o ingresa los datos manualmente.',
        );
      },
    });
  }

  /**
   * Reinicia la validación de RUC para permitir validar otro
   */
  resetRucValidation(): void {
    this.rucValidated.set(false);
    this.validationError.set(null);
    this.rucControl.reset();
    this.form.reset();
  }

  /**
   * Inicializa el formulario con datos de SUNAT después de validación exitosa
   */
  private initFormWithSunatData(sunatData: NonNullable<RucValidationResponse['resultado']>): void {
    // Procesar representantes legales (puede ser array)
    let legalRepresentative = '';
    if (sunatData.representantes_legales && Array.isArray(sunatData.representantes_legales)) {
      legalRepresentative = sunatData.representantes_legales.join(', ');
    } else if (typeof sunatData.representantes_legales === 'string') {
      legalRepresentative = sunatData.representantes_legales;
    }

    // Limpiar valores "-" que vienen de SUNAT
    const cleanValue = (value: string) => (value && value !== '-' ? value : '');

    this.form = this.fb.group({
      ruc: [this.rucControl.value, [Validators.required, rucValidator()]],
      businessName: [
        cleanValue(sunatData.razon_social) || '',
        [Validators.required, Validators.minLength(3)],
      ],
      tradeName: [cleanValue(sunatData.nombre_comercial) || ''],
      taxAddress: [cleanValue(sunatData.direccion) || ''],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: [''],
      legalRepresentative: [cleanValue(legalRepresentative) || ''],
      licenseType: [LicenseType.BASIC],
    });
  }

  /**
   * Genera un código único basado en el nombre de la empresa
   * Formato: XXXX_####
   * - XXXX: Primeras 4 letras del nombre de la empresa (sin espacios, mayúsculas)
   * - ####: 4 números aleatorios
   *
   * Ejemplos:
   * - "Pachamama S.A.C." → "PACH_8472"
   * - "Empresa Demo" → "EMPR_1234"
   */
  private generateCompanyCode(businessName: string): string {
    // Extraer solo letras del nombre de la empresa
    const cleanName = businessName
      .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '') // Quitar espacios, puntos, números
      .toUpperCase()
      .normalize('NFD') // Normalizar para quitar acentos
      .replace(/[\u0300-\u036f]/g, ''); // Eliminar diacríticos

    // Tomar las primeras 4 letras (o menos si el nombre es corto)
    const prefix = cleanName.substring(0, 4).padEnd(4, 'X');

    // Generar 4 números aleatorios
    const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Entre 1000 y 9999

    return `${prefix}_${randomNumbers}`;
  }

  private initForm(): void {
    this.form = this.fb.group({
      ruc: [this.data.company?.ruc || '', [Validators.required, rucValidator()]],
      businessName: [
        this.data.company?.businessName || '',
        [Validators.required, Validators.minLength(3)],
      ],
      tradeName: [this.data.company?.tradeName || ''],
      taxAddress: [this.data.company?.taxAddress || ''],
      contactEmail: [
        this.data.company?.contactEmail || '',
        [Validators.required, Validators.email],
      ],
      contactPhone: [this.data.company?.contactPhone || ''],
      legalRepresentative: [this.data.company?.legalRepresentative || ''],
      licenseType: [this.data.company?.licenseType || LicenseType.BASIC],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    if (this.data.mode === 'create') {
      this.createCompany();
    } else {
      this.updateCompany();
    }
  }

  private createCompany(): void {
    // Generar código automáticamente basado en el nombre de la empresa
    const generatedCode = this.generateCompanyCode(this.form.value.businessName);

    const dto: CreateCompanyDto = {
      code: generatedCode, // ✅ Código generado automáticamente
      ruc: this.form.value.ruc,
      businessName: this.form.value.businessName,
      tradeName: this.form.value.tradeName || undefined,
      taxAddress: this.form.value.taxAddress || undefined,
      contactEmail: this.form.value.contactEmail,
      contactPhone: this.form.value.contactPhone || undefined,
      legalRepresentative: this.form.value.legalRepresentative || undefined,
      licenseType: this.form.value.licenseType,
    };

    this.companiesService.createCompany(dto).subscribe({
      next: (company) => {
        this.submitting.set(false);
        this.dialogRef.close(company);
      },
      error: (error) => {
        console.error('Error creating company:', error);
        this.submitting.set(false);
        // Error handling will be done in the parent component
      },
    });
  }

  private updateCompany(): void {
    if (!this.data.company) {
      return;
    }

    const dto: UpdateCompanyDto = {
      code: this.data.company.code, // ✅ Mantener código existente (no se puede cambiar)
      businessName: this.form.value.businessName,
      tradeName: this.form.value.tradeName || undefined,
      ruc: this.form.value.ruc,
      taxAddress: this.form.value.taxAddress || undefined,
      contactEmail: this.form.value.contactEmail,
      contactPhone: this.form.value.contactPhone || undefined,
      legalRepresentative: this.form.value.legalRepresentative || undefined,
      licenseType: this.form.value.licenseType,
    };

    this.companiesService.updateCompany(this.data.company.id, dto).subscribe({
      next: (company) => {
        this.submitting.set(false);
        this.dialogRef.close(company);
      },
      error: (error) => {
        console.error('Error updating company:', error);
        this.submitting.set(false);
        // Error handling will be done in the parent component
      },
    });
  }
}
