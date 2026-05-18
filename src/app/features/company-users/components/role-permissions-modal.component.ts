import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RolePermissionsModalData {
  /** Role code to highlight (pre-selected column). Optional. */
  highlightRole?: string;
}

interface RoleDefinition {
  code: string;
  name: string;
  shortName: string;
  color: string;
  bgLight: string;
}

interface RolePermission {
  code: string;
  label: string;
  roles: Record<string, boolean>;
}

interface PermissionGroup {
  id: string;
  name: string;
  icon: string;
  permissions: RolePermission[];
}

// ─── Static data ──────────────────────────────────────────────────────────────

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    code: 'ADMIN_EMPRESA',
    name: 'Administrador de Empresa',
    shortName: 'Admin Empresa',
    color: '#218358',
    bgLight: '#F4FBF6',
  },
  {
    code: 'GESTOR_RELACIONAMIENTO_COMUNITARIO',
    name: 'Gestor de Relacionamiento Comunitario',
    shortName: 'Relacionamiento',
    color: '#3B82F6',
    bgLight: '#EFF6FF',
  },
  {
    code: 'GESTOR_TRANSFORMACION_PRIMARIA',
    name: 'Gestor de Transformación Primaria',
    shortName: 'Trans. Primaria',
    color: '#8B5CF6',
    bgLight: '#F5F3FF',
  },
  {
    code: 'GESTOR_ALMACENAMIENTO_TEMPORAL',
    name: 'Gestor de Almacenamiento Temporal',
    shortName: 'Almacenamiento',
    color: '#F59E0B',
    bgLight: '#FFFBEB',
  },
  {
    code: 'GESTOR_TRANSFORMACION_SECUNDARIA',
    name: 'Gestor de Transformación Secundaria',
    shortName: 'Trans. Secundaria',
    color: '#EF4444',
    bgLight: '#FEF2F2',
  },
  {
    code: 'RECOLECTOR_ADMINISTRADOR',
    name: 'Recolector Administrador',
    shortName: 'Recolector Adm.',
    color: '#10B981',
    bgLight: '#ECFDF5',
  },
];

