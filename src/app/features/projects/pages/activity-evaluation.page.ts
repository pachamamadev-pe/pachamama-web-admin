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
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@core/services/notification.service';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { ActivitiesService } from '../services/activities.service';
import { ActivityResponse, ValidationStatus } from '../models/activity.model';
import { ValidationOperator, OPERATOR_LABELS } from '../../products/models/domain-attribute.model';
import {
  PhotoDetailDialogComponent,
  PhotoDetailDialogData,
} from '../components/photo-detail-dialog/photo-detail-dialog.component';

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
 * Photo file metadata
 */
interface PhotoFileMetadata {
  width: number;
  height: number;
  photoId: string;
  fileName: string;
  createdAt: string;
  fileSizeBytes: number;
}

/**
 * Photo file with metadata
 */
interface PhotoFile {
  file: string; // URL path
  metadata: PhotoFileMetadata;
}

/**
 * Video file metadata
 */
interface VideoFileMetadata {
  width: number;
  height: number;
  photoId: string; // Backend uses photoId for all media files
  fileName: string;
  createdAt: string;
  fileSizeBytes: number;
}

/**
 * Video file with metadata
 */
interface VideoFile {
  file: string; // URL path
  metadata: VideoFileMetadata;
}

/**
 * Form field from activity data
 */
