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
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { ActivatedRoute, Router } from '@angular/router';
import { CompanyFormService } from '../services/company-form.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { ProductsService } from '@features/products/services/products.service';
import { ProductProtocolsService } from '@features/products/services/product-protocols.service';
import { ProjectsService } from '@features/projects/services/projects.service';
import {
  ProjectStage,
  FormStatus,
  FormScope,
  FormSchemaResponse,
  FormSchemaUpsertRequest,
  STAGE_LABELS,
  STAGE_CODES,
  ALL_STAGES,
  FormField,
  FormSection,
  AppliesTo,
  APPLIES_TO_LABELS,
} from '../models/dynamic-form.model';
import { Product } from '@features/products/models';
import { Project } from '@features/projects/models/project.model';
import { FieldType } from '@features/products/models';
import { ProductProtocol } from '@features/products/models';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';
import { UploadResult } from '@core/services/file-upload.service';

/**
 * Builder component con 2 pasos:
 * 1. Metadata (producto, ámbito, proyecto, etapas, fechas)
 * 2. Form Builder (protocol_linked + free_form) - solo después de crear
 */
@Component({
  selector: 'app-dynamic-form-builder-page',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatExpansionModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
    MatStepperModule,
    ImageUploadComponent,
  ],
  templateUrl: './dynamic-form-builder.page.html',
  styleUrl: './dynamic-form-builder.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicFormBuilderPage implements OnInit {
  private companyFormService = inject(CompanyFormService);
  private productsService = inject(ProductsService);
  private productProtocolsService = inject(ProductProtocolsService);
  private projectsService = inject(ProjectsService);
  private azureStorage = inject(AzureStorageService);
  private notification = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);

  // ========== ROUTE PARAMS ==========
  formId = signal<string | null>(null);
  productIdParam = signal<string | null>(null);

  // ========== COMPUTED ==========
  editMode = computed(() => !!this.formId());

  // ========== UI STATE ==========
  loading = signal(true);
  saving = signal(false);
  loadingProducts = signal(false);
  loadingProjects = signal(false);
  loadingFieldTypes = signal(false);
  loadingProtocols = signal(false);

  // Stepper
  currentStep = signal(0); // 0 = metadata, 1 = builder

  // ========== STEP 1: METADATOS BÁSICOS (sin fechas) ==========
  title = signal('');
  description = signal('');
  productId = signal<string | null>(null);
  scope = signal<FormScope>('company');
  companyId = signal<string | null>(null);
  projectId = signal<string | null>(null);
  selectedStages = signal<ProjectStage[]>([]);

  // Custom logo upload
  uploadedLogoPath = signal<string | null>(null);
  logoWasRemoved = signal(false); // Track si el usuario eliminó la imagen
  originalLogoPath = signal<string | null>(null); // Logo original (en modo edición)
  currentLogoUrl = signal<string | null>(null); // URL con SAS token para preview

  // Catalogs
  products = signal<Product[]>([]);
  projects = signal<Project[]>([]);

  // Validations for step 1
  scopeRequiresProject = computed(() => this.scope() === 'project');
  canProceedToBuilder = computed(() => {
    return (
      this.title().trim().length > 0 &&
      !!this.productId() &&
      this.selectedStages().length > 0 &&
      (!this.scopeRequiresProject() || !!this.projectId())
    );
  });

  // ========== STEP 2: FORM BUILDER ==========
  // Form versioning
  formStatus = signal<FormStatus>('draft');
  formVersion = signal<number>(1);
  isPublished = signal<boolean>(false);
  publishedAt = signal<string | null>(null);

  // Field types and protocols
  fieldTypes = signal<FieldType[]>([]);
  protocols = signal<ProductProtocol[]>([]);

  // Form sections
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

  // New field being created/edited
  newField = signal<Partial<FormField>>({
    question: '',
    fieldTypeId: '',
    isRequired: false,
    protocolId: null,
    validationConfig: {},
    appliesTo: 'both',
  });

  // Computed for selected field type
  selectedFieldType = computed(() => {
    const fieldTypeId = this.newField().fieldTypeId;
    if (!fieldTypeId) return null;
    return this.fieldTypes().find((ft) => ft.id === fieldTypeId) || null;
  });

  // Temp values for validation config
  tempOption = signal('');
  tempArrayValues = signal<Record<string, string>>({});

  // UI state
  protocolPanelExpanded = signal(true);
  freeFormPanelExpanded = signal(false);
  editingFieldId = signal<string | null>(null);
  editingSection = signal<'protocol_linked' | 'free_form' | null>(null);

  // Effect to initialize validation config when field type changes (SOLO en modo creación)
  constructor() {
    effect(() => {
      const fieldType = this.selectedFieldType();
      const isEditing = this.editingFieldId();

      // Solo aplicar valores por defecto si NO estamos editando un campo existente
      if (fieldType?.validationOptions && !isEditing) {
        console.log(
          '🔄 Aplicando validationOptions por defecto (modo creación):',
          fieldType.validationOptions,
        );
        // Initialize with default values
        this.newField.update((field) => ({
          ...field,
          validationConfig: { ...fieldType.validationOptions },
        }));
      } else if (isEditing) {
        console.log('✋ NO aplicar defaults - estamos editando un campo existente');
      }
    });
  }

  // ========== LIFECYCLE ==========
  ngOnInit(): void {
    const routeFormId = this.route.snapshot.paramMap.get('formId');
    const routeProductId = this.route.snapshot.paramMap.get('productId');

    this.formId.set(routeFormId);
    this.productIdParam.set(routeProductId);

    if (this.editMode()) {
      // Modo edición: cargar formulario existente e iniciar en paso 1
      if (!routeProductId) {
        this.notification.error('Error: productId requerido');
        this.goBack();
        return;
      }
      this.productId.set(routeProductId);
      this.loadExistingForm(routeProductId, routeFormId!);
      this.currentStep.set(0); // Iniciar en metadatos
    } else {
      // Modo creación: cargar productos y permanecer en paso 1
      this.loadProducts();
      this.loading.set(false);
    }
  }

  // ========== DATA LOADING ==========

  /**
   * Carga productos de la empresa
   */
  async loadProducts(): Promise<void> {
    this.loadingProducts.set(true);
    try {
      const _companyId = await this.authService.getUserCompanyId();
      this.productsService.getProducts().subscribe({
        next: (response) => {
          this.products.set(response.items);
          this.loadingProducts.set(false);
        },
        error: (error) => {
          console.error('Error loading products:', error);
          const message = error?.error?.message || 'Error al cargar productos';
          this.notification.error(message);
          this.products.set([]);
          this.loadingProducts.set(false);
        },
      });
    } catch (error) {
      console.error('Error getting companyId:', error);
      this.notification.error('Error al obtener empresa');
      this.loadingProducts.set(false);
    }
  }

  /**
   * Carga proyectos cuando el ámbito es 'project'
   */
  async loadProjects(): Promise<void> {
    this.loadingProjects.set(true);
    try {
      const companyId = await this.authService.getUserCompanyId();
      if (!companyId) {
        this.notification.error('Error: No se pudo obtener la empresa');
        this.loadingProjects.set(false);
        return;
      }
      this.projectsService.getProjects(companyId).subscribe({
        next: (response) => {
          this.projects.set(response.items);
          this.loadingProjects.set(false);
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          const message = error?.error?.message || 'Error al cargar proyectos';
          this.notification.error(message);
          this.projects.set([]);
          this.loadingProjects.set(false);
        },
      });
    } catch (error) {
      console.error('Error getting companyId:', error);
      this.loadingProjects.set(false);
    }
  }

  /**
   * Carga field types del producto seleccionado
   */
  private loadFieldTypes(productId: string): void {
    this.loadingFieldTypes.set(true);
    this.productsService.getFieldTypes(productId).subscribe({
      next: (fieldTypes) => {
        this.fieldTypes.set(fieldTypes);
        this.loadingFieldTypes.set(false);
      },
      error: (error) => {
        console.error('Error loading field types:', error);
        const message = error?.error?.message || 'Error al cargar tipos de campo';
        this.notification.error(message);
        this.fieldTypes.set([]);
        this.loadingFieldTypes.set(false);
      },
    });
  }

  /**
   * Carga protocolos del producto seleccionado
   */
  private loadProtocols(productId: string): void {
    this.loadingProtocols.set(true);
    this.productProtocolsService.getProductProtocols(productId).subscribe({
      next: (protocols) => {
        this.protocols.set(protocols);
        this.loadingProtocols.set(false);
      },
      error: (error) => {
        console.error('Error loading protocols:', error);
        const message = error?.error?.message || 'Error al cargar protocolos';
        this.notification.error(message);
        this.protocols.set([]);
        this.loadingProtocols.set(false);
      },
    });
  }

  /**
   * Carga un formulario existente para edición
   */
  private loadExistingForm(productId: string, formId: string): void {
    this.loading.set(true);
    this.companyFormService.getFormById(formId).subscribe({
      next: (formResponse: FormSchemaResponse) => {
        this.parseAndLoadForm(formResponse);
        // Load products to populate dropdown
        this.loadProducts();
        // Load field types and protocols for the product
        if (formResponse.productId) {
          this.loadFieldTypes(formResponse.productId);
          this.loadProtocols(formResponse.productId);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading form:', error);
        const message = error?.error?.message || 'Error al cargar formulario';
        this.notification.error(message);
        this.loading.set(false);
        this.goBack();
      },
    });
  }

  /**
   * Parsea y carga los datos del formulario
   */
  private parseAndLoadForm(response: FormSchemaResponse): void {
    try {
      // Load metadata
      this.title.set(response.name || 'Formulario Dinámico');
      this.description.set(response.description || '');
      this.productId.set(response.productId);
      this.scope.set(response.projectId ? 'project' : 'company');
      this.projectId.set(response.projectId || null);
      this.selectedStages.set(
        response.applicableStages.map((stage) => stage.toLowerCase() as ProjectStage),
      );

      // Si tiene projectId, cargar la lista de proyectos
      if (response.projectId) {
        this.loadProjects();
      }

      // Load versioning
      this.formStatus.set(response.status);
      this.formVersion.set(response.version);
      this.isPublished.set(response.isPublished);
      this.publishedAt.set(response.publishedAt);

      // Load custom logo if exists - obtener URL con SAS token
      if (response.customLogoUrl) {
        this.originalLogoPath.set(response.customLogoUrl);
        this.uploadedLogoPath.set(response.customLogoUrl);
        // Obtener URL con SAS token para preview
        this.azureStorage.getFileUrl(response.customLogoUrl, 5).subscribe({
          next: (url) => {
            this.currentLogoUrl.set(url);
          },
          error: (error) => {
            console.error('Error obteniendo URL del logo:', error);
            this.currentLogoUrl.set(null);
          },
        });
      }

      // Parse schema
      const schema = JSON.parse(response.schema);
      if (!schema.sections || !Array.isArray(schema.sections)) {
        throw new Error('Schema inválido');
      }

      // Load protocol_linked section
      const protocolSection = schema.sections.find(
        (s: { type: string }) => s.type === 'protocol_linked',
      );
      if (protocolSection) {
        const protocolFields: FormField[] = protocolSection.fields.map(
          (field: {
            question: string;
            id_field_type: string;
            required: boolean;
            id_protocol: string;
            validationOptions: Record<string, unknown>;
            applies_to: string;
          }) => ({
            id: `field-protocol-${Date.now()}-${Math.random()}`,
            question: field.question,
            fieldTypeId: field.id_field_type,
            isRequired: field.required,
            protocolId: field.id_protocol || null,
            validationConfig: field.validationOptions,
            appliesTo: (field.applies_to || 'both') as AppliesTo,
          }),
        );
        this.protocolLinkedSection.set({
          title: 'Parte 1',
          type: 'protocol_linked',
          fields: protocolFields,
        });
      }

      // Load free_form section
      const freeSection = schema.sections.find((s: { type: string }) => s.type === 'free_form');
      if (freeSection) {
        const freeFields: FormField[] = freeSection.fields.map(
          (field: {
            question: string;
            id_field_type: string;
            required: boolean;
            validationOptions: Record<string, unknown>;
            applies_to: string;
          }) => ({
            id: `field-free-${Date.now()}-${Math.random()}`,
            question: field.question,
            fieldTypeId: field.id_field_type,
            isRequired: field.required,
            validationConfig: field.validationOptions,
            appliesTo: (field.applies_to || 'both') as AppliesTo,
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
      console.error('Error parsing schema:', error);
      this.notification.error('Error al procesar el formulario');
      this.goBack();
    }
  }

  // ========== STEP 1: METADATA ACTIONS ==========

  /**
   * Maneja la subida de imagen personalizada
   */
  onImageUploaded(result: UploadResult): void {
    this.uploadedLogoPath.set(result.relativePath);
    this.logoWasRemoved.set(false); // Reset removed flag
  }

  /**
   * Maneja la eliminación de imagen personalizada
   */
  onImageRemoved(): void {
    this.uploadedLogoPath.set(null);
    this.logoWasRemoved.set(true); // Marcar que se eliminó explícitamente
  }

  /**
   * Cuando cambia el ámbito a 'project', cargar proyectos
   */
  onScopeChange(scope: FormScope): void {
    this.scope.set(scope);
    if (scope === 'project' && this.projects().length === 0) {
      this.loadProjects();
    }
    if (scope === 'company') {
      this.projectId.set(null);
    }
  }

  /**
   * Cuando cambia el producto, cargar field types y protocols
   */
  async onProductChange(productId: string | null): Promise<void> {
    this.productId.set(productId);
    if (productId) {
      // Pre-cargar field types y protocols para el paso 2
      this.loadFieldTypes(productId);
      this.loadProtocols(productId);
    }
  }

  /**
   * Procede al paso 2 (builder)
   * Solo avanza al siguiente paso, no crea nada en el backend hasta el final
   */
  proceedToBuilder(stepper: { next: () => void }): void {
    if (!this.canProceedToBuilder()) {
      this.notification.warning('Completa todos los campos requeridos');
      return;
    }

    // Avanzar al paso 2
    stepper.next();
    this.currentStep.set(1);
  }

  /**
   * Toggle stage selection
   */
  toggleStage(stage: ProjectStage): void {
    const current = this.selectedStages();
    if (current.includes(stage)) {
      this.selectedStages.set(current.filter((s) => s !== stage));
    } else {
      this.selectedStages.set([...current, stage]);
    }
  }

  // ========== HELPER METHODS FOR TEMPLATE ==========

  /**
   * Updates question field
   */
  updateQuestion(value: string): void {
    this.newField.update((f) => ({ ...f, question: value }));
  }

  /**
   * Updates protocolId field
   */
  updateProtocolId(value: string | null): void {
    this.newField.update((f) => ({ ...f, protocolId: value }));
  }

  /**
   * Updates fieldTypeId field
   */
  updateFieldTypeId(value: string): void {
    this.newField.update((f) => ({ ...f, fieldTypeId: value }));
  }

  /**
   * Updates appliesTo field
   */
  updateAppliesTo(value: AppliesTo): void {
    this.newField.update((f) => ({ ...f, appliesTo: value }));
  }

  /**
   * Updates isRequired field
   */
  updateIsRequired(value: boolean): void {
    this.newField.update((f) => ({ ...f, isRequired: value }));
  }

  /**
   * Updates a temp array value
   */
  updateTempArrayValue(key: string, value: string): void {
    this.tempArrayValues.update((v) => ({ ...v, [key]: value }));
  }

  // ========== STEP 2: FORM BUILDER ACTIONS ==========

  /**
   * Añade o actualiza un campo
   */
  addField(): void {
    const newFieldData = this.newField();

    console.log('➕ Añadiendo/Actualizando campo:', newFieldData);
    console.log('📋 validationConfig:', newFieldData.validationConfig);

    if (!newFieldData.question?.trim()) {
      this.notification.warning('Debes ingresar una pregunta');
      return;
    }

    if (!newFieldData.fieldTypeId) {
      this.notification.warning('Debes seleccionar un tipo de campo');
      return;
    }

    const hasProtocol = !!newFieldData.protocolId;
    const targetSection = hasProtocol ? 'protocol_linked' : 'free_form';
    const editingId = this.editingFieldId();
    const editingInSection = this.editingSection();

    // Asegurarse de que validationConfig no sea undefined
    const validationConfig =
      newFieldData.validationConfig && Object.keys(newFieldData.validationConfig).length > 0
        ? { ...newFieldData.validationConfig } // Crear copia
        : {};

    console.log('📋 validationConfig a guardar:', validationConfig);

    const field: FormField = {
      id: editingId || `temp-${Date.now()}-${Math.random()}`,
      question: newFieldData.question!.trim(),
      fieldTypeId: newFieldData.fieldTypeId!,
      isRequired: newFieldData.isRequired || false,
      protocolId: newFieldData.protocolId,
      validationConfig: validationConfig,
      appliesTo: newFieldData.appliesTo || 'both',
    };

    console.log('📦 Campo final a guardar:', field);

    if (editingId && editingInSection) {
      // Editing existing field
      if (editingInSection === 'protocol_linked') {
        const section = this.protocolLinkedSection();
        this.protocolLinkedSection.set({
          ...section,
          fields: section.fields.map((f) => (f.id === editingId ? field : f)),
        });
      } else {
        const section = this.freeFormSection();
        this.freeFormSection.set({
          ...section,
          fields: section.fields.map((f) => (f.id === editingId ? field : f)),
        });
      }
      this.notification.success('Campo actualizado');
      this.editingFieldId.set(null);
      this.editingSection.set(null);
    } else {
      // Adding new field
      if (targetSection === 'protocol_linked') {
        const section = this.protocolLinkedSection();
        this.protocolLinkedSection.set({
          ...section,
          fields: [...section.fields, field],
        });
      } else {
        const section = this.freeFormSection();
        this.freeFormSection.set({
          ...section,
          fields: [...section.fields, field],
        });
      }
    }

    // Reset form
    this.newField.set({
      question: '',
      fieldTypeId: '',
      isRequired: false,
      protocolId: null,
      validationConfig: {},
      appliesTo: 'both',
    });
    this.tempOption.set('');
    this.tempArrayValues.set({});
  }

  /**
   * Edita un campo
   */
  editField(field: FormField, section: 'protocol_linked' | 'free_form'): void {
    console.log('🔧 Editando campo:', field);
    console.log('📋 validationConfig del campo:', field.validationConfig);

    this.editingFieldId.set(field.id!);
    this.editingSection.set(section);

    // Hacer una copia profunda del validationConfig para evitar referencias
    const validationCopy = field.validationConfig
      ? JSON.parse(JSON.stringify(field.validationConfig))
      : {};

    console.log('📋 validationConfig copiado:', validationCopy);

    this.newField.set({
      question: field.question,
      fieldTypeId: field.fieldTypeId,
      isRequired: field.isRequired,
      protocolId: field.protocolId || null,
      validationConfig: validationCopy,
      appliesTo: field.appliesTo || 'both',
    });

    // Scroll to form
    setTimeout(() => {
      const formElement = document.querySelector('.new-field-form');
      formElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  /**
   * Cancela edición
   */
  cancelEdit(): void {
    this.editingFieldId.set(null);
    this.editingSection.set(null);
    this.newField.set({
      question: '',
      fieldTypeId: '',
      isRequired: false,
      protocolId: null,
      validationConfig: {},
      appliesTo: 'both',
    });
    this.tempOption.set('');
    this.tempArrayValues.set({});
  }

  /**
   * Resetea el formulario de nuevo campo
   */
  resetNewField(): void {
    this.cancelEdit();
  }

  /**
   * Cancela la edición de campo
   */
  cancelEditField(): void {
    this.cancelEdit();
  }

  /**
   * Actualiza el campo en edición (alias de addField cuando estamos editando)
   */
  updateField(): void {
    this.addField();
  }

  /**
   * Elimina un campo
   */
  removeField(fieldId: string, section: 'protocol_linked' | 'free_form'): void {
    if (section === 'protocol_linked') {
      const currentSection = this.protocolLinkedSection();
      this.protocolLinkedSection.set({
        ...currentSection,
        fields: currentSection.fields.filter((f) => f.id !== fieldId),
      });
    } else {
      const currentSection = this.freeFormSection();
      this.freeFormSection.set({
        ...currentSection,
        fields: currentSection.fields.filter((f) => f.id !== fieldId),
      });
    }

    if (this.editingFieldId() === fieldId) {
      this.cancelEdit();
    }
  }

  // ========== VALIDATION CONFIG HELPERS ==========

  /**
   * Actualiza un valor de validación
   */
  updateValidation(key: string, value: unknown): void {
    this.newField.update((field) => ({
      ...field,
      validationConfig: {
        ...(field.validationConfig || {}),
        [key]: value,
      },
    }));
  }

  /**
   * Obtiene el valor actual de una validación
   */
  getValidationValue(key: string): unknown {
    return this.newField().validationConfig?.[key];
  }

  /**
   * Añade una opción al array de validación
   */
  addValidationOption(): void {
    const option = this.tempOption().trim();
    if (!option) {
      this.notification.warning('Ingresa una opción');
      return;
    }

    const currentOptions = (this.getValidationValue('options') as string[]) || [];
    if (currentOptions.includes(option)) {
      this.notification.warning('Esta opción ya existe');
      return;
    }

    this.updateValidation('options', [...currentOptions, option]);
    this.tempOption.set('');
  }

  /**
   * Elimina una opción del array
   */
  removeValidationOption(option: string): void {
    const currentOptions = (this.getValidationValue('options') as string[]) || [];
    this.updateValidation(
      'options',
      currentOptions.filter((o) => o !== option),
    );
  }

  /**
   * Wrapper for removing validation option with type safety
   */
  removeValidationOptionSafe(option: unknown): void {
    this.removeValidationOption(String(option));
  }

  /**
   * Añade un valor a un array de validación
   */
  addArrayValue(key: string): void {
    const value = this.tempArrayValues()[key]?.trim();
    if (!value) {
      this.notification.warning('Ingresa un valor');
      return;
    }

    const currentArray = (this.getValidationValue(key) as string[]) || [];
    if (currentArray.includes(value)) {
      this.notification.warning('Este valor ya existe');
      return;
    }

    this.updateValidation(key, [...currentArray, value]);
    this.tempArrayValues.update((values) => ({ ...values, [key]: '' }));
  }

  /**
   * Elimina un valor de un array
   */
  removeArrayValue(key: string, value: string): void {
    const currentArray = (this.getValidationValue(key) as string[]) || [];
    this.updateValidation(
      key,
      currentArray.filter((v) => v !== value),
    );
  }

  /**
   * Wrapper for removing array value with type safety
   */
  removeArrayValueSafe(key: string, value: unknown): void {
    this.removeArrayValue(key, String(value));
  }

  // ========== HELPERS ==========

  /**
   * Obtiene las claves de validationConfig del newField
   */
  getValidationKeys(): string[] {
    const config = this.newField().validationConfig || {};
    return Object.keys(config);
  }

  /**
   * Determina el tipo de validación basado en el valor
   */
  getValidationType(key: string): 'string' | 'number' | 'boolean' | 'date' | 'string[]' {
    const value = this.getValidationValue(key);

    if (Array.isArray(value)) return 'string[]';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';

    // Check if it's a date field
    const dateFields = ['max_date', 'min_date', 'start_date', 'end_date', 'date', 'fecha'];
    if (dateFields.some((field) => key.toLowerCase().includes(field))) {
      return 'date';
    }

    return 'string';
  }

  /**
   * Obtiene el valor temporal de un array
   */
  getTempArrayValue(key: string): string {
    return this.tempArrayValues()[key] || '';
  }

  /**
   * Obtiene las claves de validationOptions
   */
  getValidationKeys2(validationOptions: Record<string, unknown> | null): string[] {
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
   * Verifica si un campo es de tipo fecha
   */
  isDateField(key: string): boolean {
    const dateFields = ['max_date', 'min_date', 'start_date', 'end_date', 'date', 'fecha'];
    return dateFields.some((field) => key.toLowerCase().includes(field));
  }

  /**
   * Formatea labels
   */
  formatLabel(key: string): string {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Convierte valor a array
   */
  asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  /**
   * Verifica si tiene valores en array
   */
  hasArrayValues(value: unknown): boolean {
    return Array.isArray(value) && value.length > 0;
  }

  /**
   * Verifica si tiene validation options
   */
  hasValidationOptions(fieldType: FieldType | null): boolean {
    if (!fieldType || !fieldType.validationOptions) return false;
    return Object.keys(fieldType.validationOptions).length > 0;
  }

  /**
   * Obtiene el nombre del field type
   */
  getFieldTypeName(fieldTypeId: string): string {
    const fieldType = this.fieldTypes().find((ft) => ft.id === fieldTypeId);
    return fieldType?.name || 'Desconocido';
  }

  /**
   * Obtiene el nombre del protocolo
   */
  getProtocolName(protocolId: string | null | undefined): string {
    if (!protocolId) return 'N/A';
    const protocol = this.protocols().find((p) => p.id === protocolId);
    return protocol?.attribute?.name || 'Desconocido';
  }

  /**
   * Genera el schema JSON
   */
  private generateFormSchema(): unknown {
    const sections: unknown[] = [];

    // Protocol linked section
    const protocolFields = this.protocolLinkedSection().fields;
    if (protocolFields.length > 0) {
      const mappedFields = protocolFields.map((field, index) => {
        const fieldType = this.fieldTypes().find((ft) => ft.id === field.fieldTypeId);
        const protocol = this.protocols().find((p) => p.id === field.protocolId);

        console.log(`📦 Mapeando protocol field ${index}:`, field);
        console.log(`📋 validationConfig original:`, field.validationConfig);

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
      });

      sections.push({
        id: 'section_1',
        name: 'Información del Árbol',
        type: 'protocol_linked',
        auto_approve: true,
        display_order: 1,
        fields: mappedFields,
      });
    }

    // Free form section
    const freeFormFields = this.freeFormSection().fields;
    if (freeFormFields.length > 0) {
      const mappedFields = freeFormFields.map((field, index) => {
        const fieldType = this.fieldTypes().find((ft) => ft.id === field.fieldTypeId);

        console.log(`📦 Mapeando free form field ${index}:`, field);
        console.log(`📋 validationConfig original:`, field.validationConfig);

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
      });

      sections.push({
        id: 'section_2',
        name: 'Evidencias',
        type: 'free_form',
        auto_approve: false,
        display_order: 2,
        fields: mappedFields,
      });
    }

    const schema = { sections };
    console.log('📦 Schema generado completo:', JSON.stringify(schema, null, 2));

    return schema;
  }

  /**
   * Mueve un campo hacia arriba en la lista
   */
  moveFieldUp(index: number, section: 'protocol_linked' | 'free_form'): void {
    if (index === 0) return;

    if (section === 'protocol_linked') {
      const currentSection = this.protocolLinkedSection();
      const fields = [...currentSection.fields];
      [fields[index], fields[index - 1]] = [fields[index - 1], fields[index]];
      this.protocolLinkedSection.set({ ...currentSection, fields });
    } else {
      const currentSection = this.freeFormSection();
      const fields = [...currentSection.fields];
      [fields[index], fields[index - 1]] = [fields[index - 1], fields[index]];
      this.freeFormSection.set({ ...currentSection, fields });
    }
  }

  /**
   * Mueve un campo hacia abajo en la lista
   */
  moveFieldDown(index: number, section: 'protocol_linked' | 'free_form'): void {
    const sectionData =
      section === 'protocol_linked' ? this.protocolLinkedSection() : this.freeFormSection();

    if (index === sectionData.fields.length - 1) return;

    if (section === 'protocol_linked') {
      const currentSection = this.protocolLinkedSection();
      const fields = [...currentSection.fields];
      [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
      this.protocolLinkedSection.set({ ...currentSection, fields });
    } else {
      const currentSection = this.freeFormSection();
      const fields = [...currentSection.fields];
      [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
      this.freeFormSection.set({ ...currentSection, fields });
    }
  }

  /**
   * Guarda el formulario con los campos usando el endpoint unificado
   */
  async saveForm(): Promise<void> {
    const totalFields =
      this.protocolLinkedSection().fields.length + this.freeFormSection().fields.length;

    if (totalFields === 0) {
      this.notification.warning('Debes agregar al menos un campo');
      return;
    }

    this.saving.set(true);

    const schema = this.generateFormSchema();
    const product = this.products().find((p) => p.id === this.productId());
    const formName = `Formulario de ${product?.name || 'Producto'}`;

    // Determinar el valor de customLogoUrl según las acciones del usuario
    let customLogoUrl: string | undefined;
    const originalLogo = this.originalLogoPath();

    if (this.uploadedLogoPath()) {
      // Caso 1: Usuario subió una imagen nueva
      customLogoUrl = this.uploadedLogoPath()!;
    } else if (this.logoWasRemoved()) {
      // Caso 2: Usuario eliminó la imagen existente
      customLogoUrl = ''; // Enviar string vacío para indicar que se debe borrar
    } else {
      // Caso 3: No hubo cambios → mantener la imagen actual (solo en modo edit)
      customLogoUrl = this.editMode() ? originalLogo || undefined : undefined;
    }

    const request: FormSchemaUpsertRequest = {
      name: this.title().trim() || formName,
      description: this.description().trim(),
      applicableStages: this.selectedStages().map((s) => STAGE_CODES[s].toLowerCase()),
      schema: JSON.stringify(schema),
      customLogoUrl: customLogoUrl || undefined, // Solo enviar si tiene valor
    };

    // Determinar formId y projectId para el endpoint unificado
    const formIdToSend = this.editMode() ? this.formId() : null;
    const projectIdToSend = this.scope() === 'project' ? this.projectId() : null;

    // Llamar al endpoint unificado
    this.companyFormService
      .upsertForm(this.productId()!, request, formIdToSend, projectIdToSend)
      .subscribe({
        next: (_response) => {
          const action = this.editMode() ? 'actualizado' : 'creado';
          this.notification.success(`Formulario ${action} correctamente`);
          this.saving.set(false);
          this.goBack();
        },
        error: (error) => {
          console.error('Error saving form:', error);
          const action = this.editMode() ? 'actualizar' : 'crear';
          const message = error?.error?.message || `Error al ${action} formulario`;
          this.notification.error(message);
          this.saving.set(false);
        },
      });
  }

  /**
   * Vuelve a la lista
   */
  goBack(): void {
    this.location.back();
  }

  // ========== CONSTANTS FOR TEMPLATE ==========
  readonly STAGE_LABELS = STAGE_LABELS;
  readonly ALL_STAGES = ALL_STAGES;
  readonly APPLIES_TO_LABELS = APPLIES_TO_LABELS;
}
