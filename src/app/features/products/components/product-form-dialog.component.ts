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
  ProductUnit,
  CreateProductDto,
  UpdateProductDto,
  CREATE_PRODUCT_VALIDATIONS,
  UPDATE_PRODUCT_VALIDATIONS,
} from '../models';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';
import { UploadResult } from '@core/services/file-upload.service';

export interface ProductFormDialogData {
  product?: Product;
  mode: 'create' | 'edit';
  /** URL de la imagen con SAS token (si existe y está en caché) */
  currentImageUrl?: string | null;
}

/**
 * Resultado del dialog que incluye el DTO y las imágenes a eliminar
 */
export interface ProductFormDialogResult {
  dto: CreateProductDto | UpdateProductDto;
  imagesToDelete?: string[]; // Paths de imágenes a eliminar del storage
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
    ImageUploadComponent,
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="text-title font-bold text-accent-titles">
        {{ isEditMode() ? 'Editar Producto' : 'Nuevo Producto' }}
      </h2>

      <mat-dialog-content class="mt-4">
        <form [formGroup]="form" class="product-form mt-4">
          <!-- Imagen del producto -->
          <div class="form-section">
            <p class="section-label text-body font-bold text-accent-titles mb-2">
              Imagen del producto (opcional)
            </p>
            <app-image-upload
              [maxSizeMB]="5"
              [allowedTypes]="['image/jpeg', 'image/png', 'image/svg+xml']"
              [directory]="'products'"
              [currentImageUrl]="data.currentImageUrl || null"
              (fileUploaded)="onImageUploaded($event)"
              (fileRemoved)="onImageRemoved()"
            />
          </div>

          <!-- Nombre -->
          <mat-form-field appearance="outline" class="w-full">
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
          <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
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

          <!-- Unidad de medida -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Unidad de medida</mat-label>
            <mat-select formControlName="unit">
              <mat-option [value]="ProductUnit.KG">Kilogramos (kg)</mat-option>
              <mat-option [value]="ProductUnit.TON">Toneladas (ton)</mat-option>
              <mat-option [value]="ProductUnit.UNITS">Unidades</mat-option>
              <mat-option [value]="ProductUnit.LITERS">Litros</mat-option>
              <mat-option [value]="ProductUnit.BUNCHES">Racimos</mat-option>
            </mat-select>
            <mat-hint>Unidad para medir la cantidad del producto</mat-hint>
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
        @apply max-w-[600px] w-full;
      }

      mat-dialog-content {
        @apply py-4 max-h-[70vh] overflow-y-auto;
      }

      .product-form {
        @apply space-y-4;
      }

      .form-section {
        @apply mb-6;
      }

      .section-label {
        @apply mb-2;
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
  data = inject<ProductFormDialogData>(MAT_DIALOG_DATA);

  // Expose constants to template
  CREATE_PRODUCT_VALIDATIONS = CREATE_PRODUCT_VALIDATIONS;
  UPDATE_PRODUCT_VALIDATIONS = UPDATE_PRODUCT_VALIDATIONS;
  ProductStatus = ProductStatus;
  ProductUnit = ProductUnit;

  submitting = signal(false);
  isEditMode = signal(this.data.mode === 'edit');
  uploadedIconPath = signal<string | null>(null);
  imageWasRemoved = signal(false); // Track si el usuario eliminó la imagen
  originalIconPath = signal<string | null>(this.data.product?.icon || null); // Imagen original

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
    unit: [this.data.product?.unit || ProductUnit.KG],
    status: [this.data.product?.status || ProductStatus.ACTIVE],
  });

  onImageUploaded(result: UploadResult): void {
    this.uploadedIconPath.set(result.relativePath);
    this.imageWasRemoved.set(false); // Reset removed flag
  }

  onImageRemoved(): void {
    this.uploadedIconPath.set(null);
    this.imageWasRemoved.set(true); // Marcar que se eliminó explícitamente
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) return;

    const formValue = this.form.value;

    // Determinar el valor de icon según las acciones del usuario
    let iconValue: string | null | undefined;
    const imagesToDelete: string[] = [];
    const originalIcon = this.originalIconPath();

    if (this.uploadedIconPath()) {
      // Caso 1: Usuario subió una imagen nueva
      iconValue = this.uploadedIconPath()!;

      // Si había imagen previa, agregarla a la lista de eliminación
      if (originalIcon && originalIcon !== iconValue) {
        imagesToDelete.push(originalIcon);
      }
    } else if (this.imageWasRemoved()) {
      // Caso 2: Usuario eliminó la imagen existente
      iconValue = null; // Enviar null para borrar del backend

      // Agregar imagen original a la lista de eliminación
      if (originalIcon) {
        imagesToDelete.push(originalIcon);
      }
    } else {
      // Caso 3: No hubo cambios → mantener la imagen actual (solo en modo edit)
      iconValue = this.isEditMode() ? this.data.product?.icon : undefined;
    }

    // Construir DTO según el modo
    const dto = this.isEditMode()
      ? {
          name: formValue.name!,
          description: formValue.description || undefined,
          unit: formValue.unit as ProductUnit,
          icon: iconValue,
          status: formValue.status as ProductStatus,
        }
      : {
          name: formValue.name!,
          description: formValue.description || undefined,
          unit: formValue.unit as ProductUnit,
          icon: iconValue,
        };

    // Retornar resultado con DTO e imágenes a eliminar
    const result: ProductFormDialogResult = {
      dto,
      imagesToDelete: imagesToDelete.length > 0 ? imagesToDelete : undefined,
    };

    this.dialogRef.close(result);
  }
}
