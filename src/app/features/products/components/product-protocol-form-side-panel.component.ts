import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  DomainAttribute,
  DomainAttributeDataType,
  ValidationOperator,
  OPERATOR_LABELS,
  DATA_TYPE_LABELS,
} from '../models/domain-attribute.model';
import { ProductProtocol, CreateProductProtocolDto, UpdateProductProtocolDto } from '../models';
import { DomainAttributesService } from '../services/domain-attributes.service';

export interface ProductProtocolFormSidePanelData {
  productId: string;
  productName: string;
  mode: 'create' | 'edit';
  protocol?: ProductProtocol;
}

export interface ProductProtocolFormSidePanelResult {
  saved: boolean;
  data: CreateProductProtocolDto | UpdateProductProtocolDto;
}

@Component({
  selector: 'app-product-protocol-form-side-panel',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './product-protocol-form-side-panel.component.html',
  styleUrl: './product-protocol-form-side-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [animate('300ms ease-in', style({ transform: 'translateX(100%)' }))]),
    ]),
  ],
})
export class ProductProtocolFormSidePanelComponent implements OnInit {
  private fb = inject(FormBuilder);
  private domainAttributesService = inject(DomainAttributesService);
  private cdr = inject(ChangeDetectorRef);

  // Panel state
  isOpen = signal(false);
  data = signal<ProductProtocolFormSidePanelData | null>(null);

  // Data
  domainAttributes = signal<DomainAttribute[]>([]);
  loadingAttributes = signal(true);
  saving = signal(false);
  dataReady = signal(false); // Flag para renderizar mat-select solo cuando datos estén listos

  // Form
  form!: FormGroup;

  // Enums for template
  operators: ValidationOperator[] = [
    ValidationOperator.EQUALS,
    ValidationOperator.NOT_EQUALS,
    ValidationOperator.GREATER_THAN,
    ValidationOperator.GREATER_OR_EQUAL,
    ValidationOperator.LESS_THAN,
    ValidationOperator.LESS_OR_EQUAL,
    ValidationOperator.IN,
    ValidationOperator.NOT_IN,
    ValidationOperator.BETWEEN,
    ValidationOperator.CONTAINS,
  ];
  operatorLabels = OPERATOR_LABELS;
  dataTypeLabels = DATA_TYPE_LABELS;

  // UI state signals (updated on form changes)
  selectedOperator = signal<ValidationOperator | undefined>(undefined);
  selectedAttribute = signal<DomainAttribute | null>(null);

  needsTwoValues = computed(() => this.selectedOperator() === ValidationOperator.BETWEEN);
  needsMultipleValues = computed(() => {
    const op = this.selectedOperator();
    return op === ValidationOperator.IN || op === ValidationOperator.NOT_IN;
  });

  // Computed
  isEditMode = computed(() => this.data()?.mode === 'edit');

  // Computed: Available operators based on selected attribute data type
  availableOperators = computed(() => {
    const attr = this.selectedAttribute();
    if (!attr) return this.operators;

    const dataType = attr.dataType.toUpperCase();

    // NUMERIC: all comparison operators
    if (dataType.includes('NUMERIC') || dataType === 'INTEGER' || dataType === 'DECIMAL') {
      return [
        ValidationOperator.EQUALS,
        ValidationOperator.NOT_EQUALS,
        ValidationOperator.GREATER_THAN,
        ValidationOperator.GREATER_OR_EQUAL,
        ValidationOperator.LESS_THAN,
        ValidationOperator.LESS_OR_EQUAL,
        ValidationOperator.IN,
        ValidationOperator.NOT_IN,
        ValidationOperator.BETWEEN,
      ];
    }

    // ENUM or STRING: only equals, not equals, in, not_in, contains
    if (dataType === 'ENUM' || dataType === 'STRING' || dataType === 'TEXT') {
      return [
        ValidationOperator.EQUALS,
        ValidationOperator.NOT_EQUALS,
        ValidationOperator.IN,
        ValidationOperator.NOT_IN,
        ValidationOperator.CONTAINS,
      ];
    }

    // DATE/DATETIME: comparison operators
    if (dataType === 'DATE' || dataType === 'DATETIME') {
      return [
        ValidationOperator.EQUALS,
        ValidationOperator.NOT_EQUALS,
        ValidationOperator.GREATER_THAN,
        ValidationOperator.GREATER_OR_EQUAL,
        ValidationOperator.LESS_THAN,
        ValidationOperator.LESS_OR_EQUAL,
        ValidationOperator.BETWEEN,
      ];
    }

    return this.operators;
  });

