import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BrigadesService } from '../services/brigades.service';
import { NotificationService } from '@core/services/notification.service';
import { CreateBrigadeRequest } from '../models/create-brigade.request';

interface BrigadeFormDialogData {
  projectCommunityId: string;
}

@Component({
  selector: 'app-brigade-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 class="dialog-title">Crear Brigada</h2>
        <button mat-icon-button (click)="close()" type="button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dialog-form">
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" placeholder="Brigada A" />
            @if (form.get('name')?.invalid && form.get('name')?.touched) {
              <mat-error>El nombre es requerido</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Descripción</mat-label>
            <textarea
              matInput
              formControlName="description"
              rows="3"
              placeholder="Descripción de la brigada"
            ></textarea>
          </mat-form-field>
        </div>

        <div class="dialog-actions">
          <button mat-stroked-button type="button" (click)="close()">Cancelar</button>
          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || submitting()"
            class="btn-primary"
          >
            @if (submitting()) {
              <ng-container>
                <mat-icon class="spin">cached</mat-icon>
                <span>Creando...</span>
              </ng-container>
            } @else {
              <ng-container>
                <mat-icon>save</mat-icon>
                <span>Crear</span>
              </ng-container>
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .dialog-container {
      display: flex;
      flex-direction: column;
      width: 600px;
      max-width: 90vw;
    }
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e5e5e5;
    }
    .dialog-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #0a0a0a;
    }
    .dialog-form {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 0 24px 24px;
    }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrigadeFormDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<BrigadeFormDialogComponent>);
  private brigadesService = inject(BrigadesService);
  private notification = inject(NotificationService);
  private data = inject<BrigadeFormDialogData>(MAT_DIALOG_DATA);

  submitting = signal(false);

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: [''],
  });

  private generateCode(): string {
    // Prefijo BRIGADA- + sufijo aleatorio base36 de 5 caracteres
    return (
      'BRIGADA-' +
      Math.random()
        .toString(36)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(2, 7)
    );
  }

  private generateQr(code: string, name: string): string {
    // Reutiliza el código; podría incorporar nombre si se requiere
    return code + '-' + name;
  }

  close(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    const value = this.form.value;
    const code = this.generateCode();
    const payload: CreateBrigadeRequest = {
      projectCommunityId: this.data.projectCommunityId,
      code,
      name: value.name.trim(),
      description: value.description?.trim() || undefined,
      qrCode: this.generateQr(code, value.name.trim()),
    };
    this.brigadesService.createBrigade(payload).subscribe({
      next: () => {
        this.notification.success('Brigada creada correctamente');
        this.submitting.set(false);
        this.dialogRef.close({ created: true });
      },
      error: (error) => {
        console.error('Error creando brigada:', error);
        this.notification.error('Error al crear la brigada');
        this.submitting.set(false);
      },
    });
  }
}
