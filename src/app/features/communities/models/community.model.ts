/**
 * Comunidad Nativa o Campesina
 */
export interface Community {
  id: string;
  code: string;
  name: string;
  ruc: string;
  legalAddress: string;
  region: string;
  province: string;
  district: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  onboardingCode: string | null;
  qrCode: string | null;
  qrExpiresAt: string | null;
  metadata: string | null;
  status: string;
  companyId: string | null;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Request para crear una comunidad (básico)
 */
export interface CreateCommunityRequest {
  code?: string;
  name: string;
  ruc: string;
  legalAddress: string;
  region: string;
  province: string;
  district: string;
}

/**
 * Request para actualizar una comunidad
 */
export interface UpdateCommunityRequest {
  code?: string;
  name: string;
  ruc: string;
  legalAddress: string;
  region: string;
  province: string;
  district: string;
}

/**
 * Validaciones para formulario de comunidad
 */
export const COMMUNITY_VALIDATIONS = {
  ruc: {
    minLength: 11,
    maxLength: 11,
    pattern: /^\d{11}$/,
  },
  legalAddress: {
    minLength: 10,
    maxLength: 200,
  },
  name: {
    minLength: 3,
    maxLength: 200,
  },
  region: {
    required: true,
  },
  province: {
    required: true,
  },
  district: {
    required: true,
  },
};
