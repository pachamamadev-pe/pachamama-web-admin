import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentTypesService } from '@core/services/document-types.service';
import { NotificationService } from '@core/services/notification.service';
import { DocumentType } from '@shared/models/document-type.model';
import { getProjectWorkflowStageLabel } from '../../projects/models/project-stages.constants';

export interface CreateModeResult {
  mode: 'blank' | 'template';
  template?: DocumentType;
}

/**
 * Diálogo para seleccionar el modo de creación de tipo de documento:
 * - Usar plantilla global de Pachamama
 * - Crear desde cero
 */
@Component({
  selector: 'app-document-type-create-mode-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="dialog-container">
      <!-- Header -->
      <div class="dialog-header">
        <h2 class="dialog-title">Crear tipo de documento</h2>
        <button mat-icon-button class="close-button" (click)="close()" aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        @if (!showTemplates()) {
          <!-- Opciones iniciales -->
          <div class="options-container">
            <p class="text-subtitle text-neutral-subheading mb-6">
              Elige cómo deseas crear el nuevo tipo de documento
            </p>

            <!-- Opción: Usar plantilla -->
            <button
              class="option-card"
              (click)="selectUseTemplate()"
              [disabled]="loadingTemplates()"
            >
              <mat-icon class="option-icon">article</mat-icon>
              <div class="option-content">
                <h3 class="option-title">Usar plantilla global</h3>
                <p class="option-description">
                  Selecciona una plantilla base configurada por Pachamama
                </p>
              </div>
              <mat-icon class="option-arrow">arrow_forward</mat-icon>
            </button>

            <!-- Opción: Crear desde cero -->
            <button class="option-card" (click)="selectBlank()">
              <mat-icon class="option-icon">add_circle_outline</mat-icon>
              <div class="option-content">
                <h3 class="option-title">Crear desde cero</h3>
                <p class="option-description">Crea un tipo de documento personalizado desde cero</p>
              </div>
              <mat-icon class="option-arrow">arrow_forward</mat-icon>
            </button>
          </div>
        } @else {
          <!-- Lista de plantillas -->
          <div class="templates-container">
            @if (loadingTemplates()) {
              <div class="loading-container">
                <mat-spinner diameter="40" />
                <p class="text-body text-neutral-subheading mt-4">Cargando plantillas...</p>
              </div>
            } @else if (templates().length === 0) {
              <div class="empty-templates">
                <mat-icon class="empty-icon">folder_off</mat-icon>
                <p class="text-body text-neutral-subheading">No hay plantillas disponibles</p>
                <button mat-stroked-button class="mt-4" (click)="goBack()">Volver</button>
              </div>
            } @else {
              <!-- Header de la lista -->
              <div class="templates-header">
                <button mat-icon-button (click)="goBack()" matTooltip="Volver">
                  <mat-icon>arrow_back</mat-icon>
                </button>
                <h3 class="text-body font-bold text-accent-titles">
                  Selecciona una plantilla ({{ templates().length }})
                </h3>
              </div>

              <!-- Grid de plantillas -->
              <div class="templates-grid">
                @for (template of templates(); track template.id) {
                  <div
                    class="template-card"
                    role="button"
                    tabindex="0"
                    (click)="selectTemplate(template)"
                    (keydown.enter)="selectTemplate(template)"
                    (keydown.space)="selectTemplate(template); $event.preventDefault()"
                  >
                    <div class="template-header">
                      <div class="template-icon-container">
                        <mat-icon class="template-icon">{{
                          template.icon || 'description'
                        }}</mat-icon>
                      </div>
                      <div class="template-info">
                        <h4 class="template-name">{{ template.name }}</h4>
                      </div>
                      @if (template.isRequired) {
                        <mat-icon class="required-icon" matTooltip="Documento obligatorio">
                          error
                        </mat-icon>
                      }
                    </div>

                    @if (template.description) {
                      <p class="template-description">
                        {{ truncateText(template.description, 100) }}
                      </p>
                    }

                    @if (
                      template.requiredForProjectStages &&
                      template.requiredForProjectStages.length > 0
                    ) {
                      <div class="template-stages">
                        <span class="stages-label">Etapas:</span>
                        <div class="stages-chips">
                          @for (stage of template.requiredForProjectStages; track stage) {
                            <span class="stage-chip">{{ getProjectStageLabel(stage) }}</span>
                          }
                        </div>
                      </div>
                    }

                    <div class="template-footer">
                      <button mat-button color="primary">
                        <mat-icon>check</mat-icon>
                        Usar plantilla
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- Footer -->
      @if (!showTemplates()) {
        <div class="dialog-footer">
          <button mat-button (click)="close()">Cancelar</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .dialog-container {
        display: flex;
        flex-direction: column;
        max-height: 90vh;
      }

      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem;
        border-bottom: 1px solid #e5e5e5;
      }

      .dialog-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #0a0a0a;
        margin: 0;
      }

      .close-button {
        margin-right: -0.5rem;
      }

      .dialog-content {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
      }

      .dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        padding: 1rem 1.5rem;
        border-top: 1px solid #e5e5e5;
      }

      /* Opciones iniciales */
      .options-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .option-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        border: 2px solid #e5e5e5;
        border-radius: 0.5rem;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;

        &:hover:not(:disabled) {
          border-color: #218358;
          background: #f4fbf6;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .option-icon {
        font-size: 2.5rem;
        width: 2.5rem;
        height: 2.5rem;
        color: #218358;
        flex-shrink: 0;
      }

      .option-content {
        flex: 1;
      }

      .option-title {
        font-size: 1rem;
        font-weight: 700;
        color: #0a0a0a;
        margin: 0 0 0.25rem 0;
      }

      .option-description {
        font-size: 0.875rem;
        color: #737373;
        margin: 0;
      }

      .option-arrow {
        color: #737373;
        flex-shrink: 0;
      }

      /* Plantillas */
      .templates-container {
        min-height: 400px;
      }

      .loading-container,
      .empty-templates {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
      }

      .empty-icon {
        font-size: 4rem;
        width: 4rem;
        height: 4rem;
        color: #737373;
        opacity: 0.5;
        margin-bottom: 1rem;
      }

      .templates-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e5e5e5;
      }

      .templates-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
      }

      .template-card {
        display: flex;
        flex-direction: column;
        padding: 1.25rem;
        border: 1px solid #e5e5e5;
        border-radius: 0.5rem;
        background: white;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          border-color: #218358;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
      }

      .template-header {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .template-icon-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.5rem;
        background: #f4fbf6;
        flex-shrink: 0;
      }

      .template-icon {
        color: #218358;
        font-size: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
      }

      .template-info {
        flex: 1;
        min-width: 0;
      }

      .template-name {
        font-size: 1rem;
        font-weight: 700;
        color: #0a0a0a;
        margin: 0;
        white-space: normal;
        line-height: 1.4;
      }

      .required-icon {
        color: #dc2626;
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
        flex-shrink: 0;
      }

      .template-description {
        font-size: 0.875rem;
        color: #737373;
        margin: 0 0 0.75rem 0;
        line-height: 1.4;
      }

      .template-stages {
        margin-bottom: 1rem;
      }

      .stages-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #737373;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }

      .stages-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-top: 0.5rem;
      }

      .stage-chip {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        background-color: #f4fbf6;
        color: #218358;
        font-size: 0.75rem;
        font-weight: 500;
        white-space: nowrap;
      }

      .template-footer {
        margin-top: auto;
        display: flex;
        justify-content: flex-end;
        padding-top: 0.75rem;
        border-top: 1px solid #e5e5e5;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentTypeCreateModeDialogComponent {
  private dialogRef = inject(MatDialogRef<DocumentTypeCreateModeDialogComponent>);
  private documentTypesService = inject(DocumentTypesService);
  private notification = inject(NotificationService);

  showTemplates = signal(false);
  loadingTemplates = signal(false);
  templates = signal<DocumentType[]>([]);

  /**
   * Seleccionar opción "Usar plantilla"
   */
  selectUseTemplate(): void {
    this.showTemplates.set(true);
    this.loadTemplates();
  }

  /**
   * Seleccionar opción "Crear desde cero"
   */
  selectBlank(): void {
    this.dialogRef.close({ mode: 'blank' } as CreateModeResult);
  }

  /**
   * Cargar plantillas desde el backend
   */
  private loadTemplates(): void {
    this.loadingTemplates.set(true);
    this.documentTypesService.getTemplatesForEntity('projects').subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.loadingTemplates.set(false);
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.notification.error('Error al cargar plantillas');
        this.loadingTemplates.set(false);
        this.templates.set([]);
      },
    });
  }

  /**
   * Seleccionar una plantilla
   */
  selectTemplate(template: DocumentType): void {
    this.dialogRef.close({ mode: 'template', template } as CreateModeResult);
  }

  /**
   * Volver a opciones iniciales
   */
  goBack(): void {
    this.showTemplates.set(false);
  }

  /**
   * Cerrar diálogo sin selección
   */
  close(): void {
    this.dialogRef.close();
  }

  /**
   * Truncar texto largo
   */
  truncateText(text: string | undefined, maxLength = 50): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Obtener label visible de la etapa usando su key
   */
  getProjectStageLabel(stageKey: string): string {
    return getProjectWorkflowStageLabel(stageKey);
  }
}
