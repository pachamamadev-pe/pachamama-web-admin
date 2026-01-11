import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NotificationService } from '@core/services/notification.service';
import { ActivitiesService } from '../services/activities.service';
import { ActivityResponse, ValidationStatus } from '../models/activity.model';
import { ValidationOperator, OPERATOR_LABELS } from '../../products/models/domain-attribute.model';

/**
 * Field evaluation state
 */
interface FieldEvaluationState {
  sectionId: string;
  fieldIndex: number;
  status: 'approved' | 'rejected' | 'pending';
  manualOverride: boolean;
}

/**
 * Form field from activity data
 */
interface FormField {
  question: string;
  required: boolean;
  response: { value?: unknown; files?: string[] };
  applies_to: string;
  field_type: string;
  id_protocol?: string;
  protocol?: {
    valueText: string | null;
    valueNumeric: number | null;
    valueArray: string[] | null;
    operator: string;
  };
  validationOptions?: Record<string, unknown>;
  attribute_code?: string;
  field_validation_status?: 'approved' | 'rejected';
}

/**
 * Form section from activity data
 */
interface FormSection {
  id: string;
  name: string;
  type: 'protocol_linked' | 'free_form';
  fields: FormField[];
  auto_approve: boolean;
  display_order: number;
}

/**
 * Página para evaluar y validar una actividad de recolección
 */
