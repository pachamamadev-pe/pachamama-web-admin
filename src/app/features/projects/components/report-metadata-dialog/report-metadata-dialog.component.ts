import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { QuillEditorComponent } from 'ngx-quill';

export interface ReportMetadata {
  objetivo: string;
  finalidad: string;
  baseLegal: string;
  alcance: string;
  generalidades: string;
  lineamientos: string;
}

/**
 * Diálogo para capturar metadatos del reporte de actividades
 * Usa editores Quill para permitir formato HTML en cada campo
 */
@Component({
  selector: 'app-report-metadata-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    QuillEditorComponent,
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div>
          <h2 class="dialog-title">Metadatos del Reporte</h2>
          <p class="dialog-subtitle">Complete los campos para generar el reporte de actividades</p>
        </div>
        <button mat-icon-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content">
        <form [formGroup]="form">
          <mat-tab-group animationDuration="0ms" class="metadata-tabs">
            <!-- Tab 1: Objetivo -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="tab-icon">flag</mat-icon>
                Objetivo
              </ng-template>
              <div class="tab-content">
                <quill-editor
                  formControlName="objetivo"
                  [modules]="quillModules"
                  [styles]="editorStyles"
                  placeholder="Escribe el objetivo del documento..."
                  theme="snow"
                ></quill-editor>
              </div>
            </mat-tab>

            <!-- Tab 2: Finalidad -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="tab-icon">check_circle</mat-icon>
                Finalidad
              </ng-template>
              <div class="tab-content">
                <quill-editor
                  formControlName="finalidad"
                  [modules]="quillModules"
                  [styles]="editorStyles"
                  placeholder="Escribe la finalidad del documento..."
                  theme="snow"
                ></quill-editor>
              </div>
            </mat-tab>

            <!-- Tab 3: Base Legal -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="tab-icon">gavel</mat-icon>
                Base Legal
              </ng-template>
              <div class="tab-content">
                <quill-editor
                  formControlName="baseLegal"
                  [modules]="quillModules"
                  [styles]="editorStyles"
                  placeholder="Escribe la base legal del documento..."
                  theme="snow"
                ></quill-editor>
              </div>
            </mat-tab>

            <!-- Tab 4: Alcance -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="tab-icon">open_in_full</mat-icon>
                Alcance
              </ng-template>
              <div class="tab-content">
                <quill-editor
                  formControlName="alcance"
                  [modules]="quillModules"
                  [styles]="editorStyles"
                  placeholder="Escribe el alcance del documento..."
                  theme="snow"
                ></quill-editor>
              </div>
            </mat-tab>

            <!-- Tab 5: Generalidades -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="tab-icon">description</mat-icon>
                Generalidades
              </ng-template>
              <div class="tab-content">
                <quill-editor
                  formControlName="generalidades"
                  [modules]="quillModules"
                  [styles]="editorStyles"
                  placeholder="Escribe las generalidades del documento..."
                  theme="snow"
                ></quill-editor>
              </div>
            </mat-tab>

            <!-- Tab 6: Lineamientos -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="tab-icon">list</mat-icon>
                Lineamientos
              </ng-template>
              <div class="tab-content">
                <quill-editor
                  formControlName="lineamientos"
                  [modules]="quillModules"
                  [styles]="editorStyles"
                  placeholder="Escribe los lineamientos del documento..."
                  theme="snow"
                ></quill-editor>
              </div>
            </mat-tab>
          </mat-tab-group>
        </form>

        <!-- Helper text -->
        <div class="helper-text">
          <mat-icon class="helper-icon">info</mat-icon>
          <p>
            Todos los campos son opcionales. Usa el editor para dar formato al contenido. Los campos
            vacíos no aparecerán en el reporte.
          </p>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-stroked-button (click)="onCancel()">Cancelar</button>
        <button mat-raised-button class="btn-primary" (click)="onGenerate()">
          <mat-icon>picture_as_pdf</mat-icon>
          <span>Generar Reporte</span>
        </button>
      </div>
    </div>
  `,
  styles: `
    .dialog-container {
      display: flex;
      flex-direction: column;
      width: 800px;
      max-width: 95vw;
      height: 700px;
      max-height: 90vh;

      @media (max-width: 768px) {
        width: 100%;
        height: 100%;
        max-height: 100vh;
      }
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e5e5;
      gap: 1rem;
      flex-shrink: 0;
    }

    .dialog-title {
      font-size: 20px;
      font-weight: 700;
      color: #0a0a0a;
      margin: 0;
    }

    .dialog-subtitle {
      font-size: 14px;
      color: #737373;
      margin: 0.25rem 0 0 0;
    }

    .dialog-content {
      flex: 1;
      overflow: hidden;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .metadata-tabs {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      :deep(.mat-mdc-tab-group) {
        height: 100%;
      }

      :deep(.mat-mdc-tab-body-wrapper) {
        flex: 1;
        overflow: hidden;
      }

      :deep(.mat-mdc-tab-labels) {
        background: #fafafa;
        border-bottom: 2px solid #e5e5e5;
      }

      :deep(.mat-mdc-tab) {
        min-width: 100px;
      }

      :deep(.mat-mdc-tab.mat-mdc-tab-active) {
        .tab-icon {
          color: #218358;
        }
      }
    }

    .tab-icon {
      margin-right: 0.5rem;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .tab-content {
      padding: 1rem;
      height: 100%;
      display: flex;
      flex-direction: column;

      quill-editor {
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      :deep(.ql-toolbar) {
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        background-color: #fafafa;
        border: 1px solid #e5e5e5;
      }

      :deep(.ql-container) {
        flex: 1;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
        border: 1px solid #e5e5e5;
        border-top: none;
        font-size: 14px;
        font-family: inherit;
      }

      :deep(.ql-editor) {
        min-height: 300px;
        padding: 1rem;
      }

      :deep(.ql-editor.ql-blank::before) {
        color: #737373;
        font-style: normal;
      }
    }

    .helper-text {
      display: flex;
      gap: 0.5rem;
      padding: 1rem;
      background-color: #f4fbf6;
      border-radius: 8px;
      border-left: 3px solid #218358;
      flex-shrink: 0;

      p {
        margin: 0;
        font-size: 13px;
        color: #0a0a0a;
        line-height: 1.5;
      }
    }

    .helper-icon {
      color: #218358;
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e5e5;
      flex-shrink: 0;

      button {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportMetadataDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ReportMetadataDialogComponent>);
  readonly data = inject<ReportMetadata | null>(MAT_DIALOG_DATA, { optional: true });

  form = new FormGroup({
    objetivo: new FormControl<string>(this.data?.objetivo || ''),
    finalidad: new FormControl<string>(this.data?.finalidad || ''),
    baseLegal: new FormControl<string>(this.data?.baseLegal || ''),
    alcance: new FormControl<string>(this.data?.alcance || ''),
    generalidades: new FormControl<string>(this.data?.generalidades || ''),
    lineamientos: new FormControl<string>(this.data?.lineamientos || ''),
  });

  // Estilos del editor
  editorStyles = {
    height: '300px',
  };

  // Configuración del editor Quill - Solo opciones básicas
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'], // Formato de texto
      [{ header: 1 }, { header: 2 }], // Títulos
      [{ list: 'ordered' }, { list: 'bullet' }], // Listas
      [{ indent: '-1' }, { indent: '+1' }], // Indentación
      [{ align: [] }], // Alineación
      ['clean'], // Limpiar formato
    ],
  };

  onGenerate(): void {
    const metadata: ReportMetadata = {
      objetivo: this.form.value.objetivo || '',
      finalidad: this.form.value.finalidad || '',
      baseLegal: this.form.value.baseLegal || '',
      alcance: this.form.value.alcance || '',
      generalidades: this.form.value.generalidades || '',
      lineamientos: this.form.value.lineamientos || '',
    };

    this.dialogRef.close(metadata);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
