/**
 * Modelo de actividad de recolección con validación
 */
export interface ActivityResponse {
  /** ID único de la actividad */
  id: string;
  /** ID de la empresa */
  companyId: string;
  /** Nombre de la empresa */
  companyName: string;
  /** ID del proyecto */
  projectId: string;
  /** Nombre del proyecto */
  projectName: string;
  /** ID de la comunidad */
  projectCommunityId: string;
  /** Nombre de la comunidad */
  communityName: string;
  /** ID del producto */
  productId: string;
  /** Nombre del producto */
  productName: string;
  /** ID del recolector */
  collectorId: string;
  /** Nombre del recolector */
  collectorName: string;
  /** ID de la brigada */
  brigadeId: string;
  /** ID de la unidad forestal */
  forestUnitId: string;
  /** Código del sistema del árbol */
  forestCode: string;
  /** Código manual del árbol */
  forestManualCode?: string;
  /** Código manual del árbol padre */
  forestParentManualCode?: string | null;
  /** Tipo de actividad */
  activityType: ActivityType;
  /** Ubicación GPS {latitude, longitude} */
  location: Record<string, unknown>;
  /** Precisión del GPS en metros */
  gpsAccuracyM?: number;
  /** Calidad de la señal GPS */
  gpsQuality?: GpsQuality;
  /** ID del área */
  areaId?: string;
  /** Está dentro del área */
  isWithinArea?: boolean;
  /** Distancia al área en metros */
  distanceToAreaM?: number;
  /** ID del formulario utilizado */
  formSchemaId: string;
  /** Nombre del formulario */
  formSchemaName: string;
  /** Versión del formulario */
  formSchemaVersion: number;
  /** Datos del formulario capturados */
  formData: Record<string, unknown>;
  /** Fecha/hora de captura en el dispositivo */
  deviceTimestamp: string;
  /** Estado general de validación */
  overallValidationStatus: ValidationStatus;
  /** Resultado de evaluación de protocolos */
  protocolEvaluationResult: Record<string, unknown>;
  /** Validaciones por sección */
  sectionValidations: SectionValidationSummary[];
  /** Observaciones del recolector */
  notes?: string;
  /** ID del dispositivo */
  deviceId?: string;
  /** Hash del registro */
  recordHash?: string;
  /** Fecha de sincronización */
  syncedAt?: string;
  /** Fecha de creación */
  createdAt: string;
  /** Fecha de última actualización */
  updatedAt: string;

  /** ID del usuario que validó */
  validatedBy?: string | null;
  /** Nombre del usuario que validó */
  validatedByName?: string | null;
  /** Fecha/hora de validación */
  validatedAt?: string | null;

  validationNotes?: string | null;

  collectionRequestCode?: string | null;

  appVersion?: string | null;
}

/**
 * Resumen de validación de una sección
 */
export interface SectionValidationSummary {
  validationId: string;
  sectionId: string;
  sectionTitle: string;
  sectionType: string;
  validationStatus: ValidationStatus;
  autoApproved: boolean;
  autoApprovalReason?: string;
}

/**
 * Estados de validación posibles (lowercase para coincidir con backend)
 */
export type ValidationStatus = 'pending' | 'approved' | 'rejected';

/**
 * Request para actualizar la evaluación de una actividad
 */
export interface ActivityEvaluationUpdateRequest {
  /** Datos del formulario actualizados (estructura JSON completa) */
  formData: Record<string, unknown>;
  /** Estado general de validación de la actividad */
  overallValidationStatus: ValidationStatus;
  /** Notas de validación (comentarios del revisor sobre la evaluación) */
  validationNotes: string | null;
}

/**
 * Tipos de actividad
 */
export type ActivityType = 'inventory' | 'harvest';

/**
 * Calidad de señal GPS
 */
export type GpsQuality = 'good' | 'poor' | 'acceptable';