interface FormField {
  question: string;
  required: boolean;
  response: {
    value?: unknown;
    files?: PhotoFile[] | VideoFile[]; // Array of photos or videos with metadata
  };
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
  private azureStorage = inject(AzureStorageService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  // State
  loading = signal(true);
  activity = signal<ActivityResponse | null>(null);
  projectId = signal<string>('');
  activityId = signal<string>('');
  navigationMode = signal<string>('evaluate'); // 'evaluate' o 'readOnly'
  fieldEvaluations = signal<Map<string, FieldEvaluationState>>(new Map());
  validationNotes = signal<string>('');

  // Cache de URLs de imágenes con SAS token (path -> url)
  imageUrlCache = signal<Map<string, string>>(new Map());

  // Cache de URLs de videos con SAS token (path -> url)
  videoUrlCache = signal<Map<string, string>>(new Map());

  // Computed
  isApproved = computed(() => {
    const act = this.activity();
    return act && act.overallValidationStatus === 'approved';
  });

  /**
   * Determina si la vista está en modo solo lectura
   * - Si navigationMode es 'readOnly' → true
   * - Si la actividad está aprobada → true
   * - De lo contrario → false
   */
  isReadOnly = computed(() => {
    return this.navigationMode() === 'readOnly' || this.isApproved();
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
    const queryParams = this.route.snapshot.queryParamMap;
    const projId = params.get('projectId');
    const actId = params.get('activityId');
    const mode = queryParams.get('mode') || 'evaluate'; // Por defecto 'evaluate'

    if (projId && actId) {
      this.projectId.set(projId);
      this.activityId.set(actId);
      this.navigationMode.set(mode);
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
  }

  /**
   * Obtiene la URL de la foto con SAS token (con caché)
   */
  getPhotoUrl(filePath: string | null): string | null {
    if (!filePath) {
      return null;
    }

    // Verificar si ya está en caché
    const cache = this.imageUrlCache();
    if (cache.has(filePath)) {
      return cache.get(filePath)!;
    }

    // Solicitar URL con SAS token al servicio
    this.azureStorage.getFileUrl(filePath, 5).subscribe({
      next: (url) => {
        // Actualizar caché de forma inmutable
        this.imageUrlCache.update((currentCache) => {
          const newCache = new Map(currentCache);
          newCache.set(filePath, url);
          return newCache;
        });
      },
      error: (error) => {
        console.error('Error al obtener URL con SAS token:', error);
      },
    });

    // Retornar null mientras se carga
    return null;
  }

  /**
   * Abre el modal de detalle de foto
   */
  openPhotoDetail(photoFile: PhotoFile, photoNumber: number): void {
    // Primero obtener la URL con SAS token
    const cache = this.imageUrlCache();
    const filePath = photoFile.file;

    if (cache.has(filePath)) {
      // Ya está en caché, abrir inmediatamente
      this.openPhotoDialog(cache.get(filePath)!, photoFile.metadata, photoNumber);
    } else {
      // Solicitar SAS token primero
      this.azureStorage.getFileUrl(filePath, 5).subscribe({
        next: (url) => {
          // Actualizar caché
          this.imageUrlCache.update((currentCache) => {
            const newCache = new Map(currentCache);
            newCache.set(filePath, url);
            return newCache;
          });
          // Abrir dialog
          this.openPhotoDialog(url, photoFile.metadata, photoNumber);
        },
        error: () => {
          this.notification.error('Error al cargar la foto');
        },
      });
    }
  }

  /**
   * Abre el diálogo con los datos de la foto
   */
  private openPhotoDialog(
    photoUrl: string,
    metadata: PhotoFileMetadata,
    photoNumber: number,
  ): void {
    const activity = this.activity();
    const location = activity?.location as { latitude: number; longitude: number } | undefined;

    const dialogData: PhotoDetailDialogData = {
      photoUrl,
      metadata,
      location: location || null,
      photoNumber,
    };

    this.dialog.open(PhotoDetailDialogComponent, {
      width: '95vw',
      maxWidth: '1200px',
      height: '90vh',
      maxHeight: '900px',
      data: dialogData,
      panelClass: 'photo-detail-dialog-container',
    });
  }

  /**
   * Obtiene la URL del video con SAS token (con caché)
   */
  getVideoUrl(filePath: string | null): string | null {
    if (!filePath) {
      return null;
    }

    // Verificar si ya está en caché
    const cache = this.videoUrlCache();
    if (cache.has(filePath)) {
      return cache.get(filePath)!;
    }

    // Solicitar URL con SAS token al servicio
    this.azureStorage.getFileUrl(filePath, 5).subscribe({
      next: (url) => {
        // Actualizar caché de forma inmutable
        this.videoUrlCache.update((currentCache) => {
          const newCache = new Map(currentCache);
          newCache.set(filePath, url);
          return newCache;
        });
      },
      error: (error) => {
        console.error('Error al obtener URL de video con SAS token:', error);
      },
    });

    // Retornar null mientras se carga
    return null;
  }

  /**
   * Abre el modal de detalle de video
   */
  openVideoDetail(videoFile: VideoFile, videoNumber: number): void {
    // Primero obtener la URL con SAS token
    const cache = this.videoUrlCache();
    const filePath = videoFile.file;

    if (cache.has(filePath)) {
      // Ya está en caché, abrir inmediatamente
      this.openVideoDialog(cache.get(filePath)!, videoFile.metadata, videoNumber);
    } else {
      // Solicitar SAS token primero
      this.azureStorage.getFileUrl(filePath, 5).subscribe({
        next: (url) => {
          // Actualizar caché
          this.videoUrlCache.update((currentCache) => {
            const newCache = new Map(currentCache);
            newCache.set(filePath, url);
            return newCache;
          });
          // Abrir dialog
          this.openVideoDialog(url, videoFile.metadata, videoNumber);
        },
        error: () => {
          this.notification.error('Error al cargar el video');
        },
      });
    }
  }

  /**
   * Abre el diálogo con los datos del video
   */
  private async openVideoDialog(
    videoUrl: string,
    metadata: VideoFileMetadata,
    videoNumber: number,
  ): Promise<void> {
    const activity = this.activity();
    const location = activity?.location as { latitude: number; longitude: number } | undefined;

    // Lazy load del componente VideoDetailDialogComponent
    const { VideoDetailDialogComponent } = await import(
      '../components/video-detail-dialog/video-detail-dialog.component'
    );

    const dialogData = {
      videoUrl,
      metadata,
      location: location || null,
      videoNumber,
    };

    this.dialog.open(VideoDetailDialogComponent, {
      width: '95vw',
      maxWidth: '1400px',
      height: '90vh',
      maxHeight: '900px',
      data: dialogData,
      panelClass: 'video-detail-dialog-container',
    });
  }

  /**
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
