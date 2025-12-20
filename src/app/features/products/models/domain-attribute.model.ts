/**
 * Data types for domain attributes
 */
export enum DomainAttributeDataType {
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  DECIMAL = 'DECIMAL',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
}

/**
 * Validation operators for product protocols
 */
export enum ValidationOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_OR_EQUAL = 'GREATER_OR_EQUAL',
  LESS_THAN = 'LESS_THAN',
  LESS_OR_EQUAL = 'LESS_OR_EQUAL',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  BETWEEN = 'BETWEEN',
  CONTAINS = 'CONTAINS',
}

/**
 * Domain attribute model
 * Represents reusable validation attributes like height, humidity, etc.
 */
export interface DomainAttribute {
  id: string;
  name: string;
  description: string | null;
  dataType: string; // Use string instead of enum to handle backend variations
  unit: string | null;
  category: string | null;
  allowedValues: string[] | null; // For ENUM types
  validationRules: { min?: number; max?: number; decimals?: number } | null; // For numeric types
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Human-readable labels for operators
 */
export const OPERATOR_LABELS: Record<ValidationOperator, string> = {
  [ValidationOperator.EQUALS]: 'Igual a',
  [ValidationOperator.NOT_EQUALS]: 'Diferente de',
  [ValidationOperator.GREATER_THAN]: 'Mayor que',
  [ValidationOperator.GREATER_OR_EQUAL]: 'Mayor o igual que',
  [ValidationOperator.LESS_THAN]: 'Menor que',
  [ValidationOperator.LESS_OR_EQUAL]: 'Menor o igual que',
  [ValidationOperator.IN]: 'Está en',
  [ValidationOperator.NOT_IN]: 'No está en',
  [ValidationOperator.BETWEEN]: 'Entre',
  [ValidationOperator.CONTAINS]: 'Contiene',
};

/**
 * Human-readable labels for data types
 */
export const DATA_TYPE_LABELS: Record<DomainAttributeDataType, string> = {
  [DomainAttributeDataType.STRING]: 'Texto',
  [DomainAttributeDataType.INTEGER]: 'Número entero',
  [DomainAttributeDataType.DECIMAL]: 'Número decimal',
  [DomainAttributeDataType.BOOLEAN]: 'Verdadero/Falso',
  [DomainAttributeDataType.DATE]: 'Fecha',
  [DomainAttributeDataType.DATETIME]: 'Fecha y hora',
};