  // Computed: Is ENUM with allowed values
  isEnumWithAllowedValues = computed(() => {
    const attr = this.selectedAttribute();
    const op = this.selectedOperator();
    // The 'IN' and 'NOT_IN' operators should use the multi-select input, not the enum dropdown.
    if (op === ValidationOperator.IN || op === ValidationOperator.NOT_IN) {
      return false;
    }
    return (
      attr?.dataType.toUpperCase() === 'ENUM' && attr.allowedValues && attr.allowedValues.length > 0
    );
  });

  // Callback for closing with result
  private closeCallback?: (result: ProductProtocolFormSidePanelResult | null) => void;

  ngOnInit(): void {
    this.initForm();
    // No cargamos atributos aquí, se cargan cuando se abre el panel
  }

  private initForm(): void {
    this.form = this.fb.group({
      domainAttributeId: ['', Validators.required],
      operator: ['', Validators.required],
      expectedValue: ['', Validators.required],
      expectedValueMax: [''], // For BETWEEN operator
      isMandatory: [true],
      rejectionMessage: [''],
    });

    // Update validators when attribute changes
    this.form.get('domainAttributeId')?.valueChanges.subscribe((attributeId: string) => {
      const attr = this.domainAttributes().find((a) => a.id === attributeId) || null;
      this.selectedAttribute.set(attr);
      this.updateAttributeValidators();
      this.cdr.markForCheck();
    });

    // Update validators when operator changes
    this.form.get('operator')?.valueChanges.subscribe((operator: ValidationOperator) => {
      this.selectedOperator.set(operator);
      this.updateValueValidators();
      this.cdr.markForCheck(); // Force change detection
    });
  }

  private updateValueValidators(): void {
    const expectedValueMax = this.form.get('expectedValueMax');

    if (this.needsTwoValues()) {
      expectedValueMax?.setValidators([Validators.required]);
    } else {
      expectedValueMax?.clearValidators();
    }

    expectedValueMax?.updateValueAndValidity();

    // Apply attribute-specific validators to expectedValue
    this.updateAttributeValidators();
  }

  private updateAttributeValidators(): void {
    const expectedValue = this.form.get('expectedValue');
    const expectedValueMax = this.form.get('expectedValueMax');
    const attr = this.selectedAttribute();

    if (!attr || !expectedValue) return;

    const validators: ValidatorFn[] = [Validators.required];
    const rules = attr.validationRules;
    const dataType = attr.dataType.toUpperCase();

    // Apply min/max validators for numeric types
    if (dataType.includes('NUMERIC') || dataType === 'INTEGER' || dataType === 'DECIMAL') {
      if (rules?.min !== undefined && rules.min !== null) {
        validators.push(Validators.min(rules.min));
      }
      if (rules?.max !== undefined && rules.max !== null) {
        validators.push(Validators.max(rules.max));
      }
    }

    // Apply allowedValues validator for ENUM types (only for single value operators)
    if (dataType === 'ENUM' && attr.allowedValues && attr.allowedValues.length > 0) {
      // Only validate if not using multi-value operators (IN/NOT_IN will use mat-select)
      if (!this.needsMultipleValues()) {
        validators.push(this.createAllowedValuesValidator(attr.allowedValues));
      }
    }

    expectedValue.setValidators(validators);
    expectedValue.updateValueAndValidity();

    // Apply same validators to expectedValueMax for BETWEEN
    if (this.needsTwoValues() && expectedValueMax) {
      const maxValidators = [...validators]; // Copy validators
      expectedValueMax.setValidators(maxValidators);
      expectedValueMax.updateValueAndValidity();
    }
  }

