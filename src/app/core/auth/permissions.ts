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

  COMPANY: {
    ALL: 'company:*',
  },

  COMMUNITY: {
    ALL: 'community:*',
  },

  PRODUCT: {
    ALL: 'product:*',
  },

  USER: {
    ALL: 'user:*',
  },

  PROFILE: {
    ALL: 'profile:*',
  },

  FORM: {
    ALL: 'form:*',
  },

  PROJECT: {
    ALL: 'project:*',

    READ: 'project:read' /*RLC REVISANDO*/,
    CREATE: 'project:create',
    UPDATE: 'project:update',

    APPROVE_PMF: 'project:approve_pmf',
    UPLOAD_MAP: 'project:upload_map',
    ACTIVATE_INVENTORY: 'project:activate_inventory',
    APPROVE_INVENTORY: 'project:approve_inventory',
    UPLOAD_UMF_MAP: 'project:upload_umf_map',
    ACTIVATE_PMF_GENERATION: 'project:activate_pmf_generation',
    INSERT_CALCULATED_COLUMNS: 'project:insert_calculated_columns',

    VIEW_DOCUMENTS: 'project:view_documents',
    REGISTER_DOCUMENTS: 'project:register_documents',

    DOWNLOAD_PDF: 'project:download_pdf',
    SEND_PDF: 'project:send_pdf',
    UPLOAD_PMF_APPROVAL_DOCS: 'project:upload_pmf_approval_docs',

    ACTIVATE_COLLECTION: 'project:activate_collection',
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

  COLLECTOR: {
    ALL: 'collector:*',
  },

  BRIGADE: {
    ALL: 'brigade:*',
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
