import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-collector-status-guide-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <h2 mat-dialog-title class="dialog-title text-accent-titles">
      Guía de estados de recolectores
    </h2>

    <mat-dialog-content>
      <div class="guide-content">
        <div class="status-row">
          <mat-chip class="status-active">Activo</mat-chip>
          <span
            >El recolector puede ser asignado a una brigada y puede registrar actividades en el
            proyecto.</span
          >
        </div>

        <div class="status-row">
          <mat-chip class="status-inactive">Inactivo</mat-chip>
          <span
            >El recolector pertenece al proyecto pero temporalmente no tiene actividad ni se le
            pueden asignar nuevas brigadas.</span
          >
        </div>

        <div class="status-row">
          <mat-chip class="status-archived">Archivado</mat-chip>
          <span>Baja definitiva del proyecto. No puede volver a cambiar de estado.</span>
        </div>
        <div class="transitions">
          <p class="transitions-title">Transiciones permitidas</p>
          <ul>
            <li>Activo → Inactivo</li>
            <li>Inactivo → Activo</li>
            <li>Activo/Inactivo → Archivado</li>
          </ul>
          <p class="transitions-note">Archivado no permite cambios.</p>
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
    .transitions {
      border-top: 1px solid #e5e5e5;
      padding-top: 0.75rem;
      font-size: 0.875rem;
    }

    .transitions-title {
      margin: 0 0 0.5rem;
      font-weight: 600;
    }

    .transitions ul {
      margin: 0;
      padding-left: 1.25rem;
    }

    .transitions-note {
      margin: 0.5rem 0 0;
      font-weight: 500;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorStatusGuideDialogComponent {
  private dialogRef = inject(MatDialogRef<CollectorStatusGuideDialogComponent>);

  close(): void {
    this.dialogRef.close();
  }
}
