import { LicenseType } from './company.model';

/**
 * DTO para crear una nueva empresa.
 * Paso 1 del flujo de creación (datos básicos).
 * Los documentos se suben en el Paso 2.
 */
export interface CreateCompanyDto {
  // Campos obligatorios
  code: string; // Código único (ej: "ACME-001")
  businessName: string; // Razón social
  ruc: string; // RUC (11 dígitos)
  contactEmail: string; // Email principal

  // Campos opcionales
  tradeName?: string; // Nombre comercial
  taxAddress?: string; // Dirección fiscal
  contactPhone?: string; // Teléfono
  legalRepresentative?: string; // Representante legal
  subdomain?: string; // Subdominio personalizado
  licenseType?: LicenseType; // Tipo de licencia (default: BASIC)
}
