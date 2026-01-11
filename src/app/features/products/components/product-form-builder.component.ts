import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductsService } from '../services/products.service';
import { ProductProtocolsService } from '../services/product-protocols.service';
import { NotificationService } from '@core/services/notification.service';
import { AppliesTo, FieldType, FormField, FormSection, ProductProtocol } from '../models';
import { FormSchema, FormSchemaField, FormSchemaSection } from '../models/form-schema.model';
import { FormSchemaResponse } from '../models/form-schema-response.model';

export type ProjectStage =
  | 'planning'
  | 'inventory'
  | 'collection'
  | 'pmf_development'
  | 'serfor_evaluation'
  | 'ctp_entry'
  | 'primary_transformation'
  | 'map_adjustment';

/**
 * Componente para crear/editar formularios dinámicos por etapa
 */
@Component({
  selector: 'app-product-form-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatRadioModule,
    DragDropModule,
  ],
  templateUrl: './product-form-builder.component.html',
  styleUrl: './product-form-builder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormBuilderComponent implements OnInit {
  private productsService = inject(ProductsService);
  private productProtocolsService = inject(ProductProtocolsService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);

  // Route params
  productId = signal<string>('');
  productName = signal<string>('Producto');
  stage = signal<ProjectStage>('planning');
  formId = signal<string | null>(null);

  // Computed
  editMode = computed(() => !!this.formId());

  // Signals
  loading = signal(true);
  saving = signal(false);
  fieldTypes = signal<FieldType[]>([]);
  protocols = signal<ProductProtocol[]>([]);

  // Secciones del formulario
  protocolLinkedSection = signal<FormSection>({
    title: 'Parte 1',
    type: 'protocol_linked',
    fields: [],
  });

  freeFormSection = signal<FormSection>({
    title: 'Parte 2',
    type: 'free_form',
    fields: [],
  });

  // Nuevos campos en proceso de creación
  newProtocolLinkedField = signal<Partial<FormField>>({
    question: '',
    fieldTypeId: '',
    isRequired: false,
    protocolId: null,
    validationConfig: {},
    appliesTo: 'both', // Por defecto aplica a ambos
  });

  newFreeFormField = signal<Partial<FormField>>({
    question: '',
    fieldTypeId: '',
    isRequired: false,
    validationConfig: {},
    appliesTo: 'both', // Por defecto aplica a ambos
  });

  // Computed signals para obtener el fieldType seleccionado
  selectedProtocolLinkedFieldType = computed(() => {
    const fieldTypeId = this.newProtocolLinkedField().fieldTypeId;
    if (!fieldTypeId) return null;
    return this.fieldTypes().find((ft) => ft.id === fieldTypeId) || null;
  });

  selectedFreeFormFieldType = computed(() => {
    const fieldTypeId = this.newFreeFormField().fieldTypeId;
    if (!fieldTypeId) return null;
    return this.fieldTypes().find((ft) => ft.id === fieldTypeId) || null;
  });

  // Inputs temporales para añadir opciones y valores de array
  tempProtocolOption = signal('');
  tempFreeFormOption = signal('');
  tempArrayValues = signal<Record<string, string>>({}); // Para múltiples arrays (allowed_formats, etc.)

  // Estado de expansión de paneles
  protocolPanelExpanded = signal(true);
  freeFormPanelExpanded = signal(false);

  // Estado de edición
  editingProtocolFieldId = signal<string | null>(null);
  editingFreeFormFieldId = signal<string | null>(null);

  // Effect para cargar valores por defecto de validationOptions cuando cambia el fieldType
  constructor() {
    effect(() => {
      const protocolFieldType = this.selectedProtocolLinkedFieldType();
      if (protocolFieldType?.validationOptions) {
        // Solo cargar valores por defecto si no estamos editando un campo existente
        // (es decir, si validationConfig está vacío o no tiene opciones personalizadas)
        this.newProtocolLinkedField.update((field) => {
          // Si estamos editando (editingProtocolFieldId existe) y ya hay validationConfig,
          // NO sobrescribir con los defaults
          const isEditing = this.editingProtocolFieldId() !== null;
          const hasExistingConfig =
            field.validationConfig && Object.keys(field.validationConfig).length > 0;

          if (isEditing && hasExistingConfig) {
            // Mantener el validationConfig actual sin cambios
            return field;
          }

          // Si no estamos editando, cargar defaults
          return {
            ...field,
            validationConfig: { ...protocolFieldType.validationOptions },
          };
        });
      }
    });

    effect(() => {
      const freeFormFieldType = this.selectedFreeFormFieldType();
      if (freeFormFieldType?.validationOptions) {
        // Solo cargar valores por defecto si no estamos editando un campo existente
        this.newFreeFormField.update((field) => {
          const isEditing = this.editingFreeFormFieldId() !== null;
          const hasExistingConfig =
            field.validationConfig && Object.keys(field.validationConfig).length > 0;

          if (isEditing && hasExistingConfig) {
            // Mantener el validationConfig actual sin cambios
            return field;
          }

          // Si no estamos editando, cargar defaults
          return {
            ...field,
            validationConfig: { ...freeFormFieldType.validationOptions },
          };
        });
      }
    });
  }

  ngOnInit(): void {
    // Obtener params de la ruta
    const productId = this.route.snapshot.paramMap.get('productId');
    const stage = this.route.snapshot.paramMap.get('stage') as ProjectStage;
    const formId = this.route.snapshot.queryParamMap.get('formId');

    if (!productId || !stage) {
      this.notification.error('Parámetros inválidos');
      this.goBack();
      return;
    }

    this.productId.set(productId);
    this.stage.set(stage);
    this.formId.set(formId);

    // Cargar producto para obtener el nombre
    this.productsService.getProductById(productId).subscribe({
      next: (product) => {
        this.productName.set(product.name);
      },
      error: () => {
        this.productName.set('Producto');
      },
    });

    this.loadFieldTypes();
    this.loadProtocols();

    // Cargar formulario existente si estamos en modo edición
    if (formId) {
      this.loadExistingForm(productId, formId);
    }
  }

  /**
   * Carga los tipos de campo disponibles
   */
  private loadFieldTypes(): void {
    this.loading.set(true);
    this.productsService.getFieldTypes(this.productId()).subscribe({
      next: (types) => {
        this.fieldTypes.set(types);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando tipos de campo:', error);
        this.notification.error('Error al cargar tipos de campo');
        this.fieldTypes.set([]);
        this.loading.set(false);
      },
    });
  }

  /**
   * Carga los protocolos del producto
   */
  private loadProtocols(): void {
    this.productProtocolsService.getProductProtocols(this.productId()).subscribe({
      next: (protocols) => {
        this.protocols.set(protocols);
      },
      error: (error) => {
        console.error('Error cargando protocolos:', error);
        this.protocols.set([]);
      },
    });
  }

  /**
   * Carga un formulario existente para editarlo
   */
  private loadExistingForm(productId: string, formId: string): void {
    this.loading.set(true);

    this.productsService.getProductFormById(productId, formId).subscribe({
      next: (response: FormSchemaResponse) => {
        this.parseAndLoadFormSchema(response);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando formulario:', error);
        const errorMessage =
          error?.error?.message || error?.message || 'Error al cargar el formulario';
        this.notification.error(errorMessage);
        this.loading.set(false);
        this.goBack();
      },
    });
  }

  /**
   * Parsea el schema JSON y carga los datos en las secciones
   */
  private parseAndLoadFormSchema(response: FormSchemaResponse): void {
    try {
      // Parsear el string JSON del schema
      const schema: FormSchema = JSON.parse(response.schema);

      if (!schema.sections || !Array.isArray(schema.sections)) {
        throw new Error('Schema inválido: no contiene sections');
      }

      // Procesar sección protocol_linked
      const protocolSection = schema.sections.find(
        (s: FormSchemaSection) => s.type === 'protocol_linked',
      );
      if (protocolSection) {
        const protocolFields: FormField[] = protocolSection.fields.map(
          (field: FormSchemaField, index: number) => ({
            id: `field-protocol-${index}-${Date.now()}`,
            question: field.question,
            fieldTypeId: field.id_field_type,
            isRequired: field.required,
            protocolId: field.id_protocol || null,
            validationConfig: field.validationOptions,
            appliesTo: ((field as FormSchemaField & { applies_to?: string }).applies_to ||
              'both') as AppliesTo,
          }),
        );

        this.protocolLinkedSection.set({
          title: 'Parte 1',
          type: 'protocol_linked',
          fields: protocolFields,
        });
      }

      // Procesar sección free_form
      const freeFormSection = schema.sections.find(
        (s: FormSchemaSection) => s.type === 'free_form',
      );
      if (freeFormSection) {
        const freeFields: FormField[] = freeFormSection.fields.map(
          (field: FormSchemaField, index: number) => ({
            id: `field-free-${index}-${Date.now()}`,
            question: field.question,
            fieldTypeId: field.id_field_type,
            isRequired: field.required,
            validationConfig: field.validationOptions,
            appliesTo: ((field as FormSchemaField & { applies_to?: string }).applies_to ||
              'both') as AppliesTo,
          }),
        );

        this.freeFormSection.set({
          title: 'Parte 2',
          type: 'free_form',
          fields: freeFields,
        });
      }

      this.notification.success('Formulario cargado correctamente');
    } catch (error) {
      console.error('Error parseando schema:', error);
      this.notification.error('Error al procesar el formulario');
      this.goBack();
    }
  }

  /**
   * Añade o actualiza un campo (maneja tanto protocol_linked como free_form según si tiene protocolId)
   */
  addProtocolLinkedField(): void {
    const newField = this.newProtocolLinkedField();

    if (!newField.question?.trim()) {
      this.notification.warning('Debes ingresar una pregunta');
      return;
    }

    if (!newField.fieldTypeId) {
      this.notification.warning('Debes seleccionar un formato de respuesta');
      return;
    }

    // Determinar si tiene protocolo (linked_protocol) o no (free_form)
    const hasProtocol = !!newField.protocolId;
    const editingProtocolId = this.editingProtocolFieldId();
    const editingFreeFormId = this.editingFreeFormFieldId();

    if (hasProtocol) {
      // CASO 1: Con protocolo → va a protocolLinkedSection
      const section = this.protocolLinkedSection();

      if (editingProtocolId) {
        // Modo edición: actualizar campo existente
        const updatedFields = section.fields.map((f): FormField => {
          if (f.id === editingProtocolId) {
            return {
              ...f,
              question: newField.question!.trim(),
              fieldTypeId: newField.fieldTypeId!,
              isRequired: newField.isRequired || false,
              protocolId: newField.protocolId,
              appliesTo: newField.appliesTo || 'both',
              validationConfig:
                newField.validationConfig && Object.keys(newField.validationConfig).length > 0
                  ? newField.validationConfig
                  : undefined,
            };
          }
          return f;
        });

        this.protocolLinkedSection.set({
          ...section,
          fields: updatedFields,
        });

        this.notification.success('Pregunta actualizada correctamente');
        this.editingProtocolFieldId.set(null);
      } else {
        // Modo creación: agregar nuevo campo
        const field: FormField = {
          id: `temp-${Date.now()}`,
          question: newField.question!.trim(),
          fieldTypeId: newField.fieldTypeId!,
          isRequired: newField.isRequired || false,
          protocolId: newField.protocolId,
          appliesTo: newField.appliesTo || 'both',
          validationConfig:
            newField.validationConfig && Object.keys(newField.validationConfig).length > 0
              ? newField.validationConfig
              : undefined,
        };

        this.protocolLinkedSection.set({
          ...section,
          fields: [...section.fields, field],
        });
      }
    } else {
      // CASO 2: Sin protocolo → va a freeFormSection
      const section = this.freeFormSection();

      if (editingFreeFormId) {
        // Modo edición: actualizar campo existente
        const updatedFields = section.fields.map((f): FormField => {
          if (f.id === editingFreeFormId) {
            return {
              ...f,
              question: newField.question!.trim(),
              fieldTypeId: newField.fieldTypeId!,
              isRequired: newField.isRequired || false,
              appliesTo: newField.appliesTo || 'both',
              validationConfig:
                newField.validationConfig && Object.keys(newField.validationConfig).length > 0
                  ? newField.validationConfig
                  : undefined,
            };
          }
          return f;
        });

        this.freeFormSection.set({
          ...section,
          fields: updatedFields,
        });

        this.notification.success('Pregunta actualizada correctamente');
        this.editingFreeFormFieldId.set(null);
      } else {
        // Modo creación: agregar nuevo campo
        const field: FormField = {
          id: `temp-${Date.now()}`,
          question: newField.question!.trim(),
          fieldTypeId: newField.fieldTypeId!,
          isRequired: newField.isRequired || false,
          appliesTo: newField.appliesTo || 'both',
          validationConfig:
            newField.validationConfig && Object.keys(newField.validationConfig).length > 0
              ? newField.validationConfig
              : undefined,
        };

        this.freeFormSection.set({
          ...section,
          fields: [...section.fields, field],
        });
      }
    }

    // Limpiar formulario
    this.newProtocolLinkedField.set({
      question: '',
      fieldTypeId: '',
      isRequired: false,
      protocolId: null,
      validationConfig: {},
      appliesTo: 'both',
    });
    this.tempProtocolOption.set('');
    this.tempArrayValues.set({});
  }

  /**
   * Añade o actualiza un campo de la Parte 2 (free_form)
   */
  addFreeFormField(): void {
    const newField = this.newFreeFormField();

    if (!newField.question?.trim()) {
      this.notification.warning('Debes ingresar una pregunta');
      return;
    }

    if (!newField.fieldTypeId) {
      this.notification.warning('Debes seleccionar un formato de respuesta');
      return;
    }

    const section = this.freeFormSection();
    const editingId = this.editingFreeFormFieldId();

    if (editingId) {
      // Modo edición: actualizar campo existente
      const updatedFields = section.fields.map((f): FormField => {
        if (f.id === editingId) {
          return {
            ...f,
            question: newField.question!.trim(),
            fieldTypeId: newField.fieldTypeId!,
            isRequired: newField.isRequired || false,
            validationConfig:
              newField.validationConfig && Object.keys(newField.validationConfig).length > 0
                ? newField.validationConfig
                : undefined,
          };
        }
        return f;
      });

      this.freeFormSection.set({
        ...section,
        fields: updatedFields,
      });

      this.notification.success('Pregunta actualizada correctamente');
      this.editingFreeFormFieldId.set(null);
    } else {
      // Modo creación: agregar nuevo campo
      const field: FormField = {
        id: `temp-${Date.now()}`,
        question: newField.question!.trim(),
        fieldTypeId: newField.fieldTypeId!,
        isRequired: newField.isRequired || false,
        validationConfig:
          newField.validationConfig && Object.keys(newField.validationConfig).length > 0
            ? newField.validationConfig
            : undefined,
      };

      this.freeFormSection.set({
        ...section,
        fields: [...section.fields, field],
      });
    }

    // Limpiar formulario
    this.newFreeFormField.set({
      question: '',
      fieldTypeId: '',
      isRequired: false,
      validationConfig: {},
    });
    this.tempFreeFormOption.set('');
    this.tempArrayValues.set({});
  }

  /**
   * Carga un campo de la Parte 1 para edición
   */
  editProtocolLinkedField(field: FormField): void {
    this.editingProtocolFieldId.set(field.id!);

    this.newProtocolLinkedField.set({
      question: field.question,
      fieldTypeId: field.fieldTypeId,
      isRequired: field.isRequired,
      protocolId: field.protocolId || null,
      validationConfig: field.validationConfig ? { ...field.validationConfig } : {},
      appliesTo: field.appliesTo || 'both',
    });

    // Scroll hacia el formulario
    setTimeout(() => {
      const formElement = document.querySelector('.new-field-form');
      formElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  /**
   * Carga un campo de la Parte 2 (free_form) para edición en el formulario unificado
   */
  editFreeFormField(field: FormField): void {
    this.editingFreeFormFieldId.set(field.id!);
    // Cargar los datos en newProtocolLinkedField (formulario unificado)
    // protocolId será null para free_form
    this.newProtocolLinkedField.set({
      question: field.question,
      fieldTypeId: field.fieldTypeId,
      isRequired: field.isRequired,
      protocolId: null, // Free form no tiene protocolo
      validationConfig: field.validationConfig ? { ...field.validationConfig } : {},
      appliesTo: field.appliesTo || 'both',
    });

    // Scroll hacia el formulario
    setTimeout(() => {
      const formElement = document.querySelector('.new-field-form');
      formElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  /**
   * Cancela la edición de un campo de la Parte 1
   */
  cancelEditProtocolLinkedField(): void {
    this.editingProtocolFieldId.set(null);
    this.newProtocolLinkedField.set({
      question: '',
      fieldTypeId: '',
      isRequired: false,
      protocolId: null,
      validationConfig: {},
      appliesTo: 'both',
    });
    this.tempProtocolOption.set('');
    this.tempArrayValues.set({});
  }

  /**
   * Cancela la edición de un campo de free_form (limpia el formulario unificado)
   */
  cancelEditFreeFormField(): void {
    this.editingFreeFormFieldId.set(null);
    // Limpiar newProtocolLinkedField (formulario unificado)
    this.newProtocolLinkedField.set({
      question: '',
      fieldTypeId: '',
      isRequired: false,
      protocolId: null,
      validationConfig: {},
      appliesTo: 'both',
    });
    this.tempProtocolOption.set('');
    this.tempArrayValues.set({});
  }

  /**
   * Elimina un campo de la Parte 1
   */
  removeProtocolLinkedField(fieldId: string): void {
    const section = this.protocolLinkedSection();
    this.protocolLinkedSection.set({
      ...section,
      fields: section.fields.filter((f) => f.id !== fieldId),
    });

    // Si estaba editando este campo, cancelar edición
    if (this.editingProtocolFieldId() === fieldId) {
      this.cancelEditProtocolLinkedField();
    }
  }

  /**
   * Elimina un campo de la Parte 2
   */
  removeFreeFormField(fieldId: string): void {
    const section = this.freeFormSection();
    this.freeFormSection.set({
      ...section,
      fields: section.fields.filter((f) => f.id !== fieldId),
    });

    // Si estaba editando este campo, cancelar edición
    if (this.editingFreeFormFieldId() === fieldId) {
      this.cancelEditFreeFormField();
    }
  }

  /**
   * Maneja el reordenamiento de preguntas vinculadas a protocolo mediante drag & drop
   */
  onProtocolFieldDrop(event: CdkDragDrop<FormField[]>): void {
    const section = this.protocolLinkedSection();
    const updatedFields = [...section.fields];
    moveItemInArray(updatedFields, event.previousIndex, event.currentIndex);

    this.protocolLinkedSection.set({
      ...section,
      fields: updatedFields,
    });
  }

  /**
   * Maneja el reordenamiento de preguntas libres mediante drag & drop
   */
  onFreeFormFieldDrop(event: CdkDragDrop<FormField[]>): void {
    const section = this.freeFormSection();
    const updatedFields = [...section.fields];
    moveItemInArray(updatedFields, event.previousIndex, event.currentIndex);

    this.freeFormSection.set({
      ...section,
      fields: updatedFields,
    });
  }

  /**
   * Obtiene el nombre del tipo de campo por ID
   */
  getFieldTypeName(fieldTypeId: string): string {
    const fieldType = this.fieldTypes().find((ft) => ft.id === fieldTypeId);
    return fieldType?.name || 'Desconocido';
  }

  // ========== Métodos para manejo de opciones ==========

  /**
   * Actualiza un campo del formulario de Parte 1
   */
  updateProtocolLinkedField(key: keyof FormField, value: unknown): void {
    this.newProtocolLinkedField.update((field) => ({
      ...field,
      [key]: value,
    }));
  }

  /**
   * Actualiza un campo del formulario de Parte 2
   */
  updateFreeFormField(key: keyof FormField, value: unknown): void {
    this.newFreeFormField.update((field) => ({
      ...field,
      [key]: value,
    }));
  }

  /**
   * Maneja el cambio de fieldType en Parte 1
   */
  onProtocolFieldTypeChange(fieldTypeId: string): void {
    this.newProtocolLinkedField.update((field) => ({
      ...field,
      fieldTypeId,
      // NO limpiar validationConfig aquí - el effect lo cargará con valores por defecto
    }));
    this.tempProtocolOption.set('');
    this.tempArrayValues.set({});
  }

  /**
   * Maneja el cambio de fieldType en Parte 2
   */
  onFreeFormFieldTypeChange(fieldTypeId: string): void {
    this.newFreeFormField.update((field) => ({
      ...field,
      fieldTypeId,
      // NO limpiar validationConfig aquí - el effect lo cargará con valores por defecto
    }));
    this.tempFreeFormOption.set('');
    this.tempArrayValues.set({});
  }

  // ========== Métodos para manejo de arrays temporales ==========

  /**
   * Obtiene el valor temporal de un array específico
   */
  getTempArrayValue(key: string): string {
    return this.tempArrayValues()[key] || '';
  }

  /**
   * Establece el valor temporal de un array específico
   */
  setTempArrayValue(key: string, value: string): void {
    this.tempArrayValues.update((values) => ({
      ...values,
      [key]: value,
    }));
  }

  // ========== Métodos para manejo de opciones (key = 'options') ==========

  /**
   * Añade una opción al array 'options' dentro de validationConfig (Parte 1)
   */
  addProtocolValidationOption(): void {
    const option = this.tempProtocolOption().trim();
    if (!option) {
      this.notification.warning('Ingresa una opción');
      return;
    }

    const currentOptions = (this.getProtocolValidationValue('options') as string[]) || [];

    if (currentOptions.includes(option)) {
      this.notification.warning('Esta opción ya existe');
      return;
    }

    this.updateProtocolValidation('options', [...currentOptions, option]);
    this.tempProtocolOption.set('');
  }

  /**
   * Elimina una opción del array 'options' (Parte 1)
   */
  removeProtocolValidationOption(option: string): void {
    const currentOptions = (this.getProtocolValidationValue('options') as string[]) || [];
    this.updateProtocolValidation(
      'options',
      currentOptions.filter((o) => o !== option),
    );
  }

  /**
   * Añade una opción al array 'options' dentro de validationConfig (Parte 2)
   */
  addFreeFormValidationOption(): void {
    const option = this.tempFreeFormOption().trim();
    if (!option) {
      this.notification.warning('Ingresa una opción');
      return;
    }

    const currentOptions = (this.getFreeFormValidationValue('options') as string[]) || [];

    if (currentOptions.includes(option)) {
      this.notification.warning('Esta opción ya existe');
      return;
    }

    this.updateFreeFormValidation('options', [...currentOptions, option]);
    this.tempFreeFormOption.set('');
  }

  /**
   * Elimina una opción del array 'options' (Parte 2)
   */
  removeFreeFormValidationOption(option: string): void {
    const currentOptions = (this.getFreeFormValidationValue('options') as string[]) || [];
    this.updateFreeFormValidation(
      'options',
      currentOptions.filter((o) => o !== option),
    );
  }

  // ========== Métodos para manejo de arrays generales (allowed_formats, etc.) ==========

  /**
   * Añade un valor a un array de validación (Parte 1)
   */
  addProtocolArrayValue(key: string): void {
    const value = this.getTempArrayValue(key).trim();
    if (!value) {
      this.notification.warning('Ingresa un valor');
      return;
    }

    const currentArray = (this.getProtocolValidationValue(key) as string[]) || [];

    if (currentArray.includes(value)) {
      this.notification.warning('Este valor ya existe');
      return;
    }

    this.updateProtocolValidation(key, [...currentArray, value]);
    this.setTempArrayValue(key, '');
  }

  /**
   * Elimina un valor de un array de validación (Parte 1)
   */
  removeProtocolArrayValue(key: string, value: string): void {
    const currentArray = (this.getProtocolValidationValue(key) as string[]) || [];
    this.updateProtocolValidation(
      key,
      currentArray.filter((v) => v !== value),
    );
  }

  /**
   * Añade un valor a un array de validación (Parte 2)
   */
  addFreeFormArrayValue(key: string): void {
    const value = this.getTempArrayValue(key).trim();
    if (!value) {
      this.notification.warning('Ingresa un valor');
      return;
    }

    const currentArray = (this.getFreeFormValidationValue(key) as string[]) || [];

    if (currentArray.includes(value)) {
      this.notification.warning('Este valor ya existe');
      return;
    }

    this.updateFreeFormValidation(key, [...currentArray, value]);
    this.setTempArrayValue(key, '');
  }

  /**
   * Elimina un valor de un array de validación (Parte 2)
   */
  removeFreeFormArrayValue(key: string, value: string): void {
    const currentArray = (this.getFreeFormValidationValue(key) as string[]) || [];
    this.updateFreeFormValidation(
      key,
      currentArray.filter((v) => v !== value),
    );
  }

  /**
   * DEPRECATED: Ya no se usa - las opciones están en validationConfig.options
   */
  addProtocolOption(): void {
    // Usar addProtocolValidationOption() en su lugar
  }

  /**
   * DEPRECATED: Ya no se usa
   */
  removeProtocolOption(_option: string): void {
    // Usar removeProtocolValidationOption() en su lugar
  }

  /**
   * DEPRECATED: Ya no se usa
   */
  addFreeFormOption(): void {
    // Usar addFreeFormValidationOption() en su lugar
  }

  /**
   * DEPRECATED: Ya no se usa
   */
  removeFreeFormOption(_option: string): void {
    // Usar removeFreeFormValidationOption() en su lugar
  }

  // ========== Métodos para manejo de validationConfig ==========

  /**
   * Actualiza un valor de validación en Parte 1
   */
  updateProtocolValidation(key: string, value: unknown): void {
    this.newProtocolLinkedField.update((field) => ({
      ...field,
      validationConfig: {
        ...(field.validationConfig || {}),
        [key]: value,
      },
    }));
  }

  /**
   * Actualiza un valor de validación en Parte 2
   */
  updateFreeFormValidation(key: string, value: unknown): void {
    this.newFreeFormField.update((field) => ({
      ...field,
      validationConfig: {
        ...(field.validationConfig || {}),
        [key]: value,
      },
    }));
  }

  /**
   * Obtiene las claves de validationOptions de un FieldType
   */
  getValidationKeys(validationOptions: Record<string, unknown> | null): string[] {
    if (!validationOptions) return [];
    return Object.keys(validationOptions);
  }

  /**
   * Determina el tipo de input para una clave de validación
   */
  getValidationInputType(key: string, value: unknown): 'number' | 'boolean' | 'array' {
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    return 'number';
  }

  /**
   * Obtiene el valor actual de una validación en Parte 1
   */
  getProtocolValidationValue(key: string): unknown {
    return this.newProtocolLinkedField().validationConfig?.[key];
  }

  /**
   * Obtiene el valor actual de una validación en Parte 2
   */
  getFreeFormValidationValue(key: string): unknown {
    return this.newFreeFormField().validationConfig?.[key];
  }

  /**
   * Formatea labels para mostrar en UI (convierte snake_case a Title Case)
   */
  formatLabel(key: string): string {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Convierte un valor a array para uso en templates (casting seguro)
   */
  asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  /**
   * Verifica si un valor es un array con elementos
   */
  hasArrayValues(value: unknown): boolean {
    return Array.isArray(value) && value.length > 0;
  }

  /**
   * Verifica si un FieldType tiene validationOptions válidas (no null y no vacío)
   */
  hasValidationOptions(fieldType: FieldType | null): boolean {
    if (!fieldType || !fieldType.validationOptions) return false;
    if (fieldType.validationOptions === null) return false;
    return Object.keys(fieldType.validationOptions).length > 0;
  }

  /**
   * Verifica si un campo de validación es de tipo fecha (max_date, min_date, etc.)
   */
  isDateField(key: string): boolean {
    const dateFields = ['max_date', 'min_date', 'start_date', 'end_date', 'date', 'fecha'];
    return dateFields.some((field) => key.toLowerCase().includes(field));
  }

  /**
   * Título de la etapa para mostrar en UI
   */
  getStageTitle(): string {
    const stageTitles: Record<ProjectStage, string> = {
      planning: 'Relacionamiento Comunitario',
      inventory: 'Inventario',
      collection: 'Recolección',
      pmf_development: 'Elaboración de PMF',
      serfor_evaluation: 'Evaluación y Aprobación (SERFOR)',
      ctp_entry: 'Acopio / Ingreso a CTP',
      primary_transformation: 'Transformación Primaria',
      map_adjustment: 'Proceso de Ajuste de Mapas a Estándares IPG/IGN',
    };
    return stageTitles[this.stage()];
  }

  /**
   * Convierte la etapa a formato uppercase para el backend
   */
  private getStageCode(): string {
    const stageCodes: Record<ProjectStage, string> = {
      planning: 'PLANNING',
      inventory: 'INVENTORY',
      collection: 'COLLECTION',
      pmf_development: 'PMF_DEVELOPMENT',
      serfor_evaluation: 'SERFOR_EVALUATION',
      ctp_entry: 'CTP_ENTRY',
      primary_transformation: 'PRIMARY_TRANSFORMATION',
      map_adjustment: 'MAP_ADJUSTMENT',
    };
    return stageCodes[this.stage()];
  }

  /**
   * Genera el JSON schema con la estructura requerida por el backend
   */
  private generateFormSchema(): unknown {
    const sections: unknown[] = [];

    // Sección 1: Protocol Linked (si tiene campos)
    const protocolFields = this.protocolLinkedSection().fields;
    if (protocolFields.length > 0) {
      const protocolSection = {
        id: 'section_1',
        name: 'Información del Árbol',
        type: 'protocol_linked',
        auto_approve: true,
        display_order: 1,
        fields: protocolFields.map((field, index) => {
          const fieldType = this.fieldTypes().find((ft) => ft.id === field.fieldTypeId);
          const protocol = this.protocols().find((p) => p.id === field.protocolId);

          return {
            id_field_type: fieldType?.id || '',
            field_type: fieldType?.code || '',
            question: field.question,
            id_protocol: protocol?.id || '',
            attribute_code: protocol?.attribute?.code || '',
            required: field.isRequired,
            validationOptions: field.validationConfig || {},
            applies_to: field.appliesTo || 'both',
            display_order: index + 1,
          };
        }),
      };
      sections.push(protocolSection);
    }

    // Sección 2: Free Form (si tiene campos)
    const freeFormFields = this.freeFormSection().fields;
    if (freeFormFields.length > 0) {
      const freeFormSection = {
        id: 'section_2',
        name: 'Evidencias',
        type: 'free_form',
        auto_approve: false,
        display_order: 2,
        fields: freeFormFields.map((field, index) => {
          const fieldType = this.fieldTypes().find((ft) => ft.id === field.fieldTypeId);

          return {
            id_field_type: fieldType?.id || '',
            field_type: fieldType?.code || '',
            question: field.question,
            id_protocol: '',
            attribute_code: '',
            required: field.isRequired,
            validationOptions: field.validationConfig || {},
            applies_to: field.appliesTo || 'both',
            display_order: index + 1,
          };
        }),
      };
      sections.push(freeFormSection);
    }

    return { sections };
  }

  /**
   * Guarda el formulario llamando al backend
   */
  saveForm(): void {
    // Validar que hay al menos un campo
    const totalFields =
      this.protocolLinkedSection().fields.length + this.freeFormSection().fields.length;

    if (totalFields === 0) {
      this.notification.warning('Debes agregar al menos una pregunta al formulario');
      return;
    }

    // Generar el schema
    const schema = this.generateFormSchema();

    // Construir el nombre del formulario
    const formName = `Formulario de ${this.getStageTitle()} para el producto ${this.productName()}`;

    // Construir el request
    const formData = {
      name: formName,
      description: '',
      applicableStages: [this.getStageCode().toLowerCase()],
      schema: JSON.stringify(schema),
    };

    this.saving.set(true);

    // Determinar si es creación o actualización
    const saveObservable = this.editMode()
      ? this.productsService.updateProductForm(this.productId(), this.formId()!, formData)
      : this.productsService.createProductForm(this.productId(), formData);

    saveObservable.subscribe({
      next: (response) => {
        console.log('Formulario guardado:', response);
        const successMessage = this.editMode()
          ? 'Formulario actualizado correctamente'
          : 'Formulario guardado correctamente';
        this.notification.success(successMessage);
        this.saving.set(false);
        this.goBack();
      },
      error: (error) => {
        console.error('Error guardando formulario:', error);
        // Extraer mensaje de error del API si existe
        const errorMessage =
          error?.error?.message || error?.message || 'Error al guardar el formulario';
        this.notification.error(errorMessage);
        this.saving.set(false);
      },
    });
  }

  /**
   * Volver a la página anterior
   */
  goBack(): void {
    this.location.back();
  }

  /**
   * Cancelar y volver
   */
  cancel(): void {
    this.goBack();
  }
}
