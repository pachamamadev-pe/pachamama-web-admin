/**
 * Rol del sistema
 */
export interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  systemRole: boolean;
}

/**
 * Request para asignar o cambiar el rol de un usuario
 */
export interface AssignRoleRequest {
  roleCode: string;
}

/**
 * Obtiene el color del badge según el código del rol
 */
export function getRoleBadgeColor(roleCode: string): string {
  const colors: Record<string, string> = {
    ADMIN_EMPRESA: '#218358', // Verde principal
    RECOLECTOR_ADMINISTRADOR: '#3B82F6', // Azul
    GESTOR_RELACIONAMIENTO_COMUNITARIO: '#8B5CF6', // Morado
    GESTOR_TRANSFORMACION_PRIMARIA: '#EF4444', // Rojo
    GESTOR_ALMACENAMIENTO_TEMPORAL: '#F59E0B', // Naranja
    GESTOR_TRANSFORMACION_SECUNDARIA: '#10B981', // Verde secundario
  };
  return colors[roleCode] || '#737373'; // Gris por defecto
}

/**
 * Obtiene el nombre legible del rol (si no viene del API)
 */
export function getRoleDisplayName(roleCode: string): string {
  const names: Record<string, string> = {
    ADMIN_EMPRESA: 'Administrador de Empresa',
    SUPERVISOR: 'Supervisor',
    OPERADOR: 'Operador',
    AUDITOR: 'Auditor',
  };
  return names[roleCode] || roleCode;
}
