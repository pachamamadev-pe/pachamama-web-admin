import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-collector-assignment-status-guide-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <h2 mat-dialog-title class="dialog-title text-accent-titles">Guía de estados de asignación</h2>

    <mat-dialog-content>
      <div class="guide-content">
        <div class="status-row">
          <mat-chip class="status-active">Activo</mat-chip>
          <span>Participa normalmente y puede registrar actividades.</span>
        </div>

        <div class="status-row">
          <mat-chip class="status-inactive">Inactivo</mat-chip>
          <span>Suspensión temporal (ej. descanso médico o contratiempo).</span>
        </div>

        <div class="status-row">
          <mat-chip class="status-archived">Archivado</mat-chip>
          <span>Estado final: el recolector ya no participará en el proyecto.</span>
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
export class CollectorAssignmentStatusGuideDialogComponent {
  private dialogRef = inject(MatDialogRef<CollectorAssignmentStatusGuideDialogComponent>);

  close(): void {
    this.dialogRef.close();
  }
}
