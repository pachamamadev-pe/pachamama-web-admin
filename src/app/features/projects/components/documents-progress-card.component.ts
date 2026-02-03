import { Component, input, computed, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DocumentRequirements, ProjectDocument } from '../models/project-document.model';

/**
 * Componente que muestra el progreso de completitud de documentos obligatorios
 */
@Component({
  selector: 'app-documents-progress-card',
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="progress-card bg-primary-white rounded-lg shadow-sm p-6 mb-6">
      @if (observedDocs().length > 0) {
        <!-- Hay documentos observados -->
        <div class="alert-banner bg-secondary-light border-l-4 border-price p-4 rounded">
          <div class="flex items-start">
            <mat-icon class="text-price mr-3 mt-0.5">error_outline</mat-icon>
            <div class="flex-1">
              <p class="text-body font-bold text-accent-titles mb-1">
                Hay {{ observedDocs().length }} documento(s) observado(s)
              </p>
              <p class="text-subtitle text-neutral-subheading mb-2">
                Debes subsanar las observaciones de los siguientes documentos:
              </p>
              <ul class="text-subtitle text-neutral-subheading list-disc list-inside ml-2">
                @for (doc of observedDocs(); track doc.id) {
                  <li>{{ doc.documentType.name }}</li>
                }
              </ul>
            </div>
          </div>
        </div>
      }
      @if (requirements()) {
        @if (stageRequiredDocs().length === 0) {
          <!-- No hay documentos obligatorios para esta etapa -->
          <div class="info-banner bg-secondary-light border-l-4 border-secondary p-4 rounded">
            <div class="flex items-start">
              <mat-icon class="text-secondary mr-3 mt-0.5">info</mat-icon>
              <div class="flex-1">
                <p class="text-body font-bold text-accent-titles mb-1">
                  No hay documentos obligatorios en esta etapa
                </p>
                <p class="text-subtitle text-neutral-subheading">
                  La etapa actual no requiere documentos obligatorios. Puedes continuar con las
                  actividades del proyecto.
                </p>
              </div>
            </div>
          </div>
        } @else {
          <!-- Progress Bar -->
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-body font-bold text-accent-titles">Documentos Obligatorios</h3>
              <span class="text-subtitle text-neutral-subheading">
                {{ stageUploadedCount() }} de {{ stageRequiredDocs().length }} completados
              </span>
            </div>
            <mat-progress-bar
              mode="determinate"
              [value]="progressPercentage()"
              [class.progress-complete]="isComplete()"
              [class.progress-incomplete]="!isComplete()"
            />
            <p class="text-subtitle text-neutral-subheading mt-1">
              {{ progressPercentage() }}% completado
            </p>
          </div>

          <!-- Alert Banner según el estado -->
          @if (!allStageDocsUploaded()) {
            <!-- Faltan documentos por subir -->
            <div class="alert-banner bg-secondary-light border-l-4 border-price p-4 rounded">
              <div class="flex items-start">
                <mat-icon class="text-price mr-3 mt-0.5">warning</mat-icon>
                <div class="flex-1">
                  <p class="text-body font-bold text-accent-titles mb-1">
                    Faltan {{ pendingUploadCount() }} documento(s) obligatorio(s) por subir
                  </p>
                  <p class="text-subtitle text-neutral-subheading">
                    Debes subir todos los documentos obligatorios de esta etapa para poder avanzar.
                  </p>
                </div>
              </div>
            </div>
          } @else if (!allStageDocsApproved()) {
            <!-- Todos subidos pero no todos aprobados -->
            <div class="alert-banner bg-secondary-light border-l-4 border-price p-4 rounded">
              <div class="flex items-start">
                <mat-icon class="text-price mr-3 mt-0.5">schedule</mat-icon>
                <div class="flex-1">
                  <p class="text-body font-bold text-accent-titles mb-1">
                    Hay documentos pendientes de aprobación
                  </p>
                  <p class="text-subtitle text-neutral-subheading">
                    Todos los documentos obligatorios de esta etapa deben estar aprobados para poder
                    avanzar.
                  </p>
                </div>
              </div>
            </div>
          } @else {
            <!-- Todos aprobados -->
            <div class="success-banner bg-secondary-light border-l-4 border-secondary p-4 rounded">
              <div class="flex items-start">
                <mat-icon class="text-secondary mr-3 mt-0.5">check_circle</mat-icon>
                <div class="flex-1">
                  <p class="text-body font-bold text-accent-titles">
                    ¡Todos los documentos obligatorios están aprobados!
                  </p>
                  <p class="text-subtitle text-neutral-subheading">
                    Has cumplido con los requisitos documentales de esta etapa.
                  </p>
                </div>
              </div>
            </div>
          }
        }

        <!-- Documentos Opcionales Info (solo si hay documentos opcionales) -->
        @if (requirements()!.totalOptional > 0) {
          <div class="optional-info mt-4 pt-4 border-t border-neutral-border">
            <p class="text-subtitle text-neutral-subheading">
              <mat-icon class="text-icon align-middle mr-1" style="font-size: 18px;">info</mat-icon>
              Documentos opcionales: {{ requirements()!.optionalUploaded }} de
              {{ requirements()!.totalOptional }} subidos
            </p>
          </div>
        }
      } @else {
        <!-- Loading State -->
        <div class="flex items-center justify-center py-4">
          <p class="text-body text-neutral-subheading">Cargando información de documentos...</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host ::ng-deep {
        .mat-mdc-progress-bar {
          --mdc-linear-progress-active-indicator-height: 8px;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-complete .mdc-linear-progress__bar-inner {
          border-color: #218358 !important; /* secondary */
        }

        .progress-incomplete .mdc-linear-progress__bar-inner {
          border-color: #fe714b !important; /* price */
        }

        .progress-complete .mdc-linear-progress__buffer {
          background-color: #f4fbf6 !important; /* secondary-light */
        }

        .progress-incomplete .mdc-linear-progress__buffer {
          background-color: #e5e5e5 !important; /* neutral-border */
        }
      }

      .progress-card {
        transition: all 0.3s ease;
      }

      .alert-banner,
      .success-banner,
      .info-banner {
        transition: all 0.3s ease;
      }

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      ul li {
        margin-top: 4px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsProgressCardComponent {
  requirements = input<DocumentRequirements | null>(null);
  documents = input<ProjectDocument[]>([]);

  constructor() {
    console.log('Initial requirements:', this.requirements());
    console.log('Initial documents:', this.documents());

    effect(() => {
      console.log('Documents updated:', this.documents());
    });
  }

  /**
   * Filtra los documentos obligatorios que aplican para la etapa actual
   */
  stageRequiredDocs = computed(() => {
    const req = this.requirements();
    if (!req) return [];

    const currentStage = req.currentStage;

    // Filtrar documentos que:
    // 1. Son obligatorios (isRequired === true)
    // 2. Aplican para la etapa actual (requiredForStages contiene currentStage)
    return req.documentTypes.filter((doc) => {
      return (
        doc.isRequired && doc.requiredForStages && doc.requiredForStages.includes(currentStage)
      );
    });
  });

  observedRequiredDocs = computed(() => {
    const req = this.requirements();
    console.log({ req });
    if (!req) return [];

    // Filtrar documentos que:
    // 1. Son obligatorios (isRequired === true)
    return req.documentTypes.filter((doc) => {
      return doc.isRequired;
    });
  });
  /**
   * Cuenta cuántos documentos obligatorios de la etapa están subidos
   */
  stageUploadedCount = computed(() => {
    return this.stageRequiredDocs().filter((doc) => doc.isUploaded).length;
  });

  /**
   * Obtiene los documentos obligatorios que están observados
   */
  observedDocs = computed(() => {
    return this.documents().filter((doc) => doc.validationStatus === 'observed');
  });

  /**
   * Calcula el porcentaje de progreso basado en la etapa actual
   */
  progressPercentage(): number {
    const totalStage = this.stageRequiredDocs().length;
    if (totalStage === 0) return 100; // No hay documentos obligatorios en esta etapa

    const uploaded = this.stageUploadedCount();
    return Math.round((uploaded / totalStage) * 100);
  }

  /**
   * Verifica si todos los documentos obligatorios de la etapa están subidos
   */
  allStageDocsUploaded(): boolean {
    const totalStage = this.stageRequiredDocs().length;
    if (totalStage === 0) return true; // No hay documentos obligatorios

    return this.stageUploadedCount() === totalStage;
  }

  /**
   * Verifica si todos los documentos obligatorios de la etapa están aprobados
   */
  allStageDocsApproved(): boolean {
    const stageDocs = this.stageRequiredDocs();
    if (stageDocs.length === 0) return true; // No hay documentos obligatorios

    // Todos deben estar subidos Y aprobados
    return stageDocs.every((doc) => doc.isUploaded && doc.uploadedStatus === 'approved');
  }

  /**
   * Verifica si todos los documentos obligatorios de la etapa están completados
   */
  isComplete(): boolean {
    return this.allStageDocsApproved();
  }

  /**
   * Calcula cuántos documentos obligatorios de la etapa faltan por subir
   */
  pendingUploadCount(): number {
    const totalStage = this.stageRequiredDocs().length;
    return totalStage - this.stageUploadedCount();
  }
}
