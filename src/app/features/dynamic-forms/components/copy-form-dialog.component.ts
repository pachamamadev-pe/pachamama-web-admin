import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { CompanyFormService } from '../services/company-form.service';
import { NotificationService } from '@core/services/notification.service';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { UploadResult } from '@core/services/file-upload.service';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';
import { FormSchemaResponse } from '../models/dynamic-form.model';
import { FormCopyRequest } from '../models/form-copy-request.dto';

export interface CopyFormDialogData {
  form: FormSchemaResponse;
}

/**
 * Dialog para copiar un formulario existente con personalización
 */
@Component({
  selector: 'app-copy-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    ImageUploadComponent,
  ],
  template: `
    <div class="dialog-header">
      <div class="header-icon">
        <mat-icon>content_copy</mat-icon>
      </div>
      <div class="header-text">
        <h2 mat-dialog-title>Copiar Formulario</h2>
        <p class="subtitle">Crea una copia personalizada del formulario</p>
      </div>
      <button mat-icon-button (click)="close()" class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content>
      <!-- Información del formulario origen -->
      <div class="origin-info">
        <div class="info-header">
          <mat-icon>info</mat-icon>
          <h3>Formulario origen</h3>
        </div>
        <div class="info-card">
          @if (originLogoUrl()) {
            <img [src]="originLogoUrl()!" alt="Logo" class="origin-logo" />
          }
          <div class="info-content">
            <div class="info-row">
              <span class="info-label">Nombre:</span>
              <span class="info-value">{{ data.form.name }}</span>
            </div>
            @if (data.form.description) {
              <div class="info-row">
                <span class="info-label">Descripción:</span>
                <span class="info-value">{{ data.form.description }}</span>
              </div>
            }
            <div class="info-row">
              <span class="info-label">Versión:</span>
              <mat-chip class="version-chip">v{{ data.form.version || 1 }}</mat-chip>
            </div>
            <div class="info-row">
              <span class="info-label">Estado:</span>
              <mat-chip [class]="getStatusClass(data.form.status)">
                {{ getStatusLabel(data.form.status) }}
              </mat-chip>
            </div>
          </div>
        </div>
      </div>

      <div class="info-notice">
        <mat-icon>lightbulb</mat-icon>
        <p>
          El nuevo formulario se creará en estado <strong>Borrador</strong> y heredará todas las
          preguntas y configuraciones del formulario origen. Podrás editarlo posteriormente desde la
          opción <strong>Editar</strong>.
        </p>
      </div>

      <!-- Formulario de personalización -->
      <div class="customization-section">
        <h3 class="section-title">Personaliza tu copia</h3>

        <!-- Nombre -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nuevo nombre</mat-label>
          <input
            matInput
            [ngModel]="newName()"
            (ngModelChange)="newName.set($event)"
            [placeholder]="data.form.name + ' - Copia'"
          />
          <mat-icon matPrefix>title</mat-icon>
          <mat-hint>Si lo dejas vacío, se usará el nombre original + " - Copia"</mat-hint>
        </mat-form-field>

        <!-- Descripción -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nueva descripción (opcional)</mat-label>
          <textarea
            matInput
            [ngModel]="newDescription()"
            (ngModelChange)="newDescription.set($event)"
            rows="3"
            placeholder="Describe el propósito de esta copia..."
          ></textarea>
          <mat-icon matPrefix>description</mat-icon>
        </mat-form-field>

        <!-- Logo personalizado -->
        <div class="logo-section">
          <div class="logo-label">Nuevo logo (opcional)</div>
          <p class="logo-hint">
            Puedes subir un logo diferente o dejar vacío para heredar el original
          </p>
          <app-image-upload
            [maxSizeMB]="5"
            [allowedTypes]="['image/jpeg', 'image/png', 'image/svg+xml']"
            [directory]="'dynamic-forms'"
            [currentImageUrl]="null"
            (fileUploaded)="onImageUploaded($event)"
            (fileRemoved)="onImageRemoved()"
          />
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close()" [disabled]="copying()">Cancelar</button>
      <button mat-raised-button class="btn-primary" (click)="copyForm()" [disabled]="copying()">
        @if (copying()) {
          <mat-spinner diameter="20" class="inline-spinner" />
          <span>Copiando...</span>
        } @else {
          <ng-container>
            <mat-icon>content_copy</mat-icon>
            <span>Crear Copia</span>
          </ng-container>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .dialog-header {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 24px 24px 16px;
        border-bottom: 1px solid var(--neutral-border);
      }

      .header-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: var(--secondary-light);
        flex-shrink: 0;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          color: var(--secondary);
        }
      }

      .header-text {
        flex: 1;

        h2[mat-dialog-title] {
          margin: 0 0 4px;
          font-size: 20px;
          font-weight: 700;
          color: var(--accent-titles);
        }

        .subtitle {
          margin: 0;
          font-size: 14px;
          color: var(--neutral-subheading);
        }
      }

      .close-button {
        margin-top: -8px;
        margin-right: -8px;
      }

      mat-dialog-content {
        padding: 24px;
        max-width: 600px;
        min-width: 500px;
      }

      .origin-info {
        margin-bottom: 24px;
        padding: 20px;
        background: #fafafa;
        border-radius: 12px;
        border-left: 4px solid var(--secondary);
      }

      .info-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;

        mat-icon {
          color: var(--secondary);
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--accent-titles);
        }
      }

      .info-card {
        display: flex;
        gap: 16px;
      }

      .origin-logo {
        width: 80px;
        height: 80px;
        object-fit: contain;
        border-radius: 8px;
        background: white;
        padding: 8px;
        flex-shrink: 0;
      }

      .info-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .info-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }

      .info-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--neutral-subheading);
        min-width: 80px;
      }

      .info-value {
        font-size: 14px;
        color: var(--accent-titles);
        font-weight: 500;
        flex: 1;
      }

      .version-chip {
        font-size: 12px;
        min-height: 24px;
        padding: 0 8px;
        background: #e3f2fd;
        color: #1565c0;
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

      .info-notice {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        background: #e8f5e9;
        border-radius: 8px;
        margin-bottom: 24px;

        mat-icon {
          color: var(--secondary);
          font-size: 24px;
          width: 24px;
          height: 24px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        p {
          margin: 0;
          font-size: 14px;
          color: var(--accent-titles);
          line-height: 1.6;

          strong {
            font-weight: 600;
            color: var(--secondary);
          }
        }
      }

      .customization-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--accent-titles);
        margin: 0 0 8px 0;
      }

      .full-width {
        width: 100%;
      }

      .logo-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .logo-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--accent-titles);
      }

      .logo-hint {
        font-size: 13px;
        color: var(--neutral-subheading);
        margin: 0;
      }

      mat-dialog-actions {
        padding: 16px 24px;
        border-top: 1px solid var(--neutral-border);
      }

      .btn-primary {
        background-color: var(--secondary);
        color: white;

        &:hover:not(:disabled) {
          background-color: #1a6b47;
        }

        &:disabled {
          background-color: #cccccc;
        }
      }

      .inline-spinner {
        display: inline-block;
        margin-right: 8px;
      }

      @media (max-width: 768px) {
        mat-dialog-content {
          min-width: unset;
          width: 100%;
        }

        .info-card {
          flex-direction: column;
          align-items: center;
        }
      }
    `,
  ],
})
export class CopyFormDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<CopyFormDialogComponent>);
  private companyFormService = inject(CompanyFormService);
  private azureStorage = inject(AzureStorageService);
  private notification = inject(NotificationService);
  data = inject<CopyFormDialogData>(MAT_DIALOG_DATA);

  // Estado
  copying = signal(false);
  originLogoUrl = signal<string | null>(null);

  // Campos de personalización
  newName = signal<string>('');
  newDescription = signal<string>('');
  newLogoUrl = signal<string | null>(null);

  ngOnInit(): void {
    // Cargar logo del formulario origen si existe
    if (this.data.form.customLogoUrl) {
      this.azureStorage.getFileUrl(this.data.form.customLogoUrl, 5).subscribe({
        next: (url) => this.originLogoUrl.set(url),
        error: (error) => console.error('Error cargando logo origen:', error),
      });
    }
  }

  /**
   * Maneja la subida de imagen para el nuevo logo
   */
  onImageUploaded(result: UploadResult): void {
    this.newLogoUrl.set(result.relativePath);
  }

  /**
   * Maneja la eliminación del logo
   */
  onImageRemoved(): void {
    this.newLogoUrl.set(null);
  }

  /**
   * Copia el formulario con los datos personalizados
   */
  copyForm(): void {
    this.copying.set(true);

    const request: FormCopyRequest = {
      newName: this.newName().trim() || null,
      newDescription: this.newDescription().trim() || null,
      newCustomLogoUrl: this.newLogoUrl(),
      targetProjectId: null, // Por ahora null, podrías agregar un selector de proyecto
    };

    this.companyFormService.copyForm(this.data.form.id, request).subscribe({
      next: (result) => {
        const message = `Formulario copiado exitosamente: "${result.name}" (v${result.version})`;
        this.notification.success(message);
        this.copying.set(false);
        this.dialogRef.close({ success: true, form: result });
      },
      error: (error) => {
        console.error('Error copiando formulario:', error);
        const message =
          error?.error?.message || 'Error al copiar formulario. Por favor, intenta nuevamente.';
        this.notification.error(message);
        this.copying.set(false);
      },
    });
  }

  /**
   * Obtiene la clase CSS según el estado del formulario
   */
  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      published: 'status-published',
      draft: 'status-draft',
      archived: 'status-archived',
    };
    return classes[status] || '';
  }

  /**
   * Obtiene el label del estado
   */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      published: 'Publicado',
      draft: 'Borrador',
      archived: 'Archivado',
    };
    return labels[status] || status;
  }

  /**
   * Cierra el dialog
   */
  close(): void {
    this.dialogRef.close();
  }
}
