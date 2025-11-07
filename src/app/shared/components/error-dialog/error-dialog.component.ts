import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ErrorDialogData {
  title?: string;
  message: string;
  details?: string;
  action?: 'retry' | 'close' | 'both';
}

/**
 * Componente de diálogo para mostrar errores críticos
 */
@Component({
  selector: 'app-error-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="error-dialog">
      <div class="error-header">
        <mat-icon class="error-icon">error_outline</mat-icon>
        <h2 mat-dialog-title class="text-title font-bold text-accent-titles">
          {{ data.title || 'Error' }}
        </h2>
      </div>

      <mat-dialog-content class="error-content">
        <p class="text-body text-accent-titles">{{ data.message }}</p>

        @if (data.details) {
          <details class="error-details mt-4">
            <summary class="text-subtitle text-neutral-subheading cursor-pointer">
              Ver detalles técnicos
            </summary>
            <pre class="text-subtitle text-neutral-subheading mt-2 p-3 bg-gray-100 rounded">{{
              data.details
            }}</pre>
          </details>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        @if (data.action === 'both' || data.action === 'retry') {
          <button mat-stroked-button (click)="onRetry()">
            <mat-icon>refresh</mat-icon>
            Reintentar
          </button>
        }
        <button mat-raised-button class="btn-primary" (click)="onClose()">Cerrar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .error-dialog {
        @apply min-w-[320px] max-w-[500px];
      }

      .error-header {
        @apply flex items-center gap-3 pb-4;
      }

      .error-icon {
        @apply text-red-500;
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .error-content {
        @apply py-4;
      }

      .error-details pre {
        @apply overflow-x-auto text-xs;
        max-height: 200px;
      }

      .dialog-actions {
        @apply gap-2 pt-4;
      }
    `,
  ],
})
export class ErrorDialogComponent {
  private dialogRef = inject(MatDialogRef<ErrorDialogComponent>);
  public data = inject<ErrorDialogData>(MAT_DIALOG_DATA);

  onClose(): void {
    this.dialogRef.close(false);
  }

  onRetry(): void {
    this.dialogRef.close(true);
  }
}
