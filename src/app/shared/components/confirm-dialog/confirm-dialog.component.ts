import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Datos para el dialog de confirmación
 */
export interface ConfirmDialogData {
  /** Título del dialog */
  title: string;
  /** Mensaje descriptivo */
  message: string;
  /** Texto del botón de confirmación (default: "Confirmar") */
  confirmText?: string;
  /** Texto del botón de cancelar (default: "Cancelar") */
  cancelText?: string;
  /** Tipo de confirmación (afecta colores e icono) */
  type?: 'warning' | 'danger' | 'info';
  /** Icono personalizado (opcional, se auto-selecciona según type) */
  icon?: string;
}

/**
 * Componente de dialog de confirmación reutilizable
 * Diseñado con los colores y estilo de Pachamama
 *
 * @example
 * ```typescript
 * const dialogRef = this.dialog.open(ConfirmDialogComponent, {
 *   data: {
 *     title: '¿Eliminar producto?',
 *     message: 'Esta acción no se puede deshacer.',
 *     confirmText: 'Eliminar',
 *     type: 'danger'
 *   }
 * });
 *
 * dialogRef.afterClosed().subscribe(confirmed => {
 *   if (confirmed) {
 *     // Usuario confirmó
 *   }
 * });
 * ```
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog">
      <!-- Icono -->
      <div class="icon-container" [class]="iconContainerClass">
        <mat-icon class="dialog-icon">{{ displayIcon }}</mat-icon>
      </div>

      <!-- Contenido -->
      <h2 mat-dialog-title class="dialog-title">{{ data.title }}</h2>
      <mat-dialog-content class="dialog-content">
        <p class="dialog-message">{{ data.message }}</p>
      </mat-dialog-content>

      <!-- Acciones -->
      <mat-dialog-actions class="dialog-actions">
        <button mat-stroked-button (click)="onCancel()" class="btn-cancel">
          {{ data.cancelText || 'Cancelar' }}
        </button>
        <button mat-flat-button (click)="onConfirm()" [class]="confirmButtonClass">
          {{ data.confirmText || 'Confirmar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .confirm-dialog {
        @apply text-center p-6;
        min-width: 320px;
        max-width: 400px;
      }

      .icon-container {
        @apply w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center;
      }

      .icon-container.warning {
        @apply bg-amber-100;
      }

      .icon-container.danger {
        @apply bg-red-100;
      }

      .icon-container.info {
        @apply bg-blue-100;
      }

      .dialog-icon {
        @apply text-4xl;
        width: 40px;
        height: 40px;
        font-size: 40px;
      }

      .icon-container.warning .dialog-icon {
        @apply text-amber-600;
      }

      .icon-container.danger .dialog-icon {
        @apply text-red-600;
      }

      .icon-container.info .dialog-icon {
        @apply text-blue-600;
      }

      .dialog-title {
        @apply text-xl font-bold text-accent-titles mb-3;
      }

      .dialog-content {
        @apply mb-6;
        overflow: hidden;
      }

      .dialog-message {
        @apply text-body text-neutral-subheading;
      }

      .dialog-actions {
        @apply flex justify-center gap-3;
      }

      .btn-cancel {
        @apply border-neutral-border text-neutral-subheading;
      }

      .btn-confirm-warning {
        @apply bg-amber-600 text-white;

        &:hover {
          @apply bg-amber-700;
        }
      }

      .btn-confirm-danger {
        @apply bg-red-600 text-white;

        &:hover {
          @apply bg-red-700;
        }
      }

      .btn-confirm-info {
        @apply bg-secondary text-white;

        &:hover {
          @apply bg-secondary/90;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

  get displayIcon(): string {
    if (this.data.icon) {
      return this.data.icon;
    }

    switch (this.data.type) {
      case 'warning':
        return 'warning';
      case 'danger':
        return 'delete_forever';
      case 'info':
        return 'info';
      default:
        return 'help_outline';
    }
  }

  get iconContainerClass(): string {
    return this.data.type || 'info';
  }

  get confirmButtonClass(): string {
    switch (this.data.type) {
      case 'warning':
        return 'btn-confirm-warning';
      case 'danger':
        return 'btn-confirm-danger';
      case 'info':
        return 'btn-confirm-info';
      default:
        return 'btn-confirm-info';
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
