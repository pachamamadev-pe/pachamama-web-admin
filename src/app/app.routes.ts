import { Routes } from '@angular/router';
import { ShellComponent } from './core/layout/shell.component';

export const appRoutes: Routes = [
  // Rutas públicas (sin layout)
  {
    path: 'login',
    title: 'Iniciar sesión - Pachamama',
    loadComponent: () => import('./features/auth/pages/login.page'),
  },

  // Rutas protegidas (con layout)
  {
    path: '',
    component: ShellComponent,
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
        path: 'companies',
        title: 'Empresas',
        loadComponent: () =>
          import('./features/companies/pages/companies.page').then((m) => m.CompaniesPage),
      },
      {
        path: 'communities',
        title: 'Mapa recolección aprobada',
        loadComponent: () =>
          import('./features/communities/pages/communities.page').then((m) => m.CommunitiesPage),
      },
      {
        path: 'projects',
        title: 'Reportes',
        loadComponent: () =>
          import('./features/projects/pages/projects.page').then((m) => m.ProjectsPage),
      },
      {
        path: 'brigades',
        title: 'Configuración',
        loadComponent: () =>
          import('./features/brigades/pages/brigades.page').then((m) => m.BrigadesPage),
      },
      {
        path: 'projects/:id/areas/import',
        title: 'Importar áreas',
        loadComponent: () =>
          import('./features/areas/pages/areas-import.page').then((m) => m.AreasImportPage),
      },
      {
        path: 'projects/:id/enable-inventory',
        title: 'Habilitar inventario',
        loadComponent: () =>
          import('./features/inventory/pages/enable-inventory.page').then(
            (m) => m.EnableInventoryPage,
          ),
      },
      { path: '**', redirectTo: 'home' },
    ],
  },
];