  /**
   * Creates a custom validator to check if value is in allowedValues
   */
  private createAllowedValuesValidator(allowedValues: string[]): ValidatorFn {
    return (control) => {
      if (!control.value) return null; // Let required validator handle empty values

      const value = String(control.value).trim();
      const isValid = allowedValues.includes(value);

      return isValid
        ? null
        : {
            allowedValues: {
              value: control.value,
              allowedValues: allowedValues,
            },
          };
    };
  }

  /**
   * Validates that form values are within allowedValues for ENUM types
   */
  private validateAllowedValues(
    formValue: { expectedValue: unknown },
    allowedValues: string[],
  ): boolean {
    if (this.needsMultipleValues()) {
      // IN/NOT_IN: validate all values in array
      let values: string[];

      if (Array.isArray(formValue.expectedValue)) {
        values = formValue.expectedValue.map((v: unknown) => String(v));
      } else {
        // Type guard: expectedValue is a string when not array
        const stringValue = String(formValue.expectedValue);
        values = stringValue.split(',').map((v: string) => v.trim());
      }

      return values.every((v) => allowedValues.includes(v));
    } else {
      // Single value: validate expectedValue
      const value = String(formValue.expectedValue).trim();
      return allowedValues.includes(value);
    }
  }

  private loadDomainAttributes(): void {
    this.loadingAttributes.set(true);
    this.dataReady.set(false);
    this.domainAttributesService.getAllDomainAttributes().subscribe({
      next: (attributes) => {
        console.log('Domain attributes loaded:', attributes); // Debug
        this.domainAttributes.set(attributes);
        console.log('Doman', this.domainAttributes());
        this.loadingAttributes.set(false);
        // Sincronizar selectedAttribute con el valor actual del formulario (edición)
        const attributeId = this.form?.get('domainAttributeId')?.value;
        if (attributeId) {
          const attr = attributes.find((a) => a.id === attributeId) || null;
          this.selectedAttribute.set(attr);
          this.updateAttributeValidators();
        }

        this.dataReady.set(true);
        this.cdr.markForCheck();
        console.log('Data ready:', this.dataReady());
      },
      error: (error) => {
        console.error('Error loading domain attributes:', error);
        this.domainAttributes.set([]);
        this.loadingAttributes.set(false);
        this.dataReady.set(true);
        this.cdr.markForCheck();
      },
    });
  }

  open(
    data: ProductProtocolFormSidePanelData,
    callback: (result: ProductProtocolFormSidePanelResult | null) => void,
  ): void {
    console.log('Opening panel with data:', data); // Debug
    console.log('Operators array:', this.operators); // Debug
    console.log('Domain attributes (before load):', this.domainAttributes()); // Debug

    this.data.set(data);
    this.closeCallback = callback;

    // Load domain attributes first
    this.loadDomainAttributes();

    // Open panel
    this.isOpen.set(true);
    this.cdr.markForCheck();

    // Pre-fill form in edit mode
    if (data.mode === 'edit' && data.protocol) {
      const protocol = data.protocol;

      // Determine expected value based on value fields
      let expectedValue = '';
      let expectedValueMax = '';

      if (protocol.valueArray && protocol.valueArray.length > 0) {
        if (protocol.operator === ValidationOperator.BETWEEN) {
          // BETWEEN: two values
          expectedValue = String(protocol.valueArray[0] || '');
          expectedValueMax = String(protocol.valueArray[1] || '');
        } else {
          // IN/NOT_IN: comma-separated
          expectedValue = protocol.valueArray.join(', ');
        }
      } else if (protocol.valueNumeric !== null) {
        expectedValue = String(protocol.valueNumeric);
      } else if (protocol.valueText !== null) {
        expectedValue = protocol.valueText;
      }

      this.form.patchValue({
        domainAttributeId: protocol.attribute.id,
        operator: protocol.operator,
        expectedValue: expectedValue,
        expectedValueMax: expectedValueMax,
        isMandatory: protocol.isRequired,
        rejectionMessage: protocol.failureMessage || '',
      });

      // Update operator signals manually after patch
      this.selectedOperator.set(protocol.operator);
      // selectedAttribute will be synchronized once domain attributes are loaded
    } else {
      this.form.reset({
        isMandatory: true,
      });

      // Reset operator signals
      this.selectedOperator.set(undefined);
      this.selectedAttribute.set(null);
    }
  }

