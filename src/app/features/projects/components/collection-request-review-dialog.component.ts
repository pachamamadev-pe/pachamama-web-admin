import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@core/services/notification.service';
import { CollectionRequestsService } from '@features/collection-requests/services/collection-requests.service';
import {
  CollectionRequest,
  CollectionRequestHistoryDto,
} from '@features/collection-requests/models/collection-request.model';
import { parseDateValue } from '@shared/utils/date-helpers';

interface DialogData {
  request: CollectionRequest;
  readOnly?: boolean;
}

/**
 * Dialog para revisar una solicitud de recolección
 * Permite aprobar, rechazar u observar la solicitud
 * Cuando readOnly=true, solo muestra información e historial
 */
@Component({
  selector: 'app-collection-request-review-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="review-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title class="text-title font-bold text-accent-titles">
          {{
            readOnly ? 'Detalles de Solicitud de Recolección' : 'Revisar Solicitud de Recolección'
          }}
        </h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <!-- Request Info -->
        <div class="request-info">
          <div class="info-row">
            <span class="info-label">N° Solicitud:</span>
            <span class="info-value font-mono font-bold">{{ request.requestNumber }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Proyecto:</span>
            <span class="info-value">{{ request.projectName }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Peso solicitado:</span>
            <span class="info-value font-bold text-secondary">
              {{ request.requestedWeighing | number: '1.2-2' }} kg
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Periodo:</span>
            <span class="info-value">{{ formatDateRange() }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Solicitante:</span>
            <span class="info-value">{{ request.requestedByName }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Fecha de solicitud:</span>
            <span class="info-value">
              {{ request.requestedAt | date: 'dd/MM/yyyy HH:mm' }}
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Estado:</span>
            <mat-chip [class]="getStatusClass(request.status)">
              {{ getStatusLabel(request.status) }}
            </mat-chip>
          </div>
          @if (request.observationCount > 0) {
            <div class="info-row">
              <span class="info-label">Observaciones previas:</span>
              <span class="info-value text-price font-bold">
                {{ request.observationCount }}
              </span>
            </div>
          }
        </div>

        <!-- History Section -->
        @if (request.observationCount > 0) {
          <div class="history-section">
            <mat-expansion-panel
              [expanded]="historyExpanded()"
              (opened)="loadHistory()"
              (expandedChange)="historyExpanded.set($event)"
            >
              <mat-expansion-panel-header>
                <mat-panel-title class="flex items-center gap-2">
                  <mat-icon class="text-secondary">history</mat-icon>
                  <span class="text-body font-bold text-accent-titles">
                    Historial de Revisiones ({{ request.observationCount }})
                  </span>
                </mat-panel-title>
              </mat-expansion-panel-header>

              <!-- History Content -->
              <div class="history-content">
                @if (loadingHistory()) {
                  <div class="loading-history">
                    <mat-spinner diameter="32" />
                    <p class="text-subtitle text-neutral-subheading mt-2">Cargando historial...</p>
                  </div>
                } @else if (history().length === 0) {
                  <div class="empty-history">
                    <mat-icon class="text-neutral-subheading">info_outline</mat-icon>
                    <p class="text-subtitle text-neutral-subheading">No hay historial disponible</p>
                  </div>
                } @else {
                  <div class="timeline">
                    @for (entry of history(); track entry.id) {
                      <div class="timeline-item">
                        <div class="timeline-marker">
                          <div [class]="'marker-dot ' + getStatusClass(entry.newStatus)">
                            <mat-icon [class]="getStatusIconClass(entry.newStatus)">
                              {{ getStatusIcon(entry.newStatus) }}
                            </mat-icon>
                          </div>
                          @if (!$last) {
                            <div class="timeline-line"></div>
                          }
                        </div>

                        <div class="timeline-content">
                          <div class="timeline-header">
                            <div class="timeline-status">
                              @if (entry.previousStatus) {
                                <span class="previous-status text-neutral-subheading">
                                  {{ getStatusLabel(entry.previousStatus) }}
                                </span>
                                <mat-icon class="status-arrow">arrow_forward</mat-icon>
                              }
                              <div class="new-status">
                                <mat-icon [class]="getStatusIconClass(entry.newStatus)">
                                  {{ getStatusIcon(entry.newStatus) }}
                                </mat-icon>
                                <span class="font-bold">{{ getStatusLabel(entry.newStatus) }}</span>
                              </div>
                            </div>
                            <span class="timeline-date text-subtitle text-neutral-subheading">
                              {{ entry.reviewedAt | date: 'dd/MM/yyyy HH:mm' }}
                            </span>
                          </div>

                          <div class="timeline-reviewer">
                            <mat-icon class="reviewer-icon">person</mat-icon>
                            <div>
                              <p class="reviewer-name font-bold">{{ entry.reviewedByName }}</p>
                              <p class="reviewer-email text-subtitle text-neutral-subheading">
                                {{ entry.reviewedByEmail }}
                              </p>
                            </div>
                          </div>

                          @if (entry.newStatus !== 'pending' && entry.reviewNotes) {
                            <div class="timeline-notes">
                              <div class="notes-label">
                                <mat-icon>note</mat-icon>
                                <span class="font-bold">Notas de revisión</span>
                              </div>
                              <p class="notes-text">{{ entry.reviewNotes }}</p>
                            </div>
                          }

                          @if (entry.newStatus === 'observed' && entry.observationNotes) {
                            <div class="timeline-observations">
                              <div class="observations-label">
                                <mat-icon>warning</mat-icon>
                                <span class="font-bold">Observaciones</span>
                              </div>
                              <p class="observations-text">{{ entry.observationNotes }}</p>
                            </div>
                          }

                          <div class="timeline-data">
                            <div class="data-item">
                              <mat-icon>scale</mat-icon>
                              <span>{{ entry.requestedWeighing | number: '1.2-2' }} kg</span>
                            </div>
                            <div class="data-item">
                              <mat-icon>event</mat-icon>
                              <span>{{ formatHistoryDateRange(entry) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </mat-expansion-panel>
          </div>
        }

        <!-- Review Form -->
        @if (!readOnly) {
          <div class="review-form-container">
            <h3 class="text-body font-bold text-accent-titles mb-3">Revisión</h3>

            <!-- Action Selection -->
            <div class="action-selection">
              <button
                mat-raised-button
                [class.active]="selectedAction() === 'approve'"
                (click)="selectAction('approve')"
                class="action-btn approve-btn"
              >
                <mat-icon class="icon-approve">check_circle</mat-icon>
                Aprobar
              </button>
              <button
                mat-raised-button
                [class.active]="selectedAction() === 'reject'"
                (click)="selectAction('reject')"
                class="action-btn reject-btn"
              >
                <mat-icon class="icon-reject">cancel</mat-icon>
                Rechazar
              </button>
              <button
                mat-raised-button
                [class.active]="selectedAction() === 'observe'"
                (click)="selectAction('observe')"
                class="action-btn observe-btn"
              >
                <mat-icon class="icon-observe">info</mat-icon>
                Observar
              </button>
            </div>

            <!-- Review Form -->
            @if (selectedAction()) {
              <form [formGroup]="reviewForm" class="mt-4">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Notas de revisión</mat-label>
                  <textarea
                    matInput
                    formControlName="reviewNotes"
                    rows="4"
                    [placeholder]="getReviewNotesPlaceholder()"
                  ></textarea>
                  @if (reviewForm.get('reviewNotes')?.hasError('required')) {
                    <mat-error>Las notas de revisión son obligatorias</mat-error>
                  }
                </mat-form-field>

                @if (selectedAction() === 'observe') {
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Observaciones específicas</mat-label>
                    <textarea
                      matInput
                      formControlName="observationNotes"
                      rows="6"
                      placeholder="Detalla las observaciones que se debe corregir..."
                    ></textarea>
                    @if (reviewForm.get('observationNotes')?.hasError('required')) {
                      <mat-error>Las observaciones específicas son obligatorias</mat-error>
                    }
                  </mat-form-field>
                }
              </form>
            }
          </div>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-stroked-button mat-dialog-close>
          {{ readOnly ? 'Cerrar' : 'Cancelar' }}
        </button>
        @if (!readOnly) {
          <button
            mat-raised-button
            [color]="getActionButtonColor()"
            (click)="submitReview()"
            [disabled]="!selectedAction() || submitting() || reviewForm.invalid"
          >
            @if (submitting()) {
              <ng-container>
                <mat-icon>hourglass_empty</mat-icon>
                Procesando...
              </ng-container>
            } @else {
              <ng-container>
                <mat-icon [class]="getActionIconClass()">{{ getActionIcon() }}</mat-icon>
                {{ getActionButtonText() }}
              </ng-container>
            }
          </button>
        }
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .review-dialog {
        display: flex;
        flex-direction: column;
        max-height: 90vh;
      }

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 1.5rem 1rem 1.5rem;
        border-bottom: 1px solid #e5e5e5;
      }

      h2 {
        margin: 0;
      }

      .dialog-content {
        padding: 1.5rem;
        overflow-y: auto;
      }

      .request-info {
        background-color: #f9fafb;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1.5rem;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid #e5e5e5;

        &:last-child {
          border-bottom: none;
        }
      }

      .info-label {
        font-size: 13px;
        color: #737373;
        font-weight: 600;
      }

      .info-value {
        font-size: 14px;
        color: #0a0a0a;
      }

      .history-section {
        margin-bottom: 1.5rem;

        ::ng-deep .mat-expansion-panel {
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          box-shadow: none;
        }

        ::ng-deep .mat-expansion-panel-header {
          padding: 1rem 1.5rem;
        }

        ::ng-deep .mat-expansion-panel-body {
          padding: 0 1.5rem 1.5rem 1.5rem;
        }
      }

      .loading-history,
      .empty-history {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
      }

      .timeline {
        margin-top: 1rem;
      }

      .timeline-item {
        display: flex;
        gap: 1rem;
        position: relative;
      }

      .timeline-marker {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
      }

      .marker-dot {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        &.status-pending {
          background-color: #fff5f2;
          border: 2px solid #fe714b;
        }

        &.status-approved {
          background-color: #f4fbf6;
          border: 2px solid #218358;
        }

        &.status-rejected {
          background-color: #fef2f2;
          border: 2px solid #ef4444;
        }

        &.status-observed {
          background-color: #fffbeb;
          border: 2px solid #f59e0b;
        }
      }

      .timeline-line {
        width: 2px;
        flex: 1;
        background-color: #e5e5e5;
        margin-top: 4px;
        min-height: 40px;
      }

      .timeline-content {
        flex: 1;
        background-color: #f9fafb;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
      }

      .timeline-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }

      .timeline-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 14px;
        color: #0a0a0a;

        .previous-status {
          font-size: 13px;
          text-decoration: line-through;
          opacity: 0.7;
        }

        .status-arrow {
          font-size: 20px;
          width: 20px;
          height: 20px;
          color: #737373;
        }

        .new-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          background-color: rgba(33, 131, 88, 0.1);

          mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }
      }

      .timeline-date {
        font-size: 12px;
      }

      .timeline-reviewer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background-color: white;
        border-radius: 6px;
        margin-bottom: 0.75rem;

        .reviewer-icon {
          color: #737373;
          font-size: 20px;
        }

        .reviewer-name {
          font-size: 14px;
          color: #0a0a0a;
          margin: 0;
        }

        .reviewer-email {
          font-size: 12px;
          margin: 0;
        }
      }

      .timeline-notes,
      .timeline-observations {
        padding: 0.75rem;
        border-radius: 6px;
        margin-bottom: 0.75rem;

        .notes-label,
        .observations-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 13px;
          color: #0a0a0a;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }

        .notes-text,
        .observations-text {
          font-size: 13px;
          color: #0a0a0a;
          margin: 0;
          padding-left: 1.5rem;
          line-height: 1.5;
        }
      }

      .timeline-notes {
        background-color: #eff6ff;
        border-left: 3px solid #3b82f6;

        .notes-label mat-icon {
          color: #3b82f6;
        }
      }

      .timeline-observations {
        background-color: #fffbeb;
        border-left: 3px solid #f59e0b;

        .observations-label mat-icon {
          color: #f59e0b;
        }
      }

      .timeline-data {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;

        .data-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 13px;
          color: #737373;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
            color: #737373;
          }
        }
      }

      .review-form-container {
        margin-top: 1.5rem;
      }

      .action-selection {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .action-btn {
        flex: 1;
        min-width: 140px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        border: 2px solid #e5e5e5;
        background-color: white;
        color: #0a0a0a;
        transition: all 0.2s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        &.active {
          border-width: 2px;
        }

        &.approve-btn.active {
          background-color: #f4fbf6;
          border-color: #218358;
          color: #218358;
        }

        &.reject-btn.active {
          background-color: #fef2f2;
          border-color: #ef4444;
          color: #ef4444;
        }

        &.observe-btn.active {
          background-color: #fffbeb;
          border-color: #f59e0b;
          color: #f59e0b;
        }

        .icon-approve {
          color: #218358;
        }

        .icon-reject {
          color: #ef4444;
        }

        .icon-observe {
          color: #f59e0b;
        }
      }

      .dialog-actions {
        padding: 1rem 1.5rem;
        border-top: 1px solid #e5e5e5;

        button {
          mat-icon {
            vertical-align: middle;
            margin-right: 4px;
          }
        }
      }

      // Status chips
      .status-pending {
        background-color: #fff5f2 !important;
        color: #fe714b !important;
        font-weight: 600 !important;
      }

      .status-approved {
        background-color: #f4fbf6 !important;
        color: #218358 !important;
        font-weight: 600 !important;
      }

      .status-rejected {
        background-color: #fef2f2 !important;
        color: #ef4444 !important;
        font-weight: 600 !important;
      }

      .status-observed {
        background-color: #fffbeb !important;
        color: #f59e0b !important;
        font-weight: 600 !important;
      }

      // Status icon colors
      .icon-pending {
        color: #fe714b;
      }

      .icon-approved {
        color: #218358;
      }

      .icon-rejected {
        color: #ef4444;
      }

      .icon-observed {
        color: #f59e0b;
      }

      .icon-cancelled {
        color: #6b7280;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionRequestReviewDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CollectionRequestReviewDialogComponent>);
  private data: DialogData = inject(MAT_DIALOG_DATA);
  private collectionRequestsService = inject(CollectionRequestsService);
  private notification = inject(NotificationService);

  request = this.data.request;
  readOnly = this.data.readOnly ?? false;
  selectedAction = signal<'approve' | 'reject' | 'observe' | null>(null);
  submitting = signal(false);

  // History state
  historyExpanded = signal(false);
  loadingHistory = signal(false);
  history = signal<CollectionRequestHistoryDto[]>([]);

  reviewForm: FormGroup = this.fb.group({
    reviewNotes: ['', Validators.required],
    observationNotes: [''],
  });

  loadHistory(): void {
    if (this.history().length > 0 || this.loadingHistory()) return;

    this.loadingHistory.set(true);
    this.collectionRequestsService.getRequestHistory(this.request.id).subscribe({
      next: (historyData) => {
        // Ordenar por fecha descendente (más reciente primero)
        const sortedHistory = [...historyData].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        this.history.set(sortedHistory);
        this.loadingHistory.set(false);
      },
      error: (error) => {
        console.error('Error loading history:', error);
        this.notification.error('Error al cargar el historial');
        this.loadingHistory.set(false);
      },
    });
  }

  selectAction(action: 'approve' | 'reject' | 'observe'): void {
    this.selectedAction.set(action);

    // Actualizar validadores según la acción
    const observationNotesControl = this.reviewForm.get('observationNotes');
    if (action === 'observe') {
      observationNotesControl?.setValidators([Validators.required]);
    } else {
      observationNotesControl?.clearValidators();
    }
    observationNotesControl?.updateValueAndValidity();

    // Limpiar el formulario al cambiar de acción
    this.reviewForm.patchValue({
      reviewNotes: '',
      observationNotes: '',
    });
  }

  submitReview(): void {
    if (this.reviewForm.invalid || !this.selectedAction()) return;

    this.submitting.set(true);
    const action = this.selectedAction()!;
    const { reviewNotes, observationNotes } = this.reviewForm.value;
    const requestId = this.request.id;

    let request$;
    switch (action) {
      case 'approve':
        request$ = this.collectionRequestsService.approveRequest(requestId, reviewNotes);
        break;
      case 'reject':
        request$ = this.collectionRequestsService.rejectRequest(requestId, reviewNotes);
        break;
      case 'observe':
        request$ = this.collectionRequestsService.observeRequest(
          requestId,
          reviewNotes,
          observationNotes,
        );
        break;
    }

    request$.subscribe({
      next: () => {
        this.notification.success(`Solicitud ${this.getActionPastTense()} correctamente`);
        this.dialogRef.close({ success: true });
      },
      error: (error) => {
        console.error('Error reviewing request:', error);
        const errorMessage = error?.error?.message || `Error al ${action} la solicitud`;
        this.notification.error(errorMessage);
        this.submitting.set(false);
      },
    });
  }

  getReviewNotesPlaceholder(): string {
    const action = this.selectedAction();
    if (action === 'approve')
      return 'Ejemplo: Solicitud aprobada. Cumple con todos los requisitos.';
    if (action === 'reject')
      return 'Ejemplo: Solicitud rechazada. El proyecto no cumple con los requisitos mínimos.';
    return 'Ejemplo: Solicitud observada. Se requieren correcciones antes de aprobar.';
  }

  getActionButtonColor(): string {
    const action = this.selectedAction();
    if (action === 'approve') return 'primary';
    if (action === 'reject') return 'warn';
    return 'accent';
  }

  getActionButtonText(): string {
    const action = this.selectedAction();
    if (action === 'approve') return 'Aprobar Solicitud';
    if (action === 'reject') return 'Rechazar Solicitud';
    return 'Observar Solicitud';
  }

  getActionIcon(): string {
    const action = this.selectedAction();
    if (action === 'approve') return 'check_circle';
    if (action === 'reject') return 'cancel';
    return 'info';
  }

  getActionIconClass(): string {
    const action = this.selectedAction();
    if (action === 'approve') return 'icon-approve';
    if (action === 'reject') return 'icon-reject';
    return 'icon-observe';
  }

  getActionPastTense(): string {
    const action = this.selectedAction();
    if (action === 'approve') return 'aprobada';
    if (action === 'reject') return 'rechazada';
    return 'observada';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      observed: 'Observado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      observed: 'status-observed',
      cancelled: 'status-cancelled',
    };
    return classes[status] || '';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: 'schedule',
      approved: 'check_circle',
      rejected: 'cancel',
      observed: 'info',
      cancelled: 'block',
    };
    return icons[status] || 'help';
  }

  getStatusIconClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'icon-pending',
      approved: 'icon-approved',
      rejected: 'icon-rejected',
      observed: 'icon-observed',
      cancelled: 'icon-cancelled',
    };
    return classes[status] || '';
  }

  formatDateRange(): string {
    const start = (parseDateValue(this.request.startDate) ?? new Date(NaN)).toLocaleDateString(
      'es-PE',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
    );
    const end = (parseDateValue(this.request.endDate) ?? new Date(NaN)).toLocaleDateString(
      'es-PE',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
    );
    return `${start} - ${end}`;
  }

  formatHistoryDateRange(entry: CollectionRequestHistoryDto): string {
    const start = (parseDateValue(entry.startDate) ?? new Date(NaN)).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
    });
    const end = (parseDateValue(entry.endDate) ?? new Date(NaN)).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  }
}
