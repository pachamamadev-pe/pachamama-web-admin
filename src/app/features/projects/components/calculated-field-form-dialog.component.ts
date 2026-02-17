import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  AggregationType,
  CalculatedField,
  CalculationScope,
  CreateCalculatedFieldRequest,
  DomainAttribute,
  UpdateCalculatedFieldRequest,
  AGGREGATION_TYPE_LABELS,
} from '../models/calculated-field.model';

interface DialogData {
  mode: 'create' | 'edit';
  scope: CalculationScope;
  projectId: string;
  field?: CalculatedField;
  availableAttributes: DomainAttribute[];
}

/**
 * Dialog para crear/editar columnas calculadas
 */
@Component({
  selector: 'app-calculated-field-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './calculated-field-form-dialog.component.html',
  styleUrl: './calculated-field-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalculatedFieldFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CalculatedFieldFormDialogComponent>);
  data: DialogData = inject(MAT_DIALOG_DATA);

  // State
  saving = signal(false);

  // Computed
  isActivityScope = computed(() => this.data.scope === 'activity');
  isProjectScope = computed(() => this.data.scope === 'project');
  isEditMode = computed(() => this.data.mode === 'edit');

  // Title
  dialogTitle = computed(() => {
    if (this.isEditMode()) {
      return this.isActivityScope()
        ? 'Editar Fórmula de Actividad'
        : 'Editar Agregación de Proyecto';
    }
    return this.isActivityScope() ? 'Nueva Fórmula de Actividad' : 'Nueva Agregación de Proyecto';
  });

  // Expose constants
  readonly AGGREGATION_TYPE_LABELS = AGGREGATION_TYPE_LABELS;
  readonly aggregationTypes: AggregationType[] = ['SUM', 'AVG', 'MIN', 'MAX', 'COUNT'];

  // Form
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(500)],
    // Activity scope
    expression: [''],
    // Project scope
    aggregationType: ['' as AggregationType],
    sourceFieldKey: [''],
  });

  ngOnInit(): void {
    this.setupFormValidation();

    if (this.isEditMode() && this.data.field) {
      this.loadFieldData(this.data.field);
    }
  }

  setupFormValidation(): void {
    if (this.isActivityScope()) {
      // Activity: expression is required
      this.form.controls.expression.setValidators([Validators.required]);
      this.form.controls.aggregationType.clearValidators();
      this.form.controls.sourceFieldKey.clearValidators();
    } else {
      // Project: aggregationType and sourceFieldKey are required
      this.form.controls.expression.clearValidators();
      this.form.controls.aggregationType.setValidators([Validators.required]);
      this.form.controls.sourceFieldKey.setValidators([Validators.required]);
    }

    this.form.controls.expression.updateValueAndValidity();
    this.form.controls.aggregationType.updateValueAndValidity();
    this.form.controls.sourceFieldKey.updateValueAndValidity();
  }

  loadFieldData(field: CalculatedField): void {
    this.form.patchValue({
      name: field.name,
      description: field.description || '',
      expression: field.expression || '',
      aggregationType: field.aggregationType || ('' as AggregationType),
      sourceFieldKey: field.sourceFieldKey || '',
    });
  }

  insertAttributeIntoExpression(attributeCode: string): void {
    const expressionControl = this.form.controls.expression;
    const currentValue = expressionControl.value || '';

    // Insert at the end with ${} syntax
    const newValue = currentValue + (currentValue ? ' ' : '') + `\${${attributeCode}}`;
    expressionControl.setValue(newValue);
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();

    const requestData = this.isEditMode()
      ? this.buildUpdateRequest(formValue)
      : this.buildCreateRequest(formValue);

    this.dialogRef.close(requestData);
  }

  private buildCreateRequest(formValue: typeof this.form.value): CreateCalculatedFieldRequest {
    if (this.isActivityScope()) {
      // Extraer variables de la expresión
      const variables = this.extractVariablesFromExpression(formValue.expression || '');

      return {
        projectId: this.data.projectId,
        name: formValue.name!,
        description: formValue.description || undefined,
        calculationScope: 'activity',
        expression: formValue.expression!,
        variables: variables.length > 0 ? variables : undefined,
      };
    } else {
      return {
        projectId: this.data.projectId,
        name: formValue.name!,
        description: formValue.description || undefined,
        calculationScope: 'project',
        aggregationType: formValue.aggregationType!,
        sourceFieldKey: formValue.sourceFieldKey!,
      };
    }
  }

  private buildUpdateRequest(formValue: typeof this.form.value): UpdateCalculatedFieldRequest {
    if (this.isActivityScope()) {
      // Para activity: puede actualizar name, description, expression y variables
      const variables = this.extractVariablesFromExpression(formValue.expression || '');

      return {
        name: formValue.name!,
        description: formValue.description || undefined,
        expression: formValue.expression!,
        variables: variables.length > 0 ? variables : undefined,
      };
    } else {
      // Para project: solo puede actualizar name, description, aggregationType y sourceFieldKey
      return {
        name: formValue.name!,
        description: formValue.description || undefined,
        aggregationType: formValue.aggregationType!,
        sourceFieldKey: formValue.sourceFieldKey!,
      };
    }
  }

  /**
   * Extrae los códigos de variables de una expresión matemática
   * Busca patrones como ${VARIABLE_NAME}
   */
  private extractVariablesFromExpression(expression: string): string[] {
    if (!expression) return [];

    const regex = /\$\{([A-Z_]+)\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(expression)) !== null) {
      const varName = match[1];
      if (!variables.includes(varName)) {
        variables.push(varName);
      }
    }

    return variables;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getAttributeName(code: string): string {
    const attr = this.data.availableAttributes.find((a) => a.code === code);
    return attr?.name || code;
  }
}
