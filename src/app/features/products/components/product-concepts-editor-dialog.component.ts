import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { QuillEditorComponent } from 'ngx-quill';

export interface ProductConceptsEditorDialogData {
  productId: string;
  productName: string;
  currentHtml: string | null;
}

export interface ProductConceptsEditorDialogResult {
  saved: boolean;
  html: string;
}

/**
 * Dialog para editar/crear conceptos de árbol en formato HTML
 * Usa Quill WYSIWYG editor para permitir formato rico
 */
@Component({
  selector: 'app-product-concepts-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    QuillEditorComponent,
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div>
          <h2 class="dialog-title">
            {{ data.currentHtml ? 'Editar' : 'Registrar' }} conceptos de árbol
          </h2>
          <p class="dialog-subtitle">{{ data.productName }}</p>
        </div>
        <button mat-icon-button (click)="onCancel()" [disabled]="saving()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content">
        <form [formGroup]="form">
          <!-- Quill Editor -->
          <div class="editor-container">
            <quill-editor
              formControlName="descriptionHtml"
              [modules]="quillModules"
              [styles]="editorStyles"
              [placeholder]="'Escribe aquí los conceptos de árbol con formato...'"
              theme="snow"
            ></quill-editor>
          </div>

          @if (
            form.get('descriptionHtml')?.hasError('required') &&
            form.get('descriptionHtml')?.touched
          ) {
            <p class="error-message">El contenido no puede estar vacío</p>
          }
        </form>

        <!-- Helper text -->
        <div class="helper-text">
          <mat-icon class="helper-icon">info</mat-icon>
          <p>
            Usa el editor para dar formato al contenido. Puedes agregar títulos, listas, negritas,
            colores, tablas y más.
          </p>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-stroked-button (click)="onCancel()" [disabled]="saving()">Cancelar</button>
        <button
          mat-raised-button
          class="btn-primary"
          (click)="onSave()"
          [disabled]="!form.valid || saving()"
        >
          @if (saving()) {
            <mat-spinner diameter="20" />
            <span>Guardando...</span>
          } @else {
            <ng-container>
              <mat-icon>save</mat-icon>
              <span>Guardar</span>
            </ng-container>
          }
        </button>
      </div>
    </div>
  `,
  styles: `
    .dialog-container {
      display: flex;
      flex-direction: column;
      min-width: 600px;
      max-width: 900px;
      height: 700px;
      max-height: 90vh;

      @media (max-width: 768px) {
        min-width: 100%;
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
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .editor-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 400px;

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
        min-height: 350px;
        padding: 1rem;
      }

      :deep(.ql-editor.ql-blank::before) {
        color: #737373;
        font-style: normal;
      }
    }

    .error-message {
      color: #dc2626;
      font-size: 12px;
      margin: 0.5rem 0 0 0;
    }

    .helper-text {
      display: flex;
      gap: 0.5rem;
      padding: 1rem;
      background-color: #f4fbf6;
      border-radius: 8px;
      border-left: 3px solid #218358;

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

      button {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        mat-spinner {
          margin-right: 0.5rem;
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductConceptsEditorDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ProductConceptsEditorDialogComponent>);
  readonly data = inject<ProductConceptsEditorDialogData>(MAT_DIALOG_DATA);

  saving = signal(false);

  form = new FormGroup({
    descriptionHtml: new FormControl<string>('', [Validators.required]),
  });

  // Estilos del editor
  editorStyles = {
    height: '400px',
  };

  // Configuración del editor Quill
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'], // Formato de texto
      ['blockquote', 'code-block'], // Bloques
      [{ header: 1 }, { header: 2 }], // Títulos
      [{ list: 'ordered' }, { list: 'bullet' }], // Listas
      [{ script: 'sub' }, { script: 'super' }], // Subíndice/Superíndice
      [{ indent: '-1' }, { indent: '+1' }], // Indentación
      [{ size: ['small', false, 'large', 'huge'] }], // Tamaño de fuente
      [{ header: [1, 2, 3, 4, 5, 6, false] }], // Headers
      [{ color: [] }, { background: [] }], // Colores
      [{ font: [] }], // Fuentes
      [{ align: [] }], // Alineación
      ['clean'], // Limpiar formato
      ['link', 'image'], // Links e imágenes
    ],
  };

  ngOnInit(): void {
    // Si hay contenido HTML previo, cargarlo en el editor
    if (this.data.currentHtml) {
      this.form.patchValue({
        descriptionHtml: this.data.currentHtml,
      });
    }
  }

  onSave(): void {
    if (this.form.valid) {
      const result: ProductConceptsEditorDialogResult = {
        saved: true,
        html: this.form.value.descriptionHtml!,
      };

      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
