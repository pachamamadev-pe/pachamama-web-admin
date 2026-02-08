import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CompanyFormService } from '../services/company-form.service';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { NotificationService } from '@core/services/notification.service';
import {
  FormSchemaResponse,
  FormStatus,
  ProjectStage,
  STAGE_LABELS,
  APPLIES_TO_LABELS,
  FormField,
  FormSection,
} from '../models/dynamic-form.model';

export interface FormDetailViewDialogData {
  formId: string;
  version?: number;
}

/**
 * Dialog para visualizar toda la información de un formulario en modo solo lectura
 */
@Component({
  selector: 'app-form-detail-view-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon class="dialog-icon">visibility</mat-icon>
        Vista Detallada del Formulario
        @if (form() && form()!.version) {
          <span class="version-badge">v{{ form()!.version }}</span>
        }
      </h2>
      <button mat-icon-button (click)="close()" class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content>
      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="48" />
          <p class="text-body text-neutral-subheading mt-4">Cargando detalles...</p>
        </div>
      } @else if (form()) {
        <div class="form-detail-container">
          <!-- Información General -->
          <section class="detail-section">
            <h3 class="section-title">
              <mat-icon>info</mat-icon>
              Información General
            </h3>
            <div class="section-content">
              @if (logoUrl()) {
                <div class="logo-container">
                  <img [src]="logoUrl()!" alt="Logo" class="form-logo" />
                </div>
              }

              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Nombre:</span>
                  <span class="info-value">{{ form()!.name }}</span>
                </div>

                @if (form()!.description) {
                  <div class="info-item full-width">
                    <span class="info-label">Descripción:</span>
                    <span class="info-value">{{ form()!.description }}</span>
                  </div>
                }

                <div class="info-item">
                  <span class="info-label">Estado:</span>
                  <mat-chip [class]="getStatusChipClass(form()!.status)">
                    {{ getStatusLabel(form()!.status) }}
                  </mat-chip>
                </div>

                <div class="info-item">
                  <span class="info-label">Versión:</span>
                  <span class="info-value">{{ form()!.version || 1 }}</span>
                </div>

                @if (form()!.validFrom && form()!.validUntil) {
                  <div class="info-item full-width vigency-box">
                    <mat-icon class="vigency-icon">date_range</mat-icon>
                    <div class="vigency-content">
                      <span class="vigency-label">Período de Vigencia</span>
                      <span class="vigency-dates">
                        {{ formatDate(form()!.validFrom!) }} → {{ formatDate(form()!.validUntil!) }}
                      </span>
                      @if (isVigent(form()!.validFrom, form()!.validUntil)) {
                        <mat-chip class="vigency-chip vigent">Vigente</mat-chip>
                      } @else {
                        <mat-chip class="vigency-chip not-vigent">No Vigente</mat-chip>
                      }
                    </div>
                  </div>
                }

                <div class="info-item">
                  <span class="info-label">Etapas Aplicables:</span>
                  <div class="chips-container">
                    @for (stage of form()!.applicableStages; track stage) {
                      <mat-chip class="stage-chip">
                        {{ getStageLabel(stage) }}
                      </mat-chip>
                    }
                  </div>
                </div>

                @if (form()!.projectId) {
                  <div class="info-item">
                    <span class="info-label">Proyecto:</span>
                    <span class="info-value">{{ form()!.projectId }}</span>
                  </div>
                }
              </div>
            </div>
          </section>

          <mat-divider />

          <!-- Formulario Dinámico -->
          <section class="detail-section">
            <h3 class="section-title">
              <mat-icon>dynamic_form</mat-icon>
              Formulario de Preguntas Dinámicas
            </h3>
            <div class="section-content">
              @if (sections().length === 0) {
                <p class="empty-message text-body text-neutral-subheading">
                  No hay secciones configuradas
                </p>
              } @else {
                <div class="sections-container">
                  @for (section of sections(); track $index) {
                    <div class="form-section">
                      <div class="section-header">
                        <h4 class="section-name">{{ section.title }}</h4>
                        <p class="section-type text-body text-neutral-subheading">
                          Tipo:
                          {{
                            section.type === 'protocol_linked' ? 'Vinculado a Protocolo' : 'Libre'
                          }}
                        </p>
                      </div>

                      <div class="fields-list">
                        @for (field of section.fields; track $index) {
                          <div class="field-card">
                            <div class="field-header">
                              <div class="field-title">
                                <mat-icon class="field-icon">{{
                                  getFieldIcon(field.fieldTypeId)
                                }}</mat-icon>
                                <span class="field-label">{{ field.question }}</span>
                                @if (field.isRequired) {
                                  <mat-chip class="required-chip">Obligatorio</mat-chip>
                                }
                              </div>
                              <mat-chip class="type-chip">{{
                                getFieldTypeDisplay(field)
                              }}</mat-chip>
                            </div>

                            @if (field.protocolId && hasAttributeCode(field)) {
                              <div class="field-detail">
                                <mat-icon class="detail-icon">link</mat-icon>
                                <span
                                  ><strong>Protocolo:</strong> {{ getAttributeCode(field) }}</span
                                >
                              </div>
                            }

                            @if (field.appliesTo && field.appliesTo !== 'both') {
                              <div class="field-detail">
                                <mat-icon class="detail-icon">visibility</mat-icon>
                                <span>Aplica a: {{ APPLIES_TO_LABELS[field.appliesTo] }}</span>
                              </div>
                            }

                            @if (hasValidation(field)) {
                              <div class="field-detail validation-detail">
                                <div
                                  style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;"
                                >
                                  <mat-icon class="detail-icon">rule</mat-icon>
                                  <strong style="font-size: 15px; color: #f57f17;"
                                    >Validaciones:</strong
                                  >
                                </div>
                                <div class="validation-list">
                                  @for (
                                    validationKey of getValidationKeys(field.validationConfig);
                                    track validationKey
                                  ) {
                                    <div class="validation-item">
                                      <mat-icon>check_circle</mat-icon>
                                      <span
                                        ><strong>{{ formatValidationKey(validationKey) }}:</strong>
                                        {{
                                          formatValidationValue(
                                            field.validationConfig![validationKey]
                                          )
                                        }}</span
                                      >
                                    </div>
                                  }
                                </div>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </section>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-bottom: 1px solid var(--neutral-border);
      }

      h2[mat-dialog-title] {
        display: flex;
        align-items: center;
        margin: 0;
        font-size: 20px;
      }

      .dialog-icon {
        margin-right: 8px;
        color: var(--secondary);
      }

      .version-badge {
        margin-left: 12px;
        padding: 4px 12px;
        background-color: var(--secondary-light);
        color: var(--secondary);
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
      }

      .close-button {
        margin-right: -8px;
      }

      mat-dialog-content {
        min-width: 800px;
        max-width: 1000px;
        max-height: 85vh;
        overflow-y: auto;
        padding: 0;
      }

      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px 20px;
      }

      .form-detail-container {
        padding: 32px 40px;
      }

      .detail-section {
        margin-bottom: 40px;

        &:last-child {
          margin-bottom: 0;
        }
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 20px;
        font-weight: 600;
        color: var(--accent-titles);
        margin-bottom: 24px;

        mat-icon {
          color: var(--secondary);
          font-size: 28px;
          width: 28px;
          height: 28px;
        }
      }

      .section-content {
        padding-left: 12px;
      }

      .logo-container {
        margin-bottom: 32px;
        text-align: center;
        padding: 20px;
        background: #fafafa;
        border-radius: 12px;
      }

      .form-logo {
        max-width: 280px;
        max-height: 160px;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 8px;

        &.full-width {
          grid-column: 1 / -1;
        }
      }

      .info-label {
        font-weight: 600;
        color: var(--neutral-subheading);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }

      .info-value {
        color: var(--accent-titles);
        font-size: 16px;
        font-weight: 500;
      }

      .vigency-box {
        padding: 20px;
        background: var(--secondary-light);
        border-radius: 12px;
        border-left: 4px solid var(--secondary);
      }

      .vigency-icon {
        color: var(--secondary);
        margin-right: 16px;
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .vigency-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
      }

      .vigency-label {
        font-weight: 600;
        color: var(--secondary);
        font-size: 15px;
      }

      .vigency-dates {
        color: var(--accent-titles);
        font-size: 16px;
        font-weight: 500;
      }

      .vigency-chip {
        align-self: flex-start;
        font-size: 12px;
        min-height: 26px;
        padding: 0 12px;
        margin-top: 6px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;

        &.vigent {
          background-color: #4caf50;
          color: white;
        }

        &.not-vigent {
          background-color: #f5f5f5;
          color: #616161;
        }
      }

      .chips-container {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .stage-chip {
        font-size: 13px;
        min-height: 32px;
        padding: 0 14px;
        background-color: #e3f2fd;
        color: #1976d2;
        font-weight: 600;
      }

      .status-published {
        background-color: #e8f5e9;
        color: #2e7d32;
        font-weight: 600;
        font-size: 13px;
        min-height: 32px;
        padding: 0 14px;
      }

      .status-draft {
        background-color: #fff3e0;
        color: #e65100;
        font-weight: 600;
        font-size: 13px;
        min-height: 32px;
        padding: 0 14px;
      }

      .status-archived {
        background-color: #f5f5f5;
        color: #616161;
        font-weight: 600;
        font-size: 13px;
        min-height: 32px;
        padding: 0 14px;
      }

      mat-divider {
        margin: 40px 0;
      }

      .sections-container {
        display: flex;
        flex-direction: column;
        gap: 32px;
      }

      .form-section {
        padding: 28px;
        background: var(--secondary-light);
        border-radius: 12px;
        border-left: 4px solid var(--secondary);
      }

      .section-header {
        margin-bottom: 20px;
      }

      .section-name {
        font-size: 18px;
        font-weight: 600;
        color: var(--accent-titles);
        margin: 0 0 6px 0;
      }

      .section-type {
        margin: 0;
        font-size: 14px;
        font-weight: 500;
      }

      .section-description {
        margin: 0;
        font-size: 14px;
      }

      .fields-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .field-card {
        padding: 24px;
        background: white;
        border-radius: 12px;
        border: 1px solid var(--neutral-border);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        transition: all 0.2s ease;

        &:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border-color: var(--secondary-light);
        }
      }

      .field-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
        gap: 12px;
      }

      .field-title {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        flex: 1;
      }

      .field-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--secondary);
        flex-shrink: 0;
        margin-top: 2px;
      }

      .field-label {
        font-weight: 600;
        color: var(--accent-titles);
        font-size: 17px;
        line-height: 1.5;
        flex: 1;
      }

      .field-detail {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-top: 12px;
        padding: 12px;
        background: #f5f5f5;
        border-radius: 8px;
        font-size: 14px;
        color: var(--accent-titles);
        font-weight: 500;

        .detail-icon {
          font-size: 22px;
          width: 22px;
          height: 22px;
          color: var(--secondary);
          flex-shrink: 0;
          margin-top: 2px;
        }

        &.validation-detail {
          flex-direction: column;
          padding: 16px;
          background: #fffde7;
          border-left: 4px solid #fbc02d;
        }
      }

      .required-chip {
        font-size: 11px;
        min-height: 24px;
        padding: 0 10px;
        background-color: #ffebee;
        color: #c62828;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .type-chip {
        font-size: 12px;
        min-height: 28px;
        padding: 0 12px;
        background-color: #e3f2fd;
        color: #1565c0;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .options-list,
      .validation-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-left: 32px;
      }

      .option-chip {
        font-size: 13px;
        min-height: 32px;
        padding: 0 14px;
        background-color: #e8eaf6;
        color: #3f51b5;
        font-weight: 500;
      }

      .validation-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 8px;
      }

      .validation-item {
        padding: 10px 14px;
        background-color: white;
        border: 1px solid #f9a825;
        border-radius: 6px;
        font-size: 14px;
        color: var(--accent-titles);
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;

        mat-icon {
          color: #f57f17;
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .empty-message {
        text-align: center;
        padding: 40px 20px;
      }

      mat-dialog-actions {
        padding: 16px 24px;
        border-top: 1px solid var(--neutral-border);
      }

      @media (max-width: 768px) {
        mat-dialog-content {
          min-width: unset;
          width: 100%;
        }

        .info-grid {
          grid-template-columns: 1fr;
        }

        .field-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
      }
    `,
  ],
})
export class FormDetailViewDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<FormDetailViewDialogComponent>);
  private companyFormService = inject(CompanyFormService);
  private azureStorage = inject(AzureStorageService);
  private notification = inject(NotificationService);
  data = inject<FormDetailViewDialogData>(MAT_DIALOG_DATA);

  // Estado
  loading = signal(true);
  form = signal<FormSchemaResponse | null>(null);
  logoUrl = signal<string | null>(null);
  sections = signal<FormSection[]>([]);

  // Constantes para template
  STAGE_LABELS = STAGE_LABELS;
  APPLIES_TO_LABELS = APPLIES_TO_LABELS;

  ngOnInit(): void {
    this.loadFormDetail();
  }

  /**
   * Carga el detalle del formulario
   */
  private loadFormDetail(): void {
    this.loading.set(true);
    this.companyFormService.getFormById(this.data.formId).subscribe({
      next: (response) => {
        this.form.set(response);

        // Cargar logo si existe
        if (response.customLogoUrl) {
          this.azureStorage.getFileUrl(response.customLogoUrl, 5).subscribe({
            next: (url) => this.logoUrl.set(url),
            error: (error) => console.error('Error cargando logo:', error),
          });
        }

        // Parsear schema
        if (response.schema) {
          try {
            const schema = JSON.parse(response.schema);
            const rawSections = schema.sections || [];

            // Mapear campos del backend (snake_case) a nuestro modelo (camelCase)
            const mappedSections: FormSection[] = rawSections.map((section: unknown) => {
              const sec = section as Record<string, unknown>;
              return {
                title: sec['name'],
                type: sec['type'],
                fields: ((sec['fields'] as unknown[]) || []).map((field: unknown) => {
                  const fld = field as Record<string, unknown>;
                  return {
                    question: fld['question'],
                    fieldTypeId: fld['id_field_type'] || fld['field_type'],
                    fieldType: fld['field_type'], // Guardar el tipo legible
                    isRequired: fld['required'],
                    protocolId: fld['id_protocol'] || null,
                    attributeCode: fld['attribute_code'], // Para mostrar en lugar del ID
                    appliesTo: fld['applies_to'],
                    validationConfig: fld['validationOptions'] || null,
                    displayOrder: fld['display_order'],
                  };
                }),
              };
            });

            this.sections.set(mappedSections);
            console.log('📋 Sections parseadas:', this.sections());
            // Log detallado de cada field
            this.sections().forEach((section, idx) => {
              console.log(`📁 Section ${idx}:`, section.title, '| Type:', section.type);
              section.fields?.forEach((field, fIdx) => {
                console.log(`  📝 Field ${fIdx}:`, {
                  question: field.question,
                  fieldTypeId: field.fieldTypeId,
                  isRequired: field.isRequired,
                  protocolId: field.protocolId,
                  appliesTo: field.appliesTo,
                  validationConfig: field.validationConfig,
                });
              });
            });
          } catch (error) {
            console.error('Error parseando schema:', error);
          }
        }

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando formulario:', error);
        const message = error?.error?.message || 'Error al cargar el formulario';
        this.notification.error(message);
        this.loading.set(false);
        this.close();
      },
    });
  }

  /**
   * Obtiene el label de una etapa
   */
  getStageLabel(stage: string): string {
    const stageKey = stage.toLowerCase() as ProjectStage;
    return STAGE_LABELS[stageKey] || stage;
  }

  /**
   * Obtiene el icono según el tipo de campo
   */
  getFieldIcon(type: string): string {
    const icons: Record<string, string> = {
      text: 'text_fields',
      number: 'numbers',
      email: 'email',
      phone: 'phone',
      date: 'calendar_today',
      select: 'arrow_drop_down_circle',
      radio: 'radio_button_checked',
      checkbox: 'check_box',
      textarea: 'notes',
      file: 'attach_file',
      image: 'image',
    };
    return icons[type] || 'help_outline';
  }

  /**
   * Obtiene el label amigable del tipo de campo
   */
  getFieldTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      text: 'Texto',
      number: 'Número',
      email: 'Correo',
      phone: 'Teléfono',
      date: 'Fecha',
      select: 'Selección',
      radio: 'Opción única',
      checkbox: 'Casillas',
      textarea: 'Texto largo',
      file: 'Archivo',
      image: 'Imagen',
    };
    return labels[type] || type;
  }

  /**
   * Obtiene el tipo de campo para mostrar (usa fieldType si existe, sino el label del ID)
   */
  getFieldTypeDisplay(field: FormField): string {
    const fieldWithType = field as unknown as Record<string, unknown>;
    return (fieldWithType['fieldType'] as string) || this.getFieldTypeLabel(field.fieldTypeId);
  }

  /**
   * Verifica si el campo tiene attributeCode
   */
  hasAttributeCode(field: FormField): boolean {
    return !!(field as unknown as Record<string, unknown>)['attributeCode'];
  }

  /**
   * Obtiene el attributeCode del campo
   */
  getAttributeCode(field: FormField): string {
    return ((field as unknown as Record<string, unknown>)['attributeCode'] as string) || '';
  }

  /**
   * Verifica si el campo tiene validaciones
   */
  hasValidation(field: FormField): boolean {
    const config = field.validationConfig;
    if (!config) return false;
    return Object.keys(config).length > 0;
  }

  /**
   * Obtiene las claves de validación de forma dinámica
   */
  getValidationKeys(config: Record<string, unknown> | null | undefined): string[] {
    if (!config) return [];
    return Object.keys(config).filter((key) => {
      const value = config[key];
      // Filtrar valores null, undefined o strings vacíos
      return value !== null && value !== undefined && value !== '';
    });
  }

  /**
   * Formatea el nombre de la clave de validación a un label amigable
   */
  formatValidationKey(key: string): string {
    const labels: Record<string, string> = {
      min: 'Mínimo',
      max: 'Máximo',
      step: 'Incremento',
      decimals: 'Decimales',
      pattern: 'Patrón',
      minLength: 'Longitud mínima',
      maxLength: 'Longitud máxima',
      min_length: 'Longitud mínima',
      max_length: 'Longitud máxima',
      max_files: 'Máx. archivos',
      max_size_mb: 'Tamaño máx. (MB)',
      allowed_formats: 'Formatos permitidos',
      max_duration_seconds: 'Duración máx. (segundos)',
    };
    return labels[key] || key;
  }

  /**
   * Formatea el valor de validación para mostrarlo correctamente
   */
  formatValidationValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    return String(value);
  }

  /**
   * Verifica si un formulario está vigente
   */
  isVigent(validFrom: string | null, validUntil: string | null): boolean {
    if (!validFrom || !validUntil) return false;
    const now = new Date();
    const from = new Date(validFrom);
    const until = new Date(validUntil);
    return now >= from && now <= until;
  }

  /**
   * Formatea fecha
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /**
   * Obtiene el chip de estado con color
   */
  getStatusChipClass(status: FormStatus): string {
    const classes: Record<FormStatus, string> = {
      published: 'status-published',
      draft: 'status-draft',
      archived: 'status-archived',
    };
    return classes[status] || '';
  }

  /**
   * Obtiene label del estado
   */
  getStatusLabel(status: FormStatus): string {
    const labels: Record<FormStatus, string> = {
      published: 'Publicado',
      draft: 'Borrador',
      archived: 'Archivado',
    };
    return labels[status] || status;
  }

  /**
   * Cierra el dialog
   */
  close(): void {
    this.dialogRef.close();
  }
}
