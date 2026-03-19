import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';

export interface RoleInfo {
  name: string;
  description: string;
}

const ROLE_METADATA: Record<string, RoleInfo> = {
  GESTOR_TRANSFORMACION_PRIMARIA: {
    name: 'Gestor de Transformación Primaria',
    description: 'Gestor encargado de la transformación primaria de productos',
  },
  ADMIN_PACHAMAMA: {
    name: 'Administrador Pachamama',
    description: 'Administrador global de la plataforma Pachamama con acceso total',
  },
  GESTOR_ALMACENAMIENTO_TEMPORAL: {
    name: 'Gestor de Almacenamiento Temporal',
    description: 'Gestor encargado del almacenamiento temporal de productos',
  },
  GESTOR_TRANSFORMACION_SECUNDARIA: {
    name: 'Gestor de Transformación Secundaria',
    description: 'Gestor encargado de la transformación secundaria de productos',
  },
  RECOLECTOR_ADMINISTRADOR: {
    name: 'Recolector Administrador',
    description: 'Administrador de recolectores que gestiona solicitudes y brigadas',
  },
  GESTOR_RELACIONAMIENTO_COMUNITARIO: {
    name: 'Gestor de Relacionamiento Comunitario',
    description: 'Gestor encargado de la gestión de comunidades, productos y formularios dinámicos',
  },
  ADMIN_EMPRESA: {
    name: 'Administrador de Empresa',
    description: 'Administrador con acceso completo a su empresa',
  },
};

interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  order: number;
  visible: boolean;
  requiresPermission: string | null;
  metadata: Record<string, unknown> | null;
  children: MenuItem[];
  badge?: string; // Propiedad opcional para evitar errores
}

interface SidebarResponse {
  companyName: string;
  tenantId: string;
  menuItems: MenuItem[];
  emailVerified: boolean;
  isPasswordChanged: boolean;
  userId: string;
  roleCode: string;
  permissions: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private http = inject(HttpClient);
  private readonly uploadApiUrl = `${environment.apiUrl}/api/v1/users/authenticated`;
  private readonly localStorageKey = 'sidebarData';

  // Signals
  menuItems = signal<MenuItem[]>([]);
  companyName = signal<string>('');
  emailVerified = signal<boolean>(false);
  isPasswordChanged = signal<boolean>(false);
  userId = signal<string>('');
  tenantId = signal<string>('');
  avatarUrl = signal<string | null>(null);
  roleCode = signal<string>('');
  permissions = signal<string[]>([]);

  roleInfo = computed<RoleInfo>(() => {
    const code = this.roleCode();
    return (
      ROLE_METADATA[code] ?? {
        name: code || 'Pachamama Platform',
        description: '',
      }
    );
  });

  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Obtener el menu de la barra lateral desde el backend
   * @param token Firebase Auth token
   * @param callback Callback de éxito
   * @param errorCallback Callback de error
   */
  fetchSidebarData(
    token: string,
    callback?: () => void,
    errorCallback?: (error: unknown) => void,
  ): void {
    const headers = { Authorization: `Bearer ${token}` };
    this.http
      .get<SidebarResponse>(this.uploadApiUrl, { headers })
      .pipe(
        map((response: SidebarResponse) => ({
          companyName: this.truncateCompanyName(response.companyName),
          tenantId: response.tenantId,
          menuItems: response.menuItems.sort((a: MenuItem, b: MenuItem) => a.order - b.order),
          emailVerified: response.emailVerified,
          isPasswordChanged: response.isPasswordChanged,
          userId: response.userId,
          roleCode: response.roleCode ?? '',
          permissions: response.permissions ?? [],
        })),
      )
      .subscribe({
        next: ({
          companyName,
          tenantId,
          menuItems,
          emailVerified,
          isPasswordChanged,
          userId,
          roleCode,
          permissions,
        }) => {
          console.log('Fetched sidebar data:', {
            companyName,
            tenantId,
            menuItems,
            emailVerified,
            isPasswordChanged,
            userId,
            roleCode,
            permissions,
          });
          this.companyName.set(companyName);
          this.tenantId.set(tenantId);
          this.menuItems.set(menuItems);
          this.emailVerified.set(emailVerified);
          this.isPasswordChanged.set(isPasswordChanged);
          this.userId.set(userId);
          this.roleCode.set(roleCode);
          this.permissions.set(permissions);
          this.saveToLocalStorage(
            companyName,
            tenantId,
            menuItems,
            emailVerified,
            isPasswordChanged,
            userId,
            roleCode,
            permissions,
          );
          if (callback) callback();
        },
        error: (err: unknown) => {
          console.error('Error fetching sidebar data:', err);
          // Limpiar datos en caso de error
          this.clearData();
          // Llamar al callback de error si existe
          if (errorCallback) {
            errorCallback(err);
          }
        },
      });
  }

