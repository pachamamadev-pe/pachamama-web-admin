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
  },

  BRIGADE: {
    ALL: 'brigade:*',
  },

  COMMUNITY: {
    ALL: 'community:*',
    CREATE: 'community:create',
  },

  PRODUCT: {
    ALL: 'product:*',
    READ: 'product:read',
    CREATE: 'product:create',
  },

  FORM: {
    ALL: 'form:*',
    READ: 'form:read',
    CREATE: 'form:create',
  },

  COMPANY: {
    ALL: 'company:*',
    READ: 'company:read',
    CREATE: 'company:create',
  },

  USER: {
    ALL: 'user:*',
    READ: 'user:read',
    CREATE: 'user:create',
  },

  PROFILE: {
    ALL: 'profile:*',
  },

  PROJECT: {
    ALL: 'project:*',

    READ: 'project:read',
    CREATE: 'project:create',
    UPDATE: 'project:update',
    DELETE: 'project:delete',

    UPLOAD_MAP: 'project:upload_map',
    NEXT_STAGE: 'project:next_stage', //revisando RLC
    APPROVE_PMF: 'project:approve_pmf',
    APPROVE_INVENTORY: 'project:approve_inventory',
    UPLOAD_UMF_MAP: 'project:upload_umf_map',
    INSERT_CALCULATED_COLUMNS: 'project:insert_calculated_columns',

    VIEW_DOCUMENTS: 'project:view_documents',
    REGISTER_DOCUMENTS: 'project:register_documents',

    DOWNLOAD_PDF: 'project:download_pdf',
    SEND_PDF: 'project:send_pdf',
    UPLOAD_PMF_APPROVAL_DOCS: 'project:upload_pmf_approval_docs',

    CREATE_COLLECTION_ORDERS: 'project:create_collection_orders',
    GENERATE_PAYMENT_ORDERS: 'project:generate_payment_orders',

    APPROVE_COLLECTION_RECEPTION: 'project:approve_collection_reception',
    PROCESS_COLLECTION: 'project:process_collection',
    PRIMARY_TRANSFORMATION: 'project:primary_transformation',
    ISSUE_PRODUCTION_LOT: 'project:issue_production_lot',

    APPROVE_LOT_RECEPTION: 'project:approve_lot_reception',
    REGISTER_LOT_DELIVERY: 'project:register_lot_delivery',
    APPROVE_FINISHED_LOT_RECEPTION: 'project:approve_finished_lot_reception',
  },

  ACTIVITY: {
    ALL: 'activity:*',
  },

  PAYMENT: {
    ALL: 'payment:*',
  },

  COLLECTION: {
    APPROVE_REQUESTS: 'collection:approve_requests',
  },
} as const;

/** Tipo que representa cualquier permiso válido del catálogo. */
export type Permission =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS][keyof (typeof PERMISSIONS)[keyof typeof PERMISSIONS]];
