import { CompanyStatus, LicenseType } from './company.model';

/**
 * DTO para actualizar una empresa existente.
 * Todos los campos son opcionales.
 */
export interface UpdateCompanyDto {
  code?: string; // Código único
  businessName?: string; // Razón social
  tradeName?: string; // Nombre comercial
  ruc?: string; // RUC (11 dígitos)
  taxAddress?: string; // Dirección fiscal
  contactEmail?: string; // Email principal
  contactPhone?: string; // Teléfono
  legalRepresentative?: string; // Representante legal
  subdomain?: string; // Subdominio personalizado
  licenseType?: LicenseType; // Tipo de licencia
  status?: CompanyStatus; // Cambiar estado manualmente (ACTIVE, INACTIVE, SUSPENDED)
}
