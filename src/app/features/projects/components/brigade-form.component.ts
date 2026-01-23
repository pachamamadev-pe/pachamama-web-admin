import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BrigadesService } from '../services/brigades.service';
import { NotificationService } from '@core/services/notification.service';
import { CreateBrigadeRequest } from '../models/create-brigade.request';
import { Brigade } from '../models/brigade.model';

interface BrigadeFormDialogData {
  projectCommunityId: string;
  mode?: 'create' | 'edit';
  brigade?: Brigade;
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
    MatSlideToggleModule,
  ],
  template: `
    <div class="dialog-container">
      <!-- Header -->
      <header class="dialog-header">
        <div class="header-content">
          <div class="header-icon">
            <mat-icon class="text-secondary">{{ isEditMode() ? 'edit' : 'group_add' }}</mat-icon>
          </div>
          <div class="header-text">
            <h2 class="text-title font-bold text-accent-titles">
              {{ isEditMode() ? 'Editar Brigada' : 'Crear Nueva Brigada' }}
            </h2>
            <p class="text-subtitle text-neutral-subheading">
              {{
                isEditMode()
                  ? 'Modifica la información de la brigada'
                  : 'Completa la información de la brigada'
              }}
            </p>
          </div>
        </div>
        <button mat-icon-button (click)="close()" type="button" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <!-- Form Content -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="dialog-content">
          <div class="form-section">
            <h3 class="section-title text-body font-bold text-accent-titles">Información Básica</h3>

            <div class="form-grid">
              <!-- Nombre -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nombre de la Brigada</mat-label>
                <mat-icon matPrefix class="field-icon">badge</mat-icon>
                <input
                  matInput
                  formControlName="name"
                  placeholder="Ej: Brigada Norte, Brigada A"
                  maxlength="100"
                />
                @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
                  <mat-error>El nombre de la brigada es requerido</mat-error>
                }
                @if (form.get('name')?.hasError('minlength')) {
                  <mat-error>El nombre debe tener al menos 3 caracteres</mat-error>
                }
                <mat-hint align="end">{{ form.get('name')?.value?.length || 0 }}/100</mat-hint>
              </mat-form-field>

              <!-- Descripción -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Descripción (Opcional)</mat-label>
                <mat-icon matPrefix class="field-icon">description</mat-icon>
                <textarea
                  matInput
                  formControlName="description"
                  rows="4"
                  placeholder="Describe el área de trabajo, objetivos o responsabilidades de esta brigada"
                  maxlength="500"
                ></textarea>
                <mat-hint align="end">
                  {{ form.get('description')?.value?.length || 0 }}/500
                </mat-hint>
              </mat-form-field>

              <!-- Status Toggle (solo en modo edición) -->
              @if (isEditMode()) {
                <div class="status-toggle-container">
                  <div class="status-info">
                    <mat-icon class="status-icon">{{
                      form.get('status')?.value === 'active' ? 'check_circle' : 'cancel'
                    }}</mat-icon>
                    <div class="status-text">
                      <span class="status-label">Estado de la Brigada</span>
                      <span class="status-description">{{
                        form.get('status')?.value === 'active'
                          ? 'La brigada está activa y puede recibir asignaciones'
                          : 'La brigada está inactiva y no recibirá nuevas asignaciones'
                      }}</span>
                    </div>
                  </div>
                  <mat-slide-toggle
                    color="primary"
                    [checked]="form.get('status')?.value === 'active'"
                    (change)="onStatusChange($event.checked)"
                  >
                    {{ form.get('status')?.value === 'active' ? 'Activa' : 'Inactiva' }}
                  </mat-slide-toggle>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Actions -->
        <footer class="dialog-footer">
          <button mat-stroked-button type="button" (click)="close()" [disabled]="submitting()">
            Cancelar
          </button>
          <button
            mat-raised-button
            type="submit"
            [disabled]="form.invalid || submitting()"
            class="btn-primary"
          >
            @if (submitting()) {
              <span class="button-content">
                <mat-icon class="button-icon spin">hourglass_empty</mat-icon>
                {{ isEditMode() ? 'Guardando...' : 'Creando...' }}
              </span>
            } @else {
              <span class="button-content">
                <mat-icon class="button-icon">{{ isEditMode() ? 'save' : 'add_circle' }}</mat-icon>
                {{ isEditMode() ? 'Guardar Cambios' : 'Crear Brigada' }}
              </span>
            }
          </button>
        </footer>
      </form>
    </div>
  `,
  styles: `
    .dialog-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      background: #ffffff;
    }

    /* Header */
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 24px;
      border-bottom: 1px solid #e5e5e5;
      background: #f9fafb;
    }

    .header-content {
      display: flex;
      gap: 16px;
      flex: 1;
    }

    .header-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #f4fbf6;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    .header-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;

      h2 {
        margin: 0;
        font-size: 20px;
        line-height: 1.3;
      }

      p {
        margin: 0;
        font-size: 13px;
      }
    }

    .close-button {
      flex-shrink: 0;
      margin: -8px -8px 0 0;
    }

    /* Content */
    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-title {
      margin: 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #f4fbf6;
      font-size: 15px;
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .field-icon {
      color: #737373;
      margin-right: 8px;
    }

    /* Status Toggle */
    .status-toggle-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: #f9fafb;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      gap: 16px;
    }

    .status-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .status-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #218358;
    }

    .status-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .status-label {
      font-size: 14px;
      font-weight: 600;
      color: #0a0a0a;
    }

    .status-description {
      font-size: 13px;
      color: #737373;
      line-height: 1.4;
    }

    /* Info Box */
    .info-box {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
    }

    .info-icon {
      color: #0284c7;
      font-size: 24px;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    .info-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .info-title {
      margin: 0;
      color: #0c4a6e;
      font-size: 14px;
    }

    .info-text {
      margin: 0;
      color: #075985;
      font-size: 13px;
      line-height: 1.5;
    }

    /* Footer */
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e5e5e5;
      background: #f9fafb;
    }

    .button-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-right: 4px;
    }

    .button-content {
      display: flex;
      align-items: center;
      gap: 4px;
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

    /* Responsive */
    @media (max-width: 640px) {
      .dialog-container {
        max-width: 100vw;
        max-height: 100vh;
      }

      .dialog-header,
      .dialog-content,
      .dialog-footer {
        padding: 16px;
      }

      .header-icon {
        width: 40px;
        height: 40px;

        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }
      }

      .header-text h2 {
        font-size: 18px;
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
  isEditMode = signal(this.data.mode === 'edit');

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
    status: ['active'], // Solo se usa en modo edición
  });

  constructor() {
    if (this.isEditMode() && this.data.brigade) {
      this.form.patchValue({
        name: this.data.brigade.name,
        description: this.data.brigade.description || '',
        status: this.data.brigade.status,
      });
    }
  }

  onStatusChange(isActive: boolean): void {
    this.form.patchValue({ status: isActive ? 'active' : 'inactive' });
  }

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

    if (this.isEditMode() && this.data.brigade) {
      // Modo edición
      const updatePayload = {
        name: value.name.trim(),
        description: value.description?.trim() || undefined,
        status: value.status,
      };

      this.brigadesService.updateBrigade(this.data.brigade.id, updatePayload).subscribe({
        next: () => {
          this.notification.success('Brigada actualizada correctamente');
          this.submitting.set(false);
          this.dialogRef.close({ updated: true });
        },
        error: (error) => {
          console.error('Error actualizando brigada:', error);
          this.notification.error('Error al actualizar la brigada');
          this.submitting.set(false);
        },
      });
    } else {
      // Modo creación
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
}
