import { ValidationOperator } from './domain-attribute.model';

/**
 * Domain attribute nested in protocol response
 */
export interface ProtocolAttribute {
  id: string;
  code: string;
  name: string;
  description: string | null;
  dataType: string;
  unit: string | null;
  category: string | null;
  allowedValues: string[] | null;
  validationRules: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

/**
 * Product protocol model (matches backend response)
 */
export interface ProductProtocol {
  id: string;
  productId: string;
  productName: string;
  attribute: ProtocolAttribute; // Nested attribute object
  operator: ValidationOperator;
  valueNumeric: number | null;
  valueText: string | null;
  valueArray: unknown[] | null;
  isRequired: boolean;
  failureMessage: string | null;
  evaluationOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}
