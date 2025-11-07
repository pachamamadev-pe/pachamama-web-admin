import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  Product,
  ProductStatus,
  CREATE_PRODUCT_VALIDATIONS,
  UPDATE_PRODUCT_VALIDATIONS,
} from '../models';

export interface ProductFormDialogData {
  product?: Product;
  mode: 'create' | 'edit';
}

/**
 * Dialog para crear o editar productos
 */
@Component({
  selector: 'app-product-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="text-title font-bold text-accent-titles">
        {{ isEditMode() ? 'Editar Producto' : 'Nuevo Producto' }}
      </h2>

      <mat-dialog-content class="mt-4">
        <form [formGroup]="form" class="product-form mt-4">
          <!-- Nombre -->
          <mat-form-field appearance="outline" class="w-full mt-4">
            <mat-label>Nombre del producto</mat-label>
            <input
              matInput
              formControlName="name"
              placeholder="Ej: Castaña, Cacao, Café"
              maxlength="200"
              required
            />
            @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
              <mat-error>El nombre es obligatorio</mat-error>
            }
            @if (form.get('name')?.hasError('minlength')) {
              <mat-error>
                Mínimo {{ CREATE_PRODUCT_VALIDATIONS.name.minLength }} caracteres
              </mat-error>
            }
            @if (form.get('name')?.hasError('maxlength')) {
              <mat-error>
                Máximo {{ CREATE_PRODUCT_VALIDATIONS.name.maxLength }} caracteres
              </mat-error>
            }
            <mat-hint align="end">
              {{ form.get('name')?.value?.length || 0 }} /
              {{ CREATE_PRODUCT_VALIDATIONS.name.maxLength }}
            </mat-hint>
          </mat-form-field>

          <!-- Descripción -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Descripción (opcional)</mat-label>
            <textarea
              matInput
              formControlName="description"
              placeholder="Describe las características del producto..."
              rows="4"
              maxlength="500"
            ></textarea>
            @if (form.get('description')?.hasError('maxlength')) {
              <mat-error>
                Máximo {{ CREATE_PRODUCT_VALIDATIONS.description.maxLength }} caracteres
              </mat-error>
            }
            <mat-hint align="end">
              {{ form.get('description')?.value?.length || 0 }} /
              {{ CREATE_PRODUCT_VALIDATIONS.description.maxLength }}
            </mat-hint>
          </mat-form-field>

          <!-- Status (solo en modo edición) -->
          @if (isEditMode()) {
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Estado</mat-label>
              <mat-select formControlName="status">
                <mat-option [value]="ProductStatus.ACTIVE">Activo</mat-option>
                <mat-option [value]="ProductStatus.INACTIVE">Inactivo</mat-option>
              </mat-select>
            </mat-form-field>
          }
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-stroked-button (click)="onCancel()" [disabled]="submitting()">Cancelar</button>
        <button
          mat-raised-button
          class="btn-primary"
          (click)="onSubmit()"
          [disabled]="form.invalid || submitting()"
        >
          @if (submitting()) {
            <mat-spinner diameter="20" class="mr-2" />
          }
          {{ isEditMode() ? 'Guardar cambios' : 'Crear producto' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        @apply max-w-[500px] w-full;
      }

      mat-dialog-content {
        @apply py-4;
      }

      .product-form {
        @apply space-y-4;
      }

      .dialog-actions {
        @apply gap-2 py-4;
      }
    `,
  ],
})
export class ProductFormDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<ProductFormDialogComponent>);
  private data = inject<ProductFormDialogData>(MAT_DIALOG_DATA);

  // Expose constants to template
  CREATE_PRODUCT_VALIDATIONS = CREATE_PRODUCT_VALIDATIONS;
  UPDATE_PRODUCT_VALIDATIONS = UPDATE_PRODUCT_VALIDATIONS;
  ProductStatus = ProductStatus;

  submitting = signal(false);
  isEditMode = signal(this.data.mode === 'edit');

  form = this.fb.group({
    name: [
      this.data.product?.name || '',
      [
        Validators.required,
        Validators.minLength(CREATE_PRODUCT_VALIDATIONS.name.minLength),
        Validators.maxLength(CREATE_PRODUCT_VALIDATIONS.name.maxLength),
      ],
    ],
    description: [
      this.data.product?.description || '',
      [Validators.maxLength(CREATE_PRODUCT_VALIDATIONS.description.maxLength)],
    ],
    status: [this.data.product?.status || ProductStatus.ACTIVE],
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) return;

    const formValue = this.form.value;

    // Construir DTO según el modo
    const dto = this.isEditMode()
      ? {
          name: formValue.name!,
          description: formValue.description || undefined,
          status: formValue.status as ProductStatus,
        }
      : {
          name: formValue.name!,
          description: formValue.description || undefined,
        };

    this.dialogRef.close(dto);
  }
}