/** Helper: build a roles record from positional booleans in ROLE_DEFINITIONS order */
function r(
  ae: boolean,
  gr: boolean,
  gtp: boolean,
  ga: boolean,
  gts: boolean,
  ra: boolean,
): Record<string, boolean> {
  return {
    ADMIN_EMPRESA: ae,
    GESTOR_RELACIONAMIENTO_COMUNITARIO: gr,
    GESTOR_TRANSFORMACION_PRIMARIA: gtp,
    GESTOR_ALMACENAMIENTO_TEMPORAL: ga,
    GESTOR_TRANSFORMACION_SECUNDARIA: gts,
    RECOLECTOR_ADMINISTRADOR: ra,
  };
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'users',
    name: 'Usuarios de Empresa',
    icon: 'manage_accounts',
    permissions: [
      {
        code: 'user:read',
        label: 'Ver y listar usuarios',
        roles: r(true, false, false, false, false, false),
      },
      {
        code: 'user:create',
        label: 'Crear usuarios',
        roles: r(true, false, false, false, false, false),
      },
      {
        code: 'user:update',
        label: 'Editar usuario y cambiar rol',
        roles: r(true, false, false, false, false, false),
      },
      {
        code: 'user:delete',
        label: 'Desactivar usuario',
        roles: r(true, false, false, false, false, false),
      },
    ],
  },
  {
    id: 'collectors',
    name: 'Recolectores y Brigadas',
    icon: 'agriculture',
    permissions: [
      {
        code: 'collector:read',
        label: 'Ver recolectores asignados al proyecto',
        roles: r(true, true, false, false, false, true),
      },
      {
        code: 'collector:update',
        label: 'Cambiar estado de recolectores',
        roles: r(true, true, false, false, false, true),
      },
      {
        code: 'brigade:read',
        label: 'Ver brigadas y recolectores asignados',
        roles: r(true, true, false, false, false, true),
      },
      {
        code: 'brigade:create',
        label: 'Crear brigada / ver solicitudes aprobadas',
        roles: r(true, true, false, false, false, true),
      },
      {
        code: 'brigade:update',
        label: 'Editar brigada, estado y añadir recolector',
        roles: r(true, true, false, false, false, true),
      },
    ],
  },
  {
    id: 'communities',
    name: 'Comunidades',
    icon: 'location_city',
    permissions: [
      {
        code: 'community:read',
        label: 'Ver comunidades y detalle',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'community:create',
        label: 'Crear comunidad',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'community:update',
        label: 'Editar datos de comunidad',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'community:delete',
        label: 'Eliminar comunidad',
        roles: r(true, true, false, false, false, false),
      },
    ],
  },
  {
    id: 'products',
    name: 'Productos',
    icon: 'eco',
    permissions: [
      {
        code: 'product:read',
        label: 'Ver productos y detalle',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'product:create',
        label: 'Crear productos',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'product:update',
        label: 'Editar datos del producto y protocolos',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'product:delete',
        label: 'Eliminar producto',
        roles: r(true, true, false, false, false, false),
      },
    ],
  },
  {
    id: 'projects',
    name: 'Proyectos',
    icon: 'folder_special',
    permissions: [
      {
        code: 'project:read',
        label: 'Ver y listar proyectos con detalle',
        roles: r(true, true, true, true, true, true),
      },
      {
        code: 'project:create',
        label: 'Crear proyectos',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'project:update',
        label: 'Editar proyectos',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'project:delete',
        label: 'Eliminar proyecto',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'project:upload_map',
        label: 'Subir mapa del área del proyecto',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'project:next_stage',
        label: 'Activar siguiente etapa del proyecto',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'project:generation_pmf',
        label: 'Generar PMF en base al proyecto',
        roles: r(true, true, false, false, false, false),
      },
    ],
  },
  {
    id: 'documents',
    name: 'Documentos de Proyecto',
    icon: 'description',
    permissions: [
      {
        code: 'document:read',
        label: 'Ver documentos del proyecto',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'document:upload',
        label: 'Subir documentos del proyecto',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'document:download',
        label: 'Descargar documentos del proyecto',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'document:review',
        label: 'Revisar: aprobar / observar / rechazar',
        roles: r(true, false, false, false, false, false),
      },
    ],
  },
  {
    id: 'forms',
    name: 'Formularios Dinámicos',
    icon: 'dynamic_form',
    permissions: [
      {
        code: 'form:read',
        label: 'Listar formularios y ver historial',
        roles: r(true, true, true, false, true, false),
      },
      {
        code: 'form:create',
        label: 'Crear formularios dinámicos',
        roles: r(true, true, true, false, true, false),
      },
      {
        code: 'form:update',
        label: 'Editar y copiar formulario',
        roles: r(true, true, true, false, true, false),
      },
      {
        code: 'form:delete',
        label: 'Archivar formulario',
        roles: r(true, true, true, false, true, false),
      },
      {
        code: 'form:publish',
        label: 'Publicar / despublicar formulario',
        roles: r(true, true, true, false, true, false),
      },
    ],
  },
  {
    id: 'collection',
    name: 'Recolección y Lotes de Acopio',
    icon: 'inventory_2',
    permissions: [
      {
        code: 'activity_inventory:read',
        label: 'Ver actividades de inventario',
        roles: r(true, true, false, false, false, true),
      },
      {
        code: 'activity_inventory:review',
        label: 'Aprobar actividades de inventario',
        roles: r(true, true, false, false, false, true),
      },
      {
        code: 'activity_collection:read',
        label: 'Ver actividades de recolección',
        roles: r(true, true, false, false, false, true),
      },
      {
        code: 'activity_collection:review',
        label: 'Aprobar actividades de recolección',
        roles: r(true, true, false, false, false, true),
      },
      {
        code: 'collection_request:read',
        label: 'Ver solicitudes de recolección',
        roles: r(true, true, false, false, false, true),
      },
      {
        code: 'collection_request:create',
        label: 'Crear solicitud de recolección',
        roles: r(true, true, false, false, false, true),
      },
      {
        code: 'collection_request:update',
        label: 'Editar solicitud de recolección',
        roles: r(true, true, false, false, false, true),
      },
      {
        code: 'collection_request:review',
        label: 'Aprobar / observar / rechazar solicitud',
        roles: r(true, true, false, false, false, true),
      },
      {
        code: 'collection_batch:read',
        label: 'Ver lotes de acopio y documentos generados',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'collection_batch:create',
        label: 'Crear lote de acopio',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'collection_batch:process',
        label: 'Completar y guardar documentos de acopio',
        roles: r(true, true, false, false, false, false),
      },
    ],
  },
  {
    id: 'transformation_primary',
    name: 'Transformación Primaria',
    icon: 'factory',
    permissions: [
      {
        code: 'transformation_primary:read',
        label: 'Ver lotes de transformación primaria',
        roles: r(true, false, true, true, false, false),
      },
      {
        code: 'transformation_primary:create',
        label: 'Crear lote de transformación primaria',
        roles: r(true, false, true, false, false, false),
      },
      {
        code: 'transformation_primary:process',
        label: 'Completar documentos por etapas',
        roles: r(true, false, true, false, false, false),
      },
      {
        code: 'transformation_primary:storage',
        label: 'Completar etapa de almacenamiento',
        roles: r(true, false, true, true, false, false),
      },
      {
        code: 'transformation_primary:generate_qr',
        label: 'Generar QR de trazabilidad',
        roles: r(true, false, true, false, false, false),
      },
      {
        code: 'transformation_primary:view_location',
        label: 'Ver ubicación del lote',
        roles: r(true, false, true, false, false, false),
      },
    ],
  },
  {
    id: 'transformation_secondary',
    name: 'Transformación Secundaria',
    icon: 'precision_manufacturing',
    permissions: [
      {
        code: 'transformation_secondary:read',
        label: 'Ver lotes de transformación secundaria',
        roles: r(true, false, false, false, true, false),
      },
      {
        code: 'transformation_secondary:create',
        label: 'Crear lote de transformación secundaria',
        roles: r(true, false, false, false, true, false),
      },
      {
        code: 'transformation_secondary:process',
        label: 'Completar documentos por etapas',
        roles: r(true, false, false, false, true, false),
      },
      {
        code: 'transformation_secondary:generate_qr',
        label: 'Generar QR de trazabilidad',
        roles: r(true, false, false, false, true, false),
      },
      {
        code: 'transformation_secondary:generate_qr_client',
        label: 'Generar QR para cliente',
        roles: r(true, false, false, false, true, false),
      },
      {
        code: 'transformation_secondary:view_location',
        label: 'Ver ubicación del lote',
        roles: r(true, false, false, false, true, false),
      },
    ],
  },
  {
    id: 'formulas_aggregations',
    name: 'Fórmulas y Agregaciones',
    icon: 'calculate',
    permissions: [
      {
        code: 'activity_formula:read',
        label: 'Ver fórmulas de actividad',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'activity_formula:create',
        label: 'Crear fórmula de actividad',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'activity_formula:update',
        label: 'Editar fórmula de actividad',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'activity_formula:delete',
        label: 'Archivar fórmula de actividad',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'project_aggregation:read',
        label: 'Ver agregaciones de proyecto',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'project_aggregation:create',
        label: 'Crear agregación de proyecto',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'project_aggregation:update',
        label: 'Editar agregación de proyecto',
        roles: r(true, true, false, false, false, false),
      },
      {
        code: 'project_aggregation:delete',
        label: 'Archivar agregación de proyecto',
        roles: r(true, true, false, false, false, false),
      },
    ],
  },
  {
    id: 'document_types',
    name: 'Tipos de Documento de Empresa',
    icon: 'folder',
    permissions: [
      {
        code: 'document_type:read',
        label: 'Ver y listar tipos de documento',
        roles: r(true, false, false, false, false, false),
      },
      {
        code: 'document_type:create',
        label: 'Crear tipo de documento',
        roles: r(true, false, false, false, false, false),
      },
      {
        code: 'document_type:update',
        label: 'Editar tipo de documento',
        roles: r(true, false, false, false, false, false),
      },
      {
        code: 'document_type:delete',
        label: 'Archivar tipo de documento',
        roles: r(true, false, false, false, false, false),
      },
    ],
  },
  {
    id: 'dashboard',
    name: 'Dashboard y Perfil',
    icon: 'dashboard',
    permissions: [
      {
        code: 'dashboard:view',
        label: 'Ver dashboard empresarial',
        roles: r(true, false, false, false, false, false),
      },
      {
        code: 'profile:*',
        label: 'Perfil y ajustes personales',
        roles: r(true, true, true, true, true, true),
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-role-permissions-modal',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="rpm-shell">
      <!-- ── Header ────────────────────────────────────────────── -->
      <div class="rpm-header">
        <div class="rpm-header-left">
          <div class="rpm-header-icon">
            <mat-icon>shield</mat-icon>
          </div>
          <div>
            <h2 class="rpm-title">Permisos por Rol</h2>
            <p class="rpm-subtitle">Selecciona uno o varios roles para comparar sus accesos</p>
          </div>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="rpm-close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- ── Role filter chips ─────────────────────────────────── -->
      <div class="rpm-chips-bar">
        @for (role of roles; track role.code) {
          <button
            type="button"
            class="rpm-chip"
            [class.rpm-chip--active]="isRoleVisible(role.code)"
            [class.rpm-chip--highlighted]="role.code === data.highlightRole"
            [style.--chip-color]="role.color"
            [style.--chip-bg]="role.bgLight"
            (click)="toggleRole(role.code)"
          >
            <span
              class="rpm-chip-dot"
              [style.background-color]="isRoleVisible(role.code) ? role.color : '#D1D5DB'"
            ></span>
            <span>{{ role.name }}</span>
            @if (role.code === data.highlightRole) {
              <span class="rpm-chip-tag">seleccionado</span>
            }
          </button>
        }
        <button
          type="button"
          class="rpm-chip-action"
          (click)="showAll()"
          matTooltip="Mostrar todos"
        >
          <mat-icon>visibility</mat-icon>
        </button>
      </div>

      <!-- ── Legend ────────────────────────────────────────────── -->
      <div class="rpm-legend">
        <span class="rpm-legend-item">
          <mat-icon class="rpm-check-icon">check_circle</mat-icon>
          Tiene acceso
        </span>
        <span class="rpm-legend-item">
          <mat-icon class="rpm-dash-icon">remove</mat-icon>
          Sin acceso
        </span>
        <span class="rpm-legend-total">
          {{ visibleRoleCodes().length }} de {{ roles.length }} roles visibles
        </span>
      </div>

      <!-- ── Permission matrix ────────────────────────────────── -->
      <div class="rpm-matrix-wrapper">
        <table class="rpm-table">
          <!-- Sticky column headers -->
          <thead>
            <tr class="rpm-thead-row">
              <th class="rpm-th rpm-th--label">Permiso</th>
              @for (role of visibleRoles(); track role.code) {
                <th
                  class="rpm-th rpm-th--role"
                  [class.rpm-th--highlighted]="role.code === data.highlightRole"
                  [style.--col-color]="role.color"
                  [style.--col-bg]="role.bgLight"
                >
                  <div class="rpm-th-inner">
                    <span class="rpm-role-dot" [style.background-color]="role.color"></span>
                    <span>{{ role.shortName }}</span>
                  </div>
                </th>
              }
            </tr>
          </thead>

          <tbody>
            @for (group of groups; track group.id) {
              <!-- Group header row -->
              <tr
                class="rpm-group-row"
                (click)="toggleGroup(group.id)"
                [class.rpm-group-row--collapsed]="isGroupCollapsed(group.id)"
              >
                <td [attr.colspan]="visibleRoles().length + 1" class="rpm-group-cell">
                  <div class="rpm-group-inner">
                    <mat-icon class="rpm-group-icon">{{ group.icon }}</mat-icon>
                    <span class="rpm-group-name">{{ group.name }}</span>
                    <span class="rpm-group-count">{{ group.permissions.length }}</span>
                    <mat-icon class="rpm-group-chevron">
                      {{ isGroupCollapsed(group.id) ? 'expand_more' : 'expand_less' }}
                    </mat-icon>
                  </div>
                </td>
              </tr>

              <!-- Permission rows -->
              @if (!isGroupCollapsed(group.id)) {
                @for (perm of group.permissions; track perm.code) {
                  <tr class="rpm-perm-row">
                    <td class="rpm-td rpm-td--label">
                      {{ perm.label }}
                    </td>
                    @for (role of visibleRoles(); track role.code) {
                      <td
                        class="rpm-td rpm-td--check"
                        [class.rpm-td--highlighted]="role.code === data.highlightRole"
                        [style.--col-bg]="role.bgLight"
                      >
                        @if (perm.roles[role.code]) {
                          <mat-icon class="rpm-check">check_circle</mat-icon>
                        } @else {
                          <mat-icon class="rpm-dash">remove</mat-icon>
                        }
                      </td>
                    }
                  </tr>
                }
              }
            }
          </tbody>
        </table>
      </div>

      <!-- ── Footer ────────────────────────────────────────────── -->
      <div class="rpm-footer">
        <p class="rpm-footer-note">
          <mat-icon>info</mat-icon>
          Esta es una representación general de los permisos asociados a cada rol.
        </p>
        <button mat-raised-button class="btn-primary" (click)="dialogRef.close()">Entendido</button>
      </div>
    </div>
  `,
  styles: [
    `
      .rpm-shell {
        display: flex;
        flex-direction: column;
        width: min(960px, 95vw);
        max-height: 90vh;
        overflow: hidden;
      }

      /* ── Header ─────────────────────────────────────────── */
      .rpm-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.25rem 1.5rem 1rem;
        border-bottom: 1px solid #e5e5e5;
        flex-shrink: 0;
      }

      .rpm-header-left {
        display: flex;
        align-items: center;
        gap: 0.875rem;
      }

      .rpm-header-icon {
        width: 2.75rem;
        height: 2.75rem;
        border-radius: 50%;
        background: #f4fbf6;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        mat-icon {
          color: #218358;
        }
      }

      .rpm-title {
        font-size: 1.125rem;
        font-weight: 700;
        color: #0a0a0a;
        margin: 0;
      }

      .rpm-subtitle {
        font-size: 0.75rem;
        color: #737373;
        margin: 0.125rem 0 0;
      }

      .rpm-close {
        flex-shrink: 0;
      }

      /* ── Role chips ──────────────────────────────────────── */
      .rpm-chips-bar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        background: #fafafa;
        border-bottom: 1px solid #e5e5e5;
        flex-shrink: 0;
        flex-wrap: wrap;
      }

      .rpm-chip {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.3rem 0.75rem;
        border-radius: 999px;
        border: 1.5px solid #e5e5e5;
        background: #fff;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        color: #737373;
        white-space: normal;
        text-align: left;

        &:hover {
          border-color: var(--chip-color, #218358);
          color: var(--chip-color, #218358);
        }

        &.rpm-chip--active {
          border-color: var(--chip-color, #218358);
          background: var(--chip-bg, #f4fbf6);
          color: var(--chip-color, #218358);
        }

        &.rpm-chip--highlighted {
          box-shadow: 0 0 0 2px var(--chip-color, #218358);
        }
      }

      .rpm-chip-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
        transition: background-color 0.15s ease;
      }

      .rpm-chip-tag {
        font-size: 0.625rem;
        background: #0a0a0a;
        color: #fff;
        padding: 0.1rem 0.4rem;
        border-radius: 999px;
        margin-left: 0.125rem;
      }

      .rpm-chip-action {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        border: 1.5px solid #e5e5e5;
        background: #fff;
        cursor: pointer;
        color: #737373;
        margin-left: 0.25rem;

        &:hover {
          border-color: #218358;
          color: #218358;
        }

        mat-icon {
          font-size: 1rem;
          width: 1rem;
          height: 1rem;
          line-height: 1rem;
        }
      }

      /* ── Legend ──────────────────────────────────────────── */
      .rpm-legend {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.5rem 1.5rem;
        background: #fafafa;
        border-bottom: 1px solid #e5e5e5;
        flex-shrink: 0;
        font-size: 0.75rem;
        color: #737373;
      }

      .rpm-legend-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .rpm-check-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        line-height: 1rem;
        color: #218358;
      }

      .rpm-dash-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        line-height: 1rem;
        color: #d1d5db;
      }

      .rpm-legend-total {
        margin-left: auto;
        font-size: 0.7rem;
        color: #a3a3a3;
      }

      /* ── Matrix table ────────────────────────────────────── */
      .rpm-matrix-wrapper {
        overflow: auto;
        flex: 1;
        min-height: 0;
      }

      .rpm-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      /* Sticky thead */
      thead {
        position: sticky;
        top: 0;
        z-index: 2;
      }

      .rpm-thead-row {
        background: #fff;
      }

      .rpm-th {
        padding: 0.625rem 0.75rem;
        text-align: center;
        font-size: 0.7rem;
        font-weight: 600;
        color: #737373;
        border-bottom: 2px solid #e5e5e5;
        white-space: nowrap;
        background: #fff;

        &.rpm-th--label {
          text-align: left;
          width: 260px;
          min-width: 200px;
          position: sticky;
          left: 0;
          background: #fff;
          z-index: 3;
          padding-left: 1.5rem;
        }

        &.rpm-th--role {
          width: 108px;
          min-width: 90px;
        }

        &.rpm-th--highlighted {
          background: var(--col-bg, #f4fbf6);
          color: var(--col-color, #218358);
          border-bottom-color: var(--col-color, #218358);
          border-bottom-width: 3px;
        }
      }

      .rpm-th-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.7rem;
      }

      .rpm-role-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      /* Group rows */
      .rpm-group-row {
        cursor: pointer;
        user-select: none;
        background: #f5f5f5;

        &:hover {
          background: #ededee;
        }

        &.rpm-group-row--collapsed .rpm-group-chevron {
          transform: none;
        }
      }

      .rpm-group-cell {
        padding: 0;
      }

      .rpm-group-inner {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.5rem 1rem 0.5rem 1.5rem;
      }

      .rpm-group-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        line-height: 1rem;
        color: #218358;
        flex-shrink: 0;
      }

      .rpm-group-name {
        font-size: 0.8rem;
        font-weight: 600;
        color: #0a0a0a;
        flex: 1;
      }

      .rpm-group-count {
        font-size: 0.65rem;
        color: #a3a3a3;
        background: #e5e5e5;
        border-radius: 999px;
        padding: 0.1rem 0.4rem;
      }

      .rpm-group-chevron {
        font-size: 1.1rem;
        width: 1.1rem;
        height: 1.1rem;
        line-height: 1.1rem;
        color: #737373;
        transition: transform 0.2s ease;
      }

      /* Permission rows */
      .rpm-perm-row {
        border-bottom: 1px solid #f0f0f0;

        &:hover {
          background: #fafafa;
        }

        &:last-child {
          border-bottom: 2px solid #e5e5e5;
        }
      }

      .rpm-td {
        padding: 0.5rem 0.75rem;
        vertical-align: middle;

        &.rpm-td--label {
          font-size: 0.8rem;
          color: #404040;
          position: sticky;
          left: 0;
          background: #fff;
          z-index: 1;
          padding-left: 1.5rem;
          min-width: 200px;
        }

        &.rpm-td--check {
          text-align: center;
        }

        &.rpm-td--highlighted {
          background: var(--col-bg, #f4fbf6);
        }
      }

      .rpm-perm-row:hover .rpm-td--label,
      .rpm-perm-row:hover .rpm-td--highlighted {
        background: #f4fbf6;
      }

      .rpm-check {
        font-size: 1.1rem;
        width: 1.1rem;
        height: 1.1rem;
        line-height: 1.1rem;
        color: #218358;
      }

      .rpm-dash {
        font-size: 1.1rem;
        width: 1.1rem;
        height: 1.1rem;
        line-height: 1.1rem;
        color: #d1d5db;
      }

      /* ── Footer ──────────────────────────────────────────── */
      .rpm-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.875rem 1.5rem;
        border-top: 1px solid #e5e5e5;
        background: #fafafa;
        flex-shrink: 0;
      }

      .rpm-footer-note {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.7rem;
        color: #a3a3a3;
        margin: 0;

        mat-icon {
          font-size: 0.875rem;
          width: 0.875rem;
          height: 0.875rem;
          line-height: 0.875rem;
        }
      }

      /* ── Responsive ──────────────────────────────────────── */
      @media (max-width: 640px) {
        .rpm-shell {
          width: 100vw;
          max-height: 100dvh;
        }

        .rpm-header,
        .rpm-chips-bar,
        .rpm-legend,
        .rpm-footer {
          padding-left: 1rem;
          padding-right: 1rem;
        }

        .rpm-th--label,
        .rpm-td--label {
          min-width: 140px !important;
          width: 140px !important;
          padding-left: 1rem !important;
        }

        .rpm-th--role,
        .rpm-td--check {
          min-width: 70px !important;
          width: 70px !important;
        }

        .rpm-footer {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolePermissionsModalComponent {
  dialogRef = inject(MatDialogRef<RolePermissionsModalComponent>);
  data = inject<RolePermissionsModalData>(MAT_DIALOG_DATA);

  readonly roles = ROLE_DEFINITIONS;
  readonly groups = PERMISSION_GROUPS;

  /** Set of currently visible role codes */
  private visibleRoleSet = signal(new Set(ROLE_DEFINITIONS.map((r) => r.code)));

  visibleRoleCodes = computed(() => Array.from(this.visibleRoleSet()));
  visibleRoles = computed(() => this.roles.filter((r) => this.visibleRoleSet().has(r.code)));

  /** Set of collapsed group ids */
  private collapsedGroups = signal(new Set<string>());

  isRoleVisible(code: string): boolean {
    return this.visibleRoleSet().has(code);
  }

  toggleRole(code: string): void {
    const current = new Set(this.visibleRoleSet());
    if (current.has(code)) {
      // Keep at least 1 visible
      if (current.size > 1) current.delete(code);
    } else {
      current.add(code);
    }
    this.visibleRoleSet.set(current);
  }

  showAll(): void {
    this.visibleRoleSet.set(new Set(ROLE_DEFINITIONS.map((r) => r.code)));
  }

  isGroupCollapsed(id: string): boolean {
    return this.collapsedGroups().has(id);
  }

  toggleGroup(id: string): void {
    const current = new Set(this.collapsedGroups());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.collapsedGroups.set(current);
  }
}
