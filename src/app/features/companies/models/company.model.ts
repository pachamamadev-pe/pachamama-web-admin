/**
 * Empresa en el sistema Pachamama.
 */
export interface Company {
  id: string;
  ruc: string; // 11 dígitos
  businessName: string; // Razón social
  tradeName: string; // Nombre comercial
  address: string;
  phone: string;
  email: string;
  website: string | null;
  adminUserId: string | null; // FK a users
  adminUserName?: string; // Nombre del admin (para UI)
  logoUrl: string | null;
  status: 'active' | 'inactive';
  createdAt: string; // ISO 8601
  updatedAt: string;
}

/**
 * DTO para crear empresa.
 */
export interface CreateCompanyDto {
  ruc: string;
  businessName: string;
  tradeName: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl?: string;
}

/**
 * DTO para actualizar empresa.
 */
export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {
  adminUserId?: string;
  status?: 'active' | 'inactive';
}

/**
 * DTO para asignar administrador.
 */
export interface AssignAdminDto {
  companyId: string;
  userEmail: string; // Email del usuario a asignar
  userId?: string; // Si ya existe en el sistema
}