  close(): void {
    this.isOpen.set(false);
    this.data.set(null);
    this.form.reset();
  }

  onCancel(): void {
    if (this.closeCallback) {
      this.closeCallback(null);
    }
    this.close();
  }

  onSave(): void {
    console.log('onSave called'); // Debug
    console.log('Form valid:', this.form.valid); // Debug
    console.log('Form value:', this.form.value); // Debug

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.log('Form is invalid, aborting');
      return;
    }

    this.saving.set(true);
    console.log('Saving started'); // Debug

    const formValue = this.form.value;
    const currentData = this.data();
    console.log('Current data:', currentData); // Debug

    if (!currentData) {
      console.error('No data available');
      this.saving.set(false);
      return;
    }

    // Get attribute directly from form value instead of computed
    const attributeId = formValue.domainAttributeId;
    const attribute = this.domainAttributes().find((attr) => attr.id === attributeId);
    console.log('Attribute ID:', attributeId); // Debug
    console.log('Selected attribute:', attribute); // Debug

    if (!attribute) {
      console.error('No attribute selected');
      this.saving.set(false);
      return;
    }

    // Prepare DTO based on attribute data type and operator
    const dto: CreateProductProtocolDto | UpdateProductProtocolDto = {
      productId: currentData.productId,
      attributeId: formValue.domainAttributeId,
      operator: formValue.operator,
      isRequired: formValue.isMandatory,
      failureMessage: formValue.rejectionMessage || null,
      evaluationOrder: null,
      valueNumeric: null,
      valueText: null,
      valueArray: null,
    };

    console.log('DTO before value assignment:', dto); // Debug

    // Validate allowedValues for ENUM types before saving
    const dataType = attribute.dataType.toUpperCase();
    if (dataType === 'ENUM' && attribute.allowedValues && attribute.allowedValues.length > 0) {
      const isValid = this.validateAllowedValues(formValue, attribute.allowedValues);
      if (!isValid) {
        console.error('Invalid value for ENUM with allowedValues');
        this.saving.set(false);
        // Mark field as invalid
        this.form.get('expectedValue')?.setErrors({
          allowedValues: {
            value: formValue.expectedValue,
            allowedValues: attribute.allowedValues,
          },
        });
        return;
      }
    }

    // Determine which value field to use based on data type and operator
    if (this.needsTwoValues()) {
      // BETWEEN operator: use valueArray
      dto.valueArray = [
        this.parseValue(formValue.expectedValue, attribute.dataType),
        this.parseValue(formValue.expectedValueMax, attribute.dataType),
      ];
    } else if (this.needsMultipleValues()) {
      // IN/NOT_IN operators: handle both multi-select arrays and comma-separated strings
      let values: unknown[];

      if (Array.isArray(formValue.expectedValue)) {
        // Multi-select mat-select returns array (for ENUM with allowedValues)
        values = formValue.expectedValue;
      } else {
        // Textarea returns comma-separated string
        values = formValue.expectedValue
          .split(',')
          .map((v: string) => this.parseValue(v.trim(), attribute.dataType));
      }

      dto.valueArray = values;
    } else {
      // Single value: assign to appropriate field based on data type
      const value = formValue.expectedValue;
      const dataType = attribute.dataType.toUpperCase();

      console.log('Data type:', dataType); // Debug

      if (
        dataType.includes('NUMERIC') ||
        dataType === 'INTEGER' ||
        dataType === 'DECIMAL' ||
        dataType === 'NUMBER'
      ) {
        dto.valueNumeric = parseFloat(value);
        console.log('Assigned to valueNumeric:', dto.valueNumeric);
      } else {
        // STRING, TEXT, DATE, DATETIME, ENUM, etc.
        // Note: Boolean support removed as per DB constraints
        dto.valueText = value;
        console.log('Assigned to valueText:', dto.valueText);
      }
    }

