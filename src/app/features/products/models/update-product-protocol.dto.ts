import { ValidationOperator } from './domain-attribute.model';

/**
 * DTO for updating a product protocol
 * Matches backend ProductProtocolRequest (same structure as create)
 */
export interface UpdateProductProtocolDto {
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
