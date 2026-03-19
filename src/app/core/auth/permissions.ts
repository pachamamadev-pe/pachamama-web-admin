/**
 * Catálogo centralizado de permisos del sistema.
 * Usar siempre estas constantes en lugar de strings literales para
 * evitar typos y facilitar el refactoring.
 *
 * Convención de clave: 'resource:action'
 *
 * @example
 * *appPmHasPermission="PERMISSIONS.PROJECT.REGISTER_DOCUMENTS"
 * sidebarService.hasPermission(PERMISSIONS.PROJECT.REGISTER_DOCUMENTS)
 */
export const PERMISSIONS = {
  GLOBAL: {
    ALL: '*:*',
  },

  COLLECTOR: {
    ALL: 'collector:*',
    READ: 'collector:read',
    UPDATE: 'collector:update',
  },

  BRIGADE: {
    ALL: 'brigade:*',
    READ: 'brigade:read',
    CREATE: 'brigade:create',
    UPDATE: 'brigade:update',
  },

  COMMUNITY: {
    ALL: 'community:*',
    READ: 'community:read',
    CREATE: 'community:create',
    UPDATE: 'community:update',
    DELETE: 'community:delete',
  },

  PRODUCT: {
    ALL: 'product:*',
    READ: 'product:read',
    UPDATE: 'product:update',
    DELETE: 'product:delete',
    CREATE: 'product:create',
  },

  FORM: {
    ALL: 'form:*',
    READ: 'form:read',
    CREATE: 'form:create',
    UPDATE: 'form:update',
    DELETE: 'form:delete',
    PUBLISH: 'form:publish',
  },

  COMPANY: {
    ALL: 'company:*',
    READ: 'company:read',
    CREATE: 'company:create',
    UPDATE: 'company:update',
    DELETE: 'company:delete',
    MANAGE_DOCUMENTS: 'company:manage_documents',
    MANAGE_ADMINS: 'company:manage_admins',
  },

  DASHBOARD: {
    ALL: 'dashboard:*',
    VIEW: 'dashboard:view',
  },

  USER: {
    ALL: 'user:*',
    READ: 'user:read',
    CREATE: 'user:create',
    UPDATE: 'user:update',
    DELETE: 'user:delete',
  },

  PROFILE: {
    ALL: 'profile:*',
  },

  DOCUMENT: {
    ALL: 'document:*',
    READ: 'document:read',
    UPLOAD: 'document:upload',
    DOWNLOAD: 'document:download',
    REVIEW: 'document:review',
  },

  ACTIVITY_INVENTORY: {
    ALL: 'activity_inventory:*',
    READ: 'activity_inventory:read',
    REVIEW: 'activity_inventory:review',
  },

  ACTIVITY_COLLECTION: {
    ALL: 'activity_collection:*',
    READ: 'activity_collection:read',
    REVIEW: 'activity_collection:review',
  },

  COLLECTION_REQUEST: {
    ALL: 'collection_request:*',
    READ: 'collection_request:read',
    CREATE: 'collection_request:create',
    UPDATE: 'collection_request:update',
    REVIEW: 'collection_request:review',
  },

  PROJECT: {
    ALL: 'project:*',

    READ: 'project:read',
    CREATE: 'project:create',
    UPDATE: 'project:update',
    DELETE: 'project:delete',
    UPLOAD_MAP: 'project:upload_map',
    NEXT_STAGE: 'project:next_stage',
    GENERATION_PMF: 'project:generation_pmf',
  },

  COLLECTION_BATCH: {
    ALL: 'collection_batch:*',
    READ: 'collection_batch:read',
    CREATE: 'collection_batch:create',
    PROCESS: 'collection_batch:process',
  },

  ACTIVITY_FORMULA: {
    ALL: 'activity_formula:*',
    READ: 'activity_formula:read',
    CREATE: 'activity_formula:create',
    UPDATE: 'activity_formula:update',
    DELETE: 'activity_formula:delete',
  },

  PROJECT_AGGREGATION: {
    ALL: 'project_aggregation:*',
    READ: 'project_aggregation:read',
    CREATE: 'project_aggregation:create',
    UPDATE: 'project_aggregation:update',
    DELETE: 'project_aggregation:delete',
  },

  DOCUMENT_TYPE: {
    ALL: 'document_type:*',
    READ: 'document_type:read',
    CREATE: 'document_type:create',
    UPDATE: 'document_type:update',
    DELETE: 'document_type:delete',
  },

  TRANSFORMATION_PRIMARY: {
    ALL: 'transformation_primary:*',
    READ: 'transformation_primary:read',
    CREATE: 'transformation_primary:create',
    PROCESS: 'transformation_primary:process',
    GENERATE_QR: 'transformation_primary:generate_qr',
    VIEW_LOCATION: 'transformation_primary:view_location',
    STORAGE: 'transformation_primary:storage',
  },

  TRANSFORMATION_SECONDARY: {
    ALL: 'transformation_secondary:*',
    READ: 'transformation_secondary:read',
    CREATE: 'transformation_secondary:create',
    PROCESS: 'transformation_secondary:process',
    GENERATE_QR: 'transformation_secondary:generate_qr',
    VIEW_LOCATION: 'transformation_secondary:view_location',
  },
} as const;

/** Tipo que representa cualquier permiso válido del catálogo. */
export type Permission =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS][keyof (typeof PERMISSIONS)[keyof typeof PERMISSIONS]];
