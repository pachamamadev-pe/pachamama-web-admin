import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CompanyFormService } from '../services/company-form.service';
import { FormSchemaResponse, FormStatus } from '../models/dynamic-form.model';
import { NotificationService } from '@core/services/notification.service';
import { parseDateValue } from '@shared/utils/date-helpers';
import {
  FormDetailViewDialogComponent,
  FormDetailViewDialogData,
} from './form-detail-view-dialog.component';

export interface FormHistoryDialogData {
  formId: string;
  formName: string;
}

/**
 * Dialog para mostrar el historial de versiones de un formulario
 */
@Component({
  selector: 'app-form-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="dialog-icon">history</mat-icon>
      Historial de Versiones
    </h2>

    <mat-dialog-content>
      <p class="dialog-subtitle text-body text-neutral-subheading mb-4">
        {{ data.formName }}
      </p>

      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="40" />
          <p class="text-body text-neutral-subheading mt-3">Cargando historial...</p>
        </div>
      } @else if (versions().length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">info</mat-icon>
          <p class="text-body">No hay versiones disponibles</p>
        </div>
      } @else {
        <div class="versions-timeline">
          @for (version of versions(); track version.id) {
            <div class="version-item" [class.current]="$index === 0">
              <div class="version-header">
                <div class="version-info">
                  <span class="version-number">
                    <mat-icon>label</mat-icon>
                    Versión {{ version.version }}
                  </span>
                  @if ($index === 0) {
                    <span class="current-badge">Actual</span>
                  }
                </div>
                <mat-chip [class]="getStatusChipClass(version.status)">
                  {{ getStatusLabel(version.status) }}
                </mat-chip>
              </div>

              <div class="version-details">
                @if (version.validFrom && version.validUntil) {
                  <div class="detail-row">
                    <mat-icon class="detail-icon">date_range</mat-icon>
                    <span class="detail-label">Vigencia:</span>
                    <span class="detail-value">{{
                      formatDateRange(version.validFrom, version.validUntil)
                    }}</span>
                  </div>
                }

                @if (version.createdAt) {
                  <div class="detail-row">
                    <mat-icon class="detail-icon">schedule</mat-icon>
                    <span class="detail-label">Creado:</span>
                    <span class="detail-value">{{ formatDateTime(version.createdAt) }}</span>
                  </div>
                }

                @if (version.updatedAt && version.updatedAt !== version.createdAt) {
                  <div class="detail-row">
                    <mat-icon class="detail-icon">update</mat-icon>
                    <span class="detail-label">Modificado:</span>
                    <span class="detail-value">{{ formatDateTime(version.updatedAt) }}</span>
                  </div>
                }

                @if (version.publishedAt) {
                  <div class="detail-row">
                    <mat-icon class="detail-icon">publish</mat-icon>
                    <span class="detail-label">Publicado:</span>
                    <span class="detail-value">{{ formatDateTime(version.publishedAt) }}</span>
                  </div>
                }
              </div>

              <div class="version-actions">
                <button
                  mat-stroked-button
                  color="primary"
                  (click)="viewVersionDetail(version)"
                  class="view-detail-btn"
                >
                  <mat-icon>visibility</mat-icon>
                  Ver Detalle
                </button>
              </div>
            </div>
          }
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

      .dialog-icon {
        vertical-align: middle;
        margin-right: 8px;
        color: var(--secondary);
      }

      .dialog-subtitle {
        font-weight: 500;
        margin-bottom: 16px;
      }

      mat-dialog-content {
        min-width: 500px;
        max-width: 600px;
        max-height: 70vh;
        overflow-y: auto;
      }

      .loading-state,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
      }

      .empty-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--neutral-subheading);
        margin-bottom: 12px;
      }

      .versions-timeline {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .version-item {
        padding: 16px;
        border: 1px solid var(--neutral-border);
        border-radius: 8px;
        background: var(--primary-white);
        transition: all 0.2s ease;

        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        &.current {
          border-color: var(--secondary);
          border-width: 2px;
          background: var(--secondary-light);
        }
      }

      .version-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .version-info {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .version-number {
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 600;
        color: var(--accent-titles);
        font-size: 16px;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .current-badge {
        padding: 2px 8px;
        background-color: var(--secondary);
        color: white;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .version-details {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;
      }

      .version-actions {
        display: flex;
        justify-content: flex-end;
        padding-top: 8px;
        border-top: 1px solid var(--neutral-border);
      }

      .view-detail-btn {
        mat-icon {
          margin-right: 4px;
        }
      }

      .detail-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }

      .detail-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--neutral-subheading);
      }

      .detail-label {
        font-weight: 500;
        color: var(--neutral-subheading);
        min-width: 80px;
      }

      .detail-value {
        color: var(--accent-titles);
      }

      mat-chip {
        font-size: 12px;
        min-height: 24px;
        padding: 0 8px;
      }

      .status-published {
        background-color: #e8f5e9;
        color: #2e7d32;
      }

      .status-draft {
        background-color: #fff3e0;
        color: #e65100;
      }

      .status-archived {
        background-color: #f5f5f5;
        color: #616161;
      }

      mat-dialog-actions {
        padding: 16px 24px;
        margin: 0;
      }

      @media (max-width: 768px) {
        mat-dialog-content {
          min-width: unset;
          width: 100%;
        }

        .version-item {
          padding: 12px;
        }

        .version-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
      }
    `,
  ],
})
export class FormHistoryDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<FormHistoryDialogComponent>);
  private companyFormService = inject(CompanyFormService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);
  data = inject<FormHistoryDialogData>(MAT_DIALOG_DATA);

  // Estado
  loading = signal(true);
  versions = signal<FormSchemaResponse[]>([]);

  ngOnInit(): void {
    this.loadHistory();
  }

  /**
   * Carga el historial de versiones
   */
  private loadHistory(): void {
    this.loading.set(true);
    this.companyFormService.getFormHistory(this.data.formId).subscribe({
      next: (history) => {
        // Ordenar por versión descendente (más reciente primero)
        const sorted = history.sort((a, b) => (b.version || 0) - (a.version || 0));
        this.versions.set(sorted);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando historial:', error);
        const message = error?.error?.message || 'Error al cargar historial de versiones';
        this.notification.error(message);
        this.loading.set(false);
        this.close();
      },
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
   * Formatea rango de fechas
   */
  formatDateRange(from: string | null, until: string | null): string {
    if (!from || !until) return 'Sin definir';
    const fromParsed = parseDateValue(from);
    const untilParsed = parseDateValue(until);
    if (!fromParsed || !untilParsed) return 'Sin definir';

    const fromDate = fromParsed.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const untilDate = untilParsed.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return `${fromDate} - ${untilDate}`;
  }

  /**
   * Formatea fecha y hora
   */
  formatDateTime(dateString: string): string {
    const date = parseDateValue(dateString);
    if (!date) return 'Fecha inválida';
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Abre el dialog de vista detallada para una versión específica
   */
  viewVersionDetail(version: FormSchemaResponse): void {
    const dialogData: FormDetailViewDialogData = {
      formId: version.id,
      version: version.version,
    };

    this.dialog.open(FormDetailViewDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: dialogData,
    });
  }

  /**
   * Cierra el dialog
   */
  close(): void {
    this.dialogRef.close();
  }
}
