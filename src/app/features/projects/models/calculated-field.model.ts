/**
 * Tipo de ámbito del cálculo
 */
export type CalculationScope = 'activity' | 'project';

/**
 * Tipo de agregación a nivel proyecto
 */
export type AggregationType = 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT';

/**
 * Estado de la fórmula
 */
export type FieldStatus = 'active' | 'archived';

/**
 * Tipo de dato de atributo
 */
export type AttributeDataType = 'NUMBER' | 'INTEGER' | 'TEXT' | 'DATE' | 'BOOLEAN' | 'ENUM';

/**
 * Atributo de dominio disponible para agregaciones
 */
export interface DomainAttribute {
  id: string;
  code: string; // Ej: "TREE_HEIGHT", "TRUNK_CIRCUMFERENCE"
  name: string; // Nombre descriptivo
  description: string;
  dataType: AttributeDataType;
  unit?: string; // Unidad de medida
  allowedValues?: string[]; // Solo para ENUM
  validationRules?: Record<string, unknown>;
}

/**
 * Campo calculado (fórmula o agregación)
 */
export interface CalculatedField {
  id: string;
  projectId: string;
  name: string;
  calculationScope: CalculationScope;
  expression?: string; // Solo para scope=activity
  variables?: string[]; // Solo para scope=activity (códigos de atributos)
  aggregationType?: AggregationType; // Solo para scope=project
  sourceFieldKey?: string; // Solo para scope=project (código de atributo)
  description?: string;
  status: FieldStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request para crear campo calculado
 */
export interface CreateCalculatedFieldRequest {
  projectId: string;
  name: string;
  calculationScope: CalculationScope;
  expression?: string; // Solo para scope=activity
  variables?: string[]; // Solo para scope=activity (códigos de atributos)
  aggregationType?: AggregationType; // Solo para scope=project
  sourceFieldKey?: string; // Solo para scope=project
  description?: string;
}

/**
 * Request para actualizar campo calculado
 */
export interface UpdateCalculatedFieldRequest {
  name?: string;
  expression?: string;
  variables?: string[];
  aggregationType?: AggregationType;
  sourceFieldKey?: string;
  description?: string;
}

/**
 * Valor calculado de una actividad
 */
export interface CalculatedValue {
  fieldName: string;
  calculatedValue: number;
  expressionUsed: string;
  calculatedAt: string;
}

/**
 * Agregación a nivel proyecto
 */
export interface ProjectAggregation {
  fieldName: string;
  aggregationType: AggregationType;
  sourceFieldKey: string;
  value: number;
  totalActivities: number;
  lastCalculated: string;
}

/**
 * Respuesta de recálculo
 */
export interface RecalculateResponse {
  projectId: string;
  activitiesRecalculated: number;
  message: string;
}

/**
 * Labels para tipos de agregación
 */
export const AGGREGATION_TYPE_LABELS: Record<AggregationType, string> = {
  SUM: 'Suma',
  AVG: 'Promedio',
  MIN: 'Mínimo',
  MAX: 'Máximo',
  COUNT: 'Contar',
};

/**
 * Iconos para tipos de agregación
 */
export const AGGREGATION_TYPE_ICONS: Record<AggregationType, string> = {
  SUM: 'add',
  AVG: 'analytics',
  MIN: 'arrow_downward',
  MAX: 'arrow_upward',
  COUNT: 'tag',
};

/**
 * Labels para ámbitos de cálculo
 */
export const CALCULATION_SCOPE_LABELS: Record<CalculationScope, string> = {
  activity: 'Fórmula de Actividad',
  project: 'Agregación de Proyecto',
};
