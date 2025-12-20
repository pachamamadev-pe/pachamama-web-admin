import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DocumentRequirements } from '../models/project-document.model';

/**
 * Componente que muestra el progreso de completitud de documentos obligatorios
 */
@Component({
  selector: 'app-documents-progress-card',
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="progress-card bg-primary-white rounded-lg shadow-sm p-6 mb-6">
      @if (requirements()) {
        <!-- Progress Bar -->
        <div class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-body font-bold text-accent-titles">Documentos Obligatorios</h3>
            <span class="text-subtitle text-neutral-subheading">
              {{ requirements()!.requiredUploaded }} de {{ requirements()!.totalRequired }}
              completados
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

        <!-- Alert Banner si faltan documentos por subir o aprobar -->
        @if (!requirements()!.isCompliant || !allDocsApproved()) {
          <div class="alert-banner bg-secondary-light border-l-4 border-price p-4 rounded">
            <div class="flex items-start">
              <mat-icon class="text-price mr-3 mt-0.5">warning</mat-icon>
              <div class="flex-1">
                @if (!requirements()!.isCompliant) {
                  <p class="text-body font-bold text-accent-titles mb-1">
                    Faltan {{ pendingRequired() }} documento(s) obligatorio(s) por subir
                  </p>
                  <p class="text-subtitle text-neutral-subheading">
                    Debes subir todos los documentos obligatorios para poder avanzar a la siguiente
                    etapa.
                  </p>
                } @else if (!allDocsApproved()) {
                  <p class="text-body font-bold text-accent-titles mb-1">
                    Hay documentos obligatorios pendientes de aprobación
                  </p>
                  <p class="text-subtitle text-neutral-subheading">
                    Todos los documentos obligatorios deben estar aprobados para poder avanzar a la
                    siguiente etapa.
                  </p>
                }
              </div>
            </div>
          </div>
        } @else {
          <!-- Success Banner -->
          <div class="success-banner bg-secondary-light border-l-4 border-secondary p-4 rounded">
            <div class="flex items-start">
              <mat-icon class="text-secondary mr-3 mt-0.5">check_circle</mat-icon>
              <div class="flex-1">
                <p class="text-body font-bold text-accent-titles">
                  ¡Todos los documentos obligatorios están aprobados!
                </p>
                <p class="text-subtitle text-neutral-subheading">
                  Puedes avanzar a la siguiente etapa del proyecto.
                </p>
              </div>
            </div>
          </div>
        }

        <!-- Documentos Opcionales Info -->
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
      .success-banner {
        transition: all 0.3s ease;
      }

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsProgressCardComponent {
  requirements = input<DocumentRequirements | null>(null);
  allDocsApproved = input<boolean>(false);

  /**
   * Calcula el porcentaje de progreso
   */
  progressPercentage(): number {
    const req = this.requirements();
    if (!req || req.totalRequired === 0) return 0;
    return Math.round((req.requiredUploaded / req.totalRequired) * 100);
  }

  /**
   * Verifica si todos los documentos obligatorios están completados
   */
  isComplete(): boolean {
    return this.requirements()?.isCompliant || false;
  }

  /**
   * Calcula cuántos documentos obligatorios faltan
   */
  pendingRequired(): number {
    const req = this.requirements();
    if (!req) return 0;
    return req.totalRequired - req.requiredUploaded;
  }
}
