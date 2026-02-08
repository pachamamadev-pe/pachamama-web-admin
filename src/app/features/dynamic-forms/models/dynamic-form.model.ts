/**
 * Tipos de proyecto stage disponibles
 */
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
 * Estado del formulario dinámico
 */
export type FormStatus = 'draft' | 'published' | 'archived';

/**
 * Nivel/ámbito del formulario
 */
export type FormScope = 'company' | 'project';

/**
 * Tipo de formulario
 */
export type FormType = 'HARVEST';

/**
 * Respuesta de formulario dinámico del backend
 */
export interface FormSchemaResponse {
  id: string;
  name: string;
  description: string | null;
  productId: string;
  productName: string;
  companyId: string | null;
  projectId: string | null;
  projectName: string | null;
  version: number;
  formType: FormType;
  status: FormStatus;
  applicableStages: string[];
  schema: string; // JSON string
  previewConfig: string | null;
  validFrom: string | null;
  validUntil: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  customTitle: string | null;
  customLogoUrl: string | null;
  customDescription: string | null;
  copiedFromSchemaId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

/**
 * Request para crear/actualizar formulario
 */
export interface FormSchemaUpsertRequest {
  name: string;
  description?: string;
  projectId?: string | null;
  formType?: FormType;
  applicableStages: string[];
  schema: string;
  previewConfig?: string;
  validFrom?: string;
  validUntil?: string;
  customTitle?: string;
  customLogoUrl?: string;
  customDescription?: string;
  copiedFromSchemaId?: string;
}

/**
 * Request para publicar formulario
 */
export interface FormPublishRequest {
  validFrom: string;
  validUntil: string;
}

/**
 * Filtros para listar formularios
 */
export interface FormFilters {
  productId?: string;
  stage?: ProjectStage;
  status?: FormStatus;
  scope?: FormScope;
  projectId?: string;
  search?: string;
}

/**
 * Item de formulario para mostrar en lista (enriquecido con computed props)
 */
export interface FormListItem extends FormSchemaResponse {
  scope: FormScope;
  stageLabels: string[];
  isVigent: boolean;
}

/**
 * Mapeo de etapas a labels legibles
 */
export const STAGE_LABELS: Record<ProjectStage, string> = {
  planning: 'Relacionamiento Comunitario',
  inventory: 'Inventario',
  collection: 'Recolección',
  pmf_development: 'Elaboración de PMF',
  serfor_evaluation: 'Evaluación SERFOR',
  ctp_entry: 'Acopio CTP',
  primary_transformation: 'Transformación Primaria',
  map_adjustment: 'Ajuste de Mapas',
};

/**
 * Mapeo de etapas a códigos backend
 */
export const STAGE_CODES: Record<ProjectStage, string> = {
  planning: 'PLANNING',
  inventory: 'INVENTORY',
  collection: 'COLLECTION',
  pmf_development: 'PMF_DEVELOPMENT',
  serfor_evaluation: 'SERFOR_EVALUATION',
  ctp_entry: 'CTP_ENTRY',
  primary_transformation: 'PRIMARY_TRANSFORMATION',
  map_adjustment: 'MAP_ADJUSTMENT',
};

/**
 * Lista de todas las etapas disponibles
 */
export const ALL_STAGES: ProjectStage[] = [
  'planning',
  'inventory',
  'collection',
  'pmf_development',
  'serfor_evaluation',
  'ctp_entry',
  'primary_transformation',
  'map_adjustment',
];

/**
 * A qué tipo de entidad aplica el campo
 */
export type AppliesTo = 'tree' | 'tree_stump' | 'both';

/**
 * Labels para AppliesTo
 */
export const APPLIES_TO_LABELS: Record<AppliesTo, string> = {
  tree: 'Árbol',
  tree_stump: 'Troza',
  both: 'Ambos (Árbol y Troza)',
};

/**
 * Campo de formulario con validación
 */
export interface FormField {
  id?: string;
  question: string;
  fieldTypeId: string;
  isRequired: boolean;
  protocolId?: string | null;
  validationConfig?: Record<string, unknown>;
  appliesTo?: AppliesTo;
}

/**
 * Sección del formulario (protocol_linked o free_form)
 */
export interface FormSection {
  title: string;
  type: 'protocol_linked' | 'free_form';
  fields: FormField[];
}
