import { Routes } from '@angular/router';
import { ShellComponent } from './core/layout/shell.component';
import { authGuard, loginGuard } from './core/auth/auth.guard';

export const appRoutes: Routes = [
  // Rutas públicas (sin layout)
  {
    path: 'login',
    title: 'Iniciar sesión - Pachamama',
    loadComponent: () => import('./features/auth/pages/login.page'),
    canActivate: [loginGuard], // Redirige a /home si ya está autenticado
  },

  // Rutas protegidas (con layout)
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard], // Protege todas las rutas hijas
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        title: 'Inicio',
        loadComponent: () => import('./features/home/pages/home.page').then((m) => m.HomePage),
      },
      {
        path: 'products',
        title: 'Mis productos',
        loadComponent: () =>
          import('./features/products/pages/products.page').then((m) => m.ProductsPage),
      },
      {
        path: 'products/:id',
        title: 'Detalle del producto',
        loadComponent: () =>
          import('./features/products/pages/product-detail.page').then((m) => m.ProductDetailPage),
      },
      {
        path: 'products/:productId/forms/:stage',
        title: 'Editar formulario',
        loadComponent: () =>
          import('./features/products/components/product-form-builder.component').then(
            (m) => m.ProductFormBuilderComponent,
          ),
      },
      {
        path: 'companies',
        title: 'Empresas',
        loadComponent: () =>
          import('./features/companies/pages/companies.page').then((m) => m.CompaniesPage),
      },
      {
        path: 'communities',
        title: 'Comunidades',
        loadComponent: () =>
          import('./features/communities/pages/communities.page').then((m) => m.CommunitiesPage),
      },
      {
        path: 'communities/:id',
        title: 'Detalle de comunidad',
        loadComponent: () =>
          import('./features/communities/pages/community-detail.page').then(
            (m) => m.CommunityDetailPage,
          ),
      },
      {
        path: 'company-users',
        title: 'Usuarios de Empresa',
        loadComponent: () =>
          import('./features/company-users/pages/company-users.page').then(
            (m) => m.CompanyUsersPage,
          ),
      },
      {
        path: 'projects',
        title: 'Proyectos',
        loadComponent: () =>
          import('./features/projects/pages/projects.page').then((m) => m.ProjectsPage),
      },
      {
        path: 'projects/:id/areas/import',
        title: 'Importar áreas',
        loadComponent: () =>
          import('./features/areas/pages/areas-import.page').then((m) => m.AreasImportPage),
      },
      {
        path: 'projects/:id/batches/:batchId',
        title: 'Detalle del Lote de Acopio',
        loadComponent: () =>
          import('./features/collection-batches/pages/batch-detail.page').then(
            (m) => m.BatchDetailPage,
          ),
      },
      {
        path: 'projects/:id/enable-inventory',
        title: 'Habilitar inventario',
        loadComponent: () =>
          import('./features/inventory/pages/enable-inventory.page').then(
            (m) => m.EnableInventoryPage,
          ),
      },
      {
        path: 'projects/:projectId/activities/:activityId/evaluate',
        title: 'Evaluar Actividad',
        loadComponent: () =>
          import('./features/projects/pages/activity-evaluation.page').then(
            (m) => m.ActivityEvaluationPage,
          ),
      },
      {
        path: 'projects/:id/production-lots/:lotId',
        title: 'Detalle del Lote de Producción',
        loadComponent: () =>
          import('./features/projects/pages/production-lot-detail.page').then(
            (m) => m.ProductionLotDetailPage,
          ),
      },
      {
        path: 'projects/:id/secondary-lots/:lotId',
        title: 'Detalle del Lote Secundario',
        loadComponent: () =>
          import('./features/projects/pages/secondary-lot-detail.page').then(
            (m) => m.SecondaryLotDetailPage,
          ),
      },
      {
        path: 'projects/:id/pending-documents',
        title: 'Documentos Pendientes',
        loadComponent: () =>
          import('./features/projects/pages/project-pending-documents.page').then(
            (m) => m.ProjectPendingDocumentsPage,
          ),
      },
      {
        path: 'projects/:id',
        title: 'Detalle del Proyecto',
        loadComponent: () =>
          import('./features/projects/pages/project-detail.page').then((m) => m.ProjectDetailPage),
      },
      // ─── Lotes de Transformación (nivel empresa) ─────────────────
      {
        path: 'production-lots',
        title: 'Lotes de Transformación',
        loadComponent: () =>
          import('./features/production-lots/pages/production-lots.page').then(
            (m) => m.ProductionLotsPage,
          ),
      },
      {
        path: 'production-lots/:id',
        title: 'Detalle del Lote de Transformación',
        loadComponent: () =>
          import('./features/production-lots/pages/production-lot-detail.page').then(
            (m) => m.ProductionLotDetailPage,
          ),
      },
      {
        path: 'production-lots/secondary/:id',
        title: 'Detalle del Lote Secundario',
        loadComponent: () =>
          import('./features/production-lots/pages/secondary-lot-detail.page').then(
            (m) => m.SecondaryLotDetailCompanyPage,
          ),
      },
      {
        path: 'collection-requests',
        title: 'Solicitudes de Recolección',
        loadComponent: () =>
          import('./features/collection-requests/pages/collection-requests.page').then(
            (m) => m.CollectionRequestsPage,
          ),
      },
      {
        path: 'dynamic-forms',
        title: 'Formularios Dinámicos',
        loadComponent: () =>
          import('./features/dynamic-forms/pages/dynamic-forms.page').then(
            (m) => m.DynamicFormsPage,
          ),
      },
      {
        path: 'dynamic-forms/create',
        title: 'Crear Formulario',
        loadComponent: () =>
          import('./features/dynamic-forms/pages/dynamic-form-builder.page').then(
            (m) => m.DynamicFormBuilderPage,
          ),
      },
      {
        path: 'dynamic-forms/:productId/:formId/edit',
        title: 'Editar Formulario',
        loadComponent: () =>
          import('./features/dynamic-forms/pages/dynamic-form-builder.page').then(
            (m) => m.DynamicFormBuilderPage,
          ),
      },
      {
        path: 'brigades',
        title: 'Configuración',
        loadComponent: () =>
          import('./features/brigades/pages/brigades.page').then((m) => m.BrigadesPage),
      },
      {
        path: 'profile',
        title: 'Mi Perfil',
        loadComponent: () => import('./features/profile/pages/profile.page'),
      },
      {
        path: 'document-types',
        title: 'Tipos de Documento',
        loadComponent: () =>
          import('./features/document-types/pages/document-types.page').then(
            (m) => m.DocumentTypesPage,
          ),
      },
      { path: '**', redirectTo: 'home' },
    ],
  },
];
