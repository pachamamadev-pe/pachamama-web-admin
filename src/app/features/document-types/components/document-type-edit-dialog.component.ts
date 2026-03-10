import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DocumentType } from '@shared/models/document-type.model';
import { DocumentTypesService } from '@core/services/document-types.service';
import { NotificationService } from '@core/services/notification.service';
import {
  getProjectWorkflowStageLabel,
  PROJECT_WORKFLOW_STAGE_KEYS,
} from '../../projects/models/project-stages.constants';
import { MIME_TYPE_GROUPS, MimeTypeGroup } from '../models/mime-types.constants';
import {
  DOCUMENT_TYPE_ICON_OPTIONS,
  DocumentTypeIconOption,
} from '../models/document-type-icons.constants';

/**
 * Diálogo para editar o crear un tipo de documento.
 * Modo dual: edición (con id) o creación (sin id).
 */
@Component({
  selector: 'app-document-type-edit-dialog',
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './document-type-edit-dialog.component.html',
  styleUrl: './document-type-edit-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentTypeEditDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<DocumentTypeEditDialogComponent>);
  private fb = inject(FormBuilder);
  private documentTypesService = inject(DocumentTypesService);
  private notification = inject(NotificationService);
  data = inject<Partial<DocumentType>>(MAT_DIALOG_DATA);

  form!: FormGroup;
  saving = signal(false);

  // Modo: creación (sin id) o edición (con id)
  isCreateMode = this.data.id === undefined;

  // Opciones para etapas de proyecto (fuente única de verdad)
  projectStageOptions = PROJECT_WORKFLOW_STAGE_KEYS;

  // Opciones para tipos de licencia (alineado con backend enum)
  licenseTypeOptions = ['trial', 'basic', 'premium', 'enterprise'];

  // Catálogo de tipos MIME agrupado por categoría
  mimeTypeGroups: MimeTypeGroup[] = MIME_TYPE_GROUPS;

  // Catálogo de iconos con etiquetas amigables
  iconOptions: DocumentTypeIconOption[] = DOCUMENT_TYPE_ICON_OPTIONS;

  // Sugerencias de categoría
  private readonly categorySuggestions = [
    'fiscal',
    'legal',
    'operational',
    'identity',
    'certification',
  ];
  filteredCategorySuggestions = signal<string[]>(this.categorySuggestions);

  ngOnInit(): void {
    this.initForm();
    this.setupFormSubscriptions();
  }

  /**
   * Inicializar formulario con valores precargados (edición) o por defecto (creación)
   */
  private initForm(): void {
    this.form = this.fb.group({
      // General
      name: [this.data.name || '', [Validators.required, Validators.maxLength(100)]],
      description: [this.data.description || '', Validators.maxLength(1000)],
      displayOrder: [this.data.displayOrder ?? 50],
      category: [this.data.category || ''],
      icon: [this.data.icon || ''],

      // Aplicación y reglas
      requiredForProjectStages: [this.data.requiredForProjectStages || []],
      isRequired: [this.data.isRequired ?? false],
      requiredForLicense: [this.data.requiredForLicense || []],
      hasExpiration: [this.data.hasExpiration ?? false],
      expirationWarningDays: [
        {
          value: this.data.expirationWarningDays ?? null,
          disabled: !this.data.hasExpiration,
        },
        [Validators.min(1)],
      ],

      // Archivos
      maxFileSizeMb: [this.data.maxFileSizeMb ?? 10, [Validators.required, Validators.min(1)]],
      allowedMimeTypes: [this.data.allowedMimeTypes || []],

      // Validación
      requiresApproval: [this.data.requiresApproval ?? false],
      requiresValidationAttachment: [
        {
          value: this.data.requiresValidationAttachment ?? false,
          disabled: !this.data.requiresApproval,
        },
      ],
      validationAttachmentMimeTypes: [
        {
          value: this.data.validationAttachmentMimeTypes || [],
          disabled: !this.data.requiresValidationAttachment,
        },
      ],
      validationAttachmentMaxSizeMb: [
        {
          value: this.data.validationAttachmentMaxSizeMb ?? null,
          disabled: !this.data.requiresValidationAttachment,
        },
        [Validators.min(1)],
      ],
    });
  }

  /**
   * Configurar suscripciones para manejar dependencias entre campos
   */
  private setupFormSubscriptions(): void {
    // Filtrado de sugerencias de categoría
    this.form.get('category')?.valueChanges.subscribe((value: string | null) => {
      const term = (value ?? '').toLowerCase();
      this.filteredCategorySuggestions.set(
        term
          ? this.categorySuggestions.filter((s) => s.toLowerCase().includes(term))
          : this.categorySuggestions,
      );
    });

    // Dependencia: hasExpiration
    this.form.get('hasExpiration')?.valueChanges.subscribe((hasExpiration) => {
      const expirationWarningDaysControl = this.form.get('expirationWarningDays');
      if (hasExpiration) {
        expirationWarningDaysControl?.enable();
      } else {
        expirationWarningDaysControl?.disable();
        expirationWarningDaysControl?.setValue(null);
      }
    });

    // Dependencia: requiresApproval
    this.form.get('requiresApproval')?.valueChanges.subscribe((requiresApproval) => {
      const validationAttachmentControl = this.form.get('requiresValidationAttachment');
      const validationMimeTypesControl = this.form.get('validationAttachmentMimeTypes');
      const validationMaxSizeControl = this.form.get('validationAttachmentMaxSizeMb');

      if (requiresApproval) {
        validationAttachmentControl?.enable();
      } else {
        validationAttachmentControl?.disable();
        validationAttachmentControl?.setValue(false);
        validationMimeTypesControl?.disable();
        validationMimeTypesControl?.setValue([]);
        validationMaxSizeControl?.disable();
        validationMaxSizeControl?.setValue(null);
      }
    });

    // Dependencia: requiresValidationAttachment
    this.form
      .get('requiresValidationAttachment')
      ?.valueChanges.subscribe((requiresValidationAttachment) => {
        const validationMimeTypesControl = this.form.get('validationAttachmentMimeTypes');
        const validationMaxSizeControl = this.form.get('validationAttachmentMaxSizeMb');

        if (requiresValidationAttachment) {
          validationMimeTypesControl?.enable();
          validationMaxSizeControl?.enable();
        } else {
          validationMimeTypesControl?.disable();
          validationMimeTypesControl?.setValue([]);
          validationMaxSizeControl?.disable();
          validationMaxSizeControl?.setValue(null);
        }
      });
  }

  /**
   * Verificar si es un documento global
   */
  isGlobal(): boolean {
    return this.data.companyId === null;
  }

  /**
   * Obtener label visible de la etapa usando su key
   */
  getProjectStageLabel(stageKey: string): string {
    return getProjectWorkflowStageLabel(stageKey);
  }

  selectIcon(value: string): void {
    this.form.get('icon')?.setValue(value);
  }

  /**
   * Validar formulario antes de guardar
   */
  private validateForm(): boolean {
    // Validación HU: Si isRequired === true, requiredForProjectStages debe tener al menos 1 valor
    const isRequired = this.form.get('isRequired')?.value;
    const requiredForProjectStages = this.form.get('requiredForProjectStages')?.value || [];

    if (isRequired && requiredForProjectStages.length === 0) {
      this.notification.error(
        'Si el documento es requerido, debe especificar al menos una etapa del proyecto',
      );
      return false;
    }

    // Validación: allowedMimeTypes debe tener al menos 1 valor
    const allowedMimeTypes = this.form.get('allowedMimeTypes')?.value || [];
    if (allowedMimeTypes.length === 0) {
      this.notification.error('Debe especificar al menos un tipo MIME permitido');
      return false;
    }

    return true;
  }

  /**
   * Guardar cambios (edición) o crear (creación)
   * - Crear desde cero: backend autogenera code
   * - Crear desde plantilla: usa code de plantilla
   * - Editar: usa code existente
   */
  save(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.notification.error('Por favor, corrija los errores en el formulario');
      return;
    }

    if (!this.validateForm()) {
      return;
    }

    // En modo edición, validar que existe el código
    if (!this.isCreateMode && !this.data.code) {
      this.notification.error('Error: No se encontró el código del tipo de documento');
      return;
    }

    this.saving.set(true);

    const formValue = this.form.getRawValue();
    this.performSave(formValue);
  }

  /**
   * Ejecutar guardado
   * - Crear desde cero: NO incluye code (backend autogenera)
   * - Crear desde plantilla: incluye code de plantilla
   * - Editar: incluye code existente
   */
  private performSave(formValue: Partial<DocumentType>): void {
    const payload: Partial<DocumentType> = {
      // Solo incluir code si existe (edición o plantilla), omitir si crear desde cero
      ...(this.data.code ? { code: this.data.code } : {}),
      name: formValue.name,
      description: formValue.description || undefined,
      applicableTo: this.data.applicableTo || ['projects'], // Default si no existe
      isRequired: formValue.isRequired,
      requiredForLicense:
        (formValue.requiredForLicense?.length ?? 0) > 0 ? formValue.requiredForLicense : undefined,
      maxFileSizeMb: formValue.maxFileSizeMb,
      allowedMimeTypes: formValue.allowedMimeTypes,
      hasExpiration: formValue.hasExpiration,
      expirationWarningDays: formValue.hasExpiration ? formValue.expirationWarningDays : undefined,
      displayOrder: this.isCreateMode ? 50 : this.data.displayOrder,
      category: formValue.category || undefined,
      icon: formValue.icon || undefined,
      status: this.data.status, // Mantener status actual (o el que viene de prepareTemplateData)
      requiredForProjectStages:
        (formValue.requiredForProjectStages?.length ?? 0) > 0
          ? formValue.requiredForProjectStages
          : undefined,
      requiresApproval: formValue.requiresApproval,
      requiresValidationAttachment: formValue.requiresApproval
        ? formValue.requiresValidationAttachment
        : false,
      validationAttachmentMimeTypes:
        formValue.requiresApproval && formValue.requiresValidationAttachment
          ? (formValue.validationAttachmentMimeTypes?.length ?? 0) > 0
            ? formValue.validationAttachmentMimeTypes
            : undefined
          : undefined,
      validationAttachmentMaxSizeMb:
        formValue.requiresApproval && formValue.requiresValidationAttachment
          ? formValue.validationAttachmentMaxSizeMb
          : undefined,
    };

    // Decidir si crear o actualizar
    const operation = this.isCreateMode
      ? this.documentTypesService.createDocumentType(payload)
      : this.documentTypesService.updateDocumentType(this.data.id!, payload);

    operation.subscribe({
      next: (result) => {
        this.notification.success(
          this.isCreateMode
            ? 'Tipo de documento creado correctamente'
            : 'Tipo de documento actualizado correctamente',
        );
        this.saving.set(false);
        this.dialogRef.close(result);
      },
      error: (error) => {
        console.error(
          this.isCreateMode ? 'Error creating document type:' : 'Error updating document type:',
          error,
        );
        this.notification.error(
          this.isCreateMode
            ? 'Error al crear tipo de documento'
            : 'Error al actualizar tipo de documento',
        );
        this.saving.set(false);
      },
    });
  }

  /**
   * Cerrar diálogo sin guardar
   */
  close(): void {
    this.dialogRef.close();
  }

  /**
   * Obtener mensaje de error para un campo
   */
  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'Este campo es requerido';
    if (control.errors['min']) return `Valor mínimo: ${control.errors['min'].min}`;
    if (control.errors['maxlength'])
      return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;

    return 'Campo inválido';
  }
}
