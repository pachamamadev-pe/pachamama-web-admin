import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-brigade-status-guide-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <h2 mat-dialog-title class="dialog-title text-accent-titles">Guía de estados de brigada</h2>

    <mat-dialog-content>
      <div class="guide-content">
        <div class="status-row">
          <mat-chip class="status-active">Activo</mat-chip>
          <span>Puede agregarse miembros de brigada.</span>
        </div>

        <div class="status-row">
          <mat-chip class="status-inactive">Inactivo</mat-chip>
          <span>Operativo pero no puede agregarse miembros de brigada.</span>
        </div>

        <div class="status-row">
          <mat-chip class="status-archived">Archivado</mat-chip>
          <span
            >No puede volver a cambiar de estado y cuando se archiva se termina la asignación de la
            brigada y sus miembros.</span
          >
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="close()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .guide-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-top: 0.25rem;
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
    }

    .status-active {
      background-color: #f4fbf6;
      color: #218358;
      border: 1px solid #218358;
    }

    .status-inactive {
      background-color: #fef3f2;
      color: #dc2626;
      border: 1px solid #dc2626;
    }

    .status-archived {
      background-color: #f3f4f6;
      color: #6b7280;
      border: 1px solid #9ca3af;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrigadeStatusGuideDialogComponent {
  private dialogRef = inject(MatDialogRef<BrigadeStatusGuideDialogComponent>);

  close(): void {
    this.dialogRef.close();
  }
}
