import { ValidationOperator } from './domain-attribute.model';

/**
 * DTO for creating a product protocol
 * Matches backend ProductProtocolRequest
 */
export interface CreateProductProtocolDto {
  productId: string;
  attributeId: string;
  operator: ValidationOperator;
  valueNumeric?: number | null;
  valueText?: string | null;
  valueArray?: unknown[] | null;
  isRequired: boolean;
  failureMessage?: string | null;
  evaluationOrder?: number | null;
}