    console.log('Protocol DTO to save:', dto); // Debug
    console.log('Callback exists:', !!this.closeCallback); // Debug

    if (this.closeCallback) {
      console.log('Calling callback with result'); // Debug
      this.closeCallback({
        saved: true,
        data: dto,
      });
    } else {
      console.error('No callback available!');
    }

    console.log('Setting saving to false'); // Debug
    this.saving.set(false);
    this.close();
  }

  /**
   * Parse value to correct type based on attribute data type
   */
  private parseValue(value: string, dataType: string): unknown {
    const type = dataType.toUpperCase();

    if (type.includes('NUMERIC') || type === 'INTEGER' || type === 'DECIMAL' || type === 'NUMBER') {
      return type === 'INTEGER' ? parseInt(value, 10) : parseFloat(value);
    }

    // Note: Boolean support removed as per DB constraints
    return value;
  }

  getInputType(): string {
    const attribute = this.selectedAttribute();
    if (!attribute) return 'text';

    const dataType = attribute.dataType.toUpperCase();

    if (
      dataType.includes('NUMERIC') ||
      dataType === 'INTEGER' ||
      dataType === 'DECIMAL' ||
      dataType === 'NUMBER'
    ) {
      return 'number';
    } else if (dataType === 'DATE') {
      return 'date';
    } else if (dataType === 'DATETIME') {
      return 'datetime-local';
    }

    return 'text';
  }

  getInputStep(): string | null {
    const attr = this.selectedAttribute();
    if (!attr) return null;

    const dataType = attr.dataType.toUpperCase();

    // Use decimals from validationRules if available
    if (attr.validationRules?.decimals !== undefined && attr.validationRules.decimals !== null) {
      const decimals = attr.validationRules.decimals;
      return decimals > 0 ? (1 / Math.pow(10, decimals)).toFixed(decimals) : '1';
    }

    // Fallback to dataType
    if (dataType === 'DECIMAL' || dataType.includes('DECIMAL')) {
      return '0.01';
    }
    if (dataType === 'INTEGER' || dataType.includes('INT')) {
      return '1';
    }
    return null;
  }

  getMinValue(): number | null {
    const attr = this.selectedAttribute();
    return attr?.validationRules?.min ?? null;
  }

  getMaxValue(): number | null {
    const attr = this.selectedAttribute();
    return attr?.validationRules?.max ?? null;
  }

  getValuePlaceholder(): string {
    const attribute = this.selectedAttribute();

    if (this.needsMultipleValues()) {
      return 'Valores separados por coma (ej: valor1, valor2, valor3)';
    }

    if (!attribute) {
      return 'Ingrese el valor esperado';
    }

    const unit = attribute.unit ? ` (${attribute.unit})` : '';

    switch (attribute.dataType) {
      case DomainAttributeDataType.INTEGER:
      case DomainAttributeDataType.DECIMAL:
        return `Ingrese un número${unit}`;
      case DomainAttributeDataType.BOOLEAN:
        return 'true o false';
      case DomainAttributeDataType.DATE:
        return 'Seleccione una fecha';
      case DomainAttributeDataType.DATETIME:
        return 'Seleccione fecha y hora';
      default:
        return `Ingrese el valor${unit}`;
    }
  }
}