@Component({
  selector: 'app-activity-evaluation-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './activity-evaluation.page.html',
  styleUrl: './activity-evaluation.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityEvaluationPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private activitiesService = inject(ActivitiesService);
  private notification = inject(NotificationService);

  // State
  loading = signal(true);
  activity = signal<ActivityResponse | null>(null);
  projectId = signal<string>('');
  activityId = signal<string>('');
  fieldEvaluations = signal<Map<string, FieldEvaluationState>>(new Map());
  validationNotes = signal<string>('');

  // Computed
  canApprove = computed(() => {
    const act = this.activity();
    return act && act.overallValidationStatus !== 'approved';
  });

  formSections = computed(() => {
    const act = this.activity();
    if (!act || !act.formData) return [];
    const data = act.formData as { sections?: FormSection[] };
    return (data.sections || []) as FormSection[];
  });

  allFieldsEvaluated = computed(() => {
    const sections = this.formSections();
    const evals = this.fieldEvaluations();
    let totalFields = 0;
    let evaluatedFields = 0;

    sections.forEach((section) => {
      section.fields.forEach((field, idx) => {
        totalFields++;
        const key = `${section.id}_${idx}`;
        const state = evals.get(key);
        if (state && state.status !== 'pending') {
          evaluatedFields++;
        }
      });
    });

    return totalFields > 0 && evaluatedFields === totalFields;
  });

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    const projId = params.get('projectId');
    const actId = params.get('activityId');

    if (projId && actId) {
      this.projectId.set(projId);
      this.activityId.set(actId);
      this.loadActivity(actId);
    } else {
      this.notification.error('Parámetros inválidos');
      this.goBack();
    }
  }

  /**
   * Carga los datos de la actividad
   */
  private loadActivity(activityId: string): void {
    this.loading.set(true);
    this.activitiesService.getActivityById(activityId).subscribe({
      next: (activity) => {
        this.activity.set(activity);
        this.validationNotes.set(this.activity()!.validationNotes || '');
        this.initializeFieldEvaluations(activity);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando actividad:', error);
        this.notification.error('Error al cargar la actividad');
        this.loading.set(false);
        this.goBack();
      },
    });
  }

  /**
   * Initializes field evaluation states with auto-evaluation for protocol fields
   */
  private initializeFieldEvaluations(activity: ActivityResponse): void {
    const data = activity.formData as { sections?: FormSection[] };
    if (!data || !data.sections) return;

    const evaluations = new Map<string, FieldEvaluationState>();
    const sections = data.sections as FormSection[];

    sections.forEach((section) => {
      section.fields.forEach((field, idx) => {
        const key = `${section.id}_${idx}`;
        let status: 'approved' | 'rejected' | 'pending' = 'pending';
        let manualOverride = false;

        // PRIORITY 1: If field already has field_validation_status, respect it
        if (field.field_validation_status) {
          status = field.field_validation_status;
          manualOverride = true; // Consider it as manually set
        }
        // PRIORITY 2: Auto-evaluate protocol-linked fields only if no existing status
        else if (section.type === 'protocol_linked' && field.protocol) {
          status = this.evaluateFieldAgainstProtocol(field) ? 'approved' : 'rejected';
        }

        evaluations.set(key, {
          sectionId: section.id,
          fieldIndex: idx,
          status,
          manualOverride,
        });
      });
    });

    this.fieldEvaluations.set(evaluations);
  }

  /**
   * Evaluates a field's response against its protocol
   */
  private evaluateFieldAgainstProtocol(field: FormField): boolean {
    if (!field.protocol || !field.response) return false;

    const response = field.response.value;
    const protocol = field.protocol;
    const operator = protocol.operator as ValidationOperator;

    // Determine expected value
    let expectedValue: unknown = null;
    if (protocol.valueText !== null) expectedValue = protocol.valueText;
    else if (protocol.valueNumeric !== null) expectedValue = protocol.valueNumeric;
    else if (protocol.valueArray !== null) expectedValue = protocol.valueArray;

    if (expectedValue === null) return false;

    // Evaluate based on operator
    switch (operator) {
      case ValidationOperator.EQUALS:
        return response == expectedValue;
      case ValidationOperator.NOT_EQUALS:
        return response != expectedValue;
      case ValidationOperator.GREATER_THAN:
        return Number(response) > Number(expectedValue);
      case ValidationOperator.GREATER_OR_EQUAL:
        return Number(response) >= Number(expectedValue);
      case ValidationOperator.LESS_THAN:
        return Number(response) < Number(expectedValue);
      case ValidationOperator.LESS_OR_EQUAL:
        return Number(response) <= Number(expectedValue);
      case ValidationOperator.IN:
        return Array.isArray(expectedValue) && expectedValue.includes(response);
      case ValidationOperator.NOT_IN:
        return Array.isArray(expectedValue) && !expectedValue.includes(response);
      case ValidationOperator.CONTAINS:
        return String(response).toLowerCase().includes(String(expectedValue).toLowerCase());
      case ValidationOperator.BETWEEN:
        if (Array.isArray(expectedValue) && expectedValue.length === 2) {
          const val = Number(response);
          return val >= Number(expectedValue[0]) && val <= Number(expectedValue[1]);
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * Approves a specific field
   */
  approveField(sectionId: string, fieldIndex: number): void {
    const key = `${sectionId}_${fieldIndex}`;
    const current = this.fieldEvaluations().get(key);
    if (current) {
      const updated = new Map(this.fieldEvaluations());
      updated.set(key, { ...current, status: 'approved', manualOverride: true });
      this.fieldEvaluations.set(updated);
    }
  }

  /**
   * Rejects a specific field
   */
  rejectField(sectionId: string, fieldIndex: number): void {
    const key = `${sectionId}_${fieldIndex}`;
    const current = this.fieldEvaluations().get(key);
    if (current) {
      const updated = new Map(this.fieldEvaluations());
      updated.set(key, { ...current, status: 'rejected', manualOverride: true });
      this.fieldEvaluations.set(updated);
    }
  }

  /**
   * Gets the evaluation state for a field
   */
  getFieldEvaluation(sectionId: string, fieldIndex: number): FieldEvaluationState | undefined {
    const key = `${sectionId}_${fieldIndex}`;
    return this.fieldEvaluations().get(key);
  }

  /**
   * Formats the expected value with operator for display
   */
  getExpectedValueDisplay(field: FormField): string {
    if (!field.protocol) return '';

    const protocol = field.protocol;
    const operator = protocol.operator as ValidationOperator;
    const operatorLabel = OPERATOR_LABELS[operator] || operator;

    let value = '';
    if (protocol.valueText !== null) value = protocol.valueText;
    else if (protocol.valueNumeric !== null) value = String(protocol.valueNumeric);
    else if (protocol.valueArray !== null) value = protocol.valueArray.join(', ');

    return `${operatorLabel} ${value}`;
  }

  /**
   * Guarda la evaluación completa de la actividad (permite estados parciales)
   */
  saveEvaluation(): void {
    const activity = this.activity();
    if (!activity) return;

    // Build updated formData with field_validation_status for each field
    const updatedFormData = this.buildUpdatedFormData();

    // Calculate overall validation status
    const overallStatus = this.calculateOverallValidationStatus();

    // Build request object
    const evaluationRequest = {
      formData: updatedFormData,
      overallValidationStatus: overallStatus,
      validationNotes: this.validationNotes().trim() || null,
    };

    // Enviar evaluación al backend
    this.activitiesService
      .updateActivityEvaluation(this.activityId(), evaluationRequest)
      .subscribe({
        next: () => {
          this.notification.success('Evaluación guardada correctamente');
          //this.goBack();
        },
        error: (error) => {
          console.error('Error guardando evaluación:', error);
          this.notification.error('Error al guardar la evaluación');
        },
      });
  }

  /**
   * Aprueba todas las preguntas y guarda
   */
  approveAll(): void {
    const sections = this.formSections();
    const updated = new Map(this.fieldEvaluations());

    sections.forEach((section) => {
      section.fields.forEach((field, idx) => {
        const key = `${section.id}_${idx}`;
        const current = updated.get(key);
        if (current) {
          updated.set(key, { ...current, status: 'approved', manualOverride: true });
        }
      });
    });

    this.fieldEvaluations.set(updated);

    // Guardar automáticamente después de aprobar todo
    setTimeout(() => this.saveEvaluation(), 100);
  }

  /**
   * Rechaza todas las preguntas y guarda
   */
  rejectAll(): void {
    const sections = this.formSections();
    const updated = new Map(this.fieldEvaluations());

    sections.forEach((section) => {
      section.fields.forEach((field, idx) => {
        const key = `${section.id}_${idx}`;
        const current = updated.get(key);
        if (current) {
          updated.set(key, { ...current, status: 'rejected', manualOverride: true });
        }
      });
    });

    this.fieldEvaluations.set(updated);

    // Guardar automáticamente después de rechazar todo
    setTimeout(() => this.saveEvaluation(), 100);
  }

  /**
   * Builds updated formData with field_validation_status for each field
   */
  private buildUpdatedFormData(): Record<string, unknown> {
    const activity = this.activity();
    if (!activity || !activity.formData) return {};

    const data = activity.formData as { sections?: FormSection[] };
    if (!data.sections) return {};

    const updatedData = {
      sections: data.sections.map((section) => ({
        ...section,
        fields: section.fields.map((field, idx) => {
          const evaluation = this.getFieldEvaluation(section.id, idx);
          return {
            ...field,
            field_validation_status:
              evaluation?.status === 'pending' ? undefined : evaluation?.status,
          };
        }),
      })),
    };

    return updatedData;
  }

  /**
   * Calculates overall validation status based on all field evaluations
   * - All approved -> 'approved'
   * - All rejected -> 'rejected'
   * - Mixed or has pending -> 'pending'
   */
  private calculateOverallValidationStatus(): 'pending' | 'approved' | 'rejected' {
    const evaluations = Array.from(this.fieldEvaluations().values());

    if (evaluations.length === 0) return 'pending';

    const allApproved = evaluations.every((e) => e.status === 'approved');
    const allRejected = evaluations.every((e) => e.status === 'rejected');

    if (allApproved) return 'approved';
    if (allRejected) return 'rejected';

    // If has pending or mixed approved/rejected, return pending
    return 'pending';
  } /**
   * Regresa a la evaluación de inventario (marca el tab automáticamente)
   */
  goBack(): void {
    const projectId = this.projectId();
    if (projectId) {
      // Navigate with fragment to activate the inventory evaluation tab
      this.router.navigate(['/projects', projectId], { fragment: 'inventory' });
    } else {
      // Fallback a la lista de proyectos si no hay ID
      this.router.navigate(['/projects']);
    }
  }

  /**
   * Obtiene el label del estado de validación
   */
  getValidationStatusLabel(status: ValidationStatus): string {
    const labels: Record<ValidationStatus, string> = {
      pending: 'Evaluación pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
    };
    return labels[status] || status;
  }

  /**
   * Obtiene el color del badge de estado
   */
  getValidationStatusColor(status: ValidationStatus): string {
    const colors: Record<ValidationStatus, string> = {
      pending: 'text-price',
      approved: 'text-secondary',
      rejected: 'text-red-600',
    };
    return colors[status] || 'text-neutral-subheading';
  }

  /**
   * Obtiene el ícono del estado de validación
   */
  getValidationStatusIcon(status: ValidationStatus): string {
    const icons: Record<ValidationStatus, string> = {
      pending: 'schedule',
      approved: 'check_circle',
      rejected: 'cancel',
    };
    return icons[status] || 'help_outline';
  }
}