  /**
   * Limpia todos los datos del sidebar y localStorage
   * Útil cuando la sesión expira o el usuario hace logout
   */
  clearData(): void {
    this.companyName.set('');
    this.tenantId.set('');
    this.menuItems.set([]);
    this.emailVerified.set(false);
    this.isPasswordChanged.set(false);
    this.userId.set('');
    this.avatarUrl.set(null);
    this.roleCode.set('');
    this.permissions.set([]);
    localStorage.removeItem(this.localStorageKey);
  }

  /**
   * Guarda los datos en localStorage
   * @param companyName Nombre de la empresa
   * @param tenantId ID del tenant
   * @param menuItems Elementos del menú
   * @param emailVerified Estado de verificación del email
   * @param isPasswordChanged Estado de cambio de contraseña
   * @param userId ID del usuario
   */
  private saveToLocalStorage(
    companyName: string,
    tenantId: string,
    menuItems: MenuItem[],
    emailVerified: boolean,
    isPasswordChanged: boolean,
    userId: string,
    roleCode: string,
    permissions: string[],
  ): void {
    const data = {
      companyName,
      tenantId,
      menuItems,
      emailVerified,
      isPasswordChanged,
      userId,
      roleCode,
      permissions,
    };
    localStorage.setItem(this.localStorageKey, JSON.stringify(data));
  }

  /**
   * Carga los datos desde localStorage
   */
  private loadFromLocalStorage(): void {
    const data = localStorage.getItem(this.localStorageKey);
    if (data) {
      try {
        const parsedData = JSON.parse(data) as {
          companyName: string;
          tenantId: string;
          menuItems: MenuItem[];
          emailVerified: boolean;
          isPasswordChanged: boolean;
          userId: string;
          roleCode: string;
          permissions: string[];
        };
        this.companyName.set(parsedData.companyName);
        this.tenantId.set(parsedData.tenantId);
        this.menuItems.set(parsedData.menuItems);
        this.emailVerified.set(parsedData.emailVerified);
        this.isPasswordChanged.set(parsedData.isPasswordChanged);
        this.userId.set(parsedData.userId || '');
        this.roleCode.set(parsedData.roleCode || '');
        this.permissions.set(parsedData.permissions ?? []);
      } catch (error) {
        console.error('Error parsing sidebar data from localStorage:', error);
      }
    }
  }

  private truncateCompanyName(name: string, maxLength = 20): string {
    if (!name) return '';
    return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
  }

  /**
   * Verifica si el usuario tiene un permiso requerido.
   * - null/undefined/'' => true (sin restricción)
   * - '*:*' en permissions => true (superusuario)
   * - 'resource:*' en permissions => true para cualquier acción de ese recurso
   * - permiso exacto en permissions => true
   */
  hasPermission(required: string | null | undefined): boolean {
    if (!required) return true;
    const perms = this.permissions();
    if (perms.includes('*:*')) return true;
    const parts = required.split(':');
    if (parts.length === 2) {
      const [resource] = parts;
      if (perms.includes(`${resource}:*`)) return true;
    }
    return perms.includes(required);
  }

  /**
   * Actualiza la URL del avatar del usuario
   * @param avatarUrl Nueva URL del avatar (puede ser null)
   */
  updateAvatarUrl(avatarUrl: string | null): void {
    this.avatarUrl.set(avatarUrl);
  }
}
