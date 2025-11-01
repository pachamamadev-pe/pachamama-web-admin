# 🌿 Pachamama - Web Admin

[![Deploy to QA](https://github.com/pachamamadev-pe/pachamama-web-admin/actions/workflows/deploy-qa.yml/badge.svg)](https://github.com/pachamamadev-pe/pachamama-web-admin/actions/workflows/deploy-qa.yml)
[![Vercel](https://img.shields.io/badge/Vercel-QA-black?logo=vercel)](https://pachamama-web-admin.vercel.app)

Panel de administración para la plataforma Pachamama, un sistema de gestión de recolección y trazabilidad de productos agrícolas en comunidades peruanas.

![Angular](https://img.shields.io/badge/Angular-20.x-red?logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Material](https://img.shields.io/badge/Material-20.x-blue?logo=material-design)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.x-38bdf8?logo=tailwind-css)

## 🚀 Environments

- **QA Environment:** [https://pachamama-web-admin.vercel.app](https://pachamama-web-admin.vercel.app)
- **Status:** Automated deployments from `main` branch

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Desarrollo](#-desarrollo)
- [Arquitectura](#-arquitectura)
- [Scripts Disponibles](#-scripts-disponibles)
- [Convenciones de Código](#-convenciones-de-código)
- [Roadmap](#-roadmap)
- [Contribución](#-contribución)

## 📖 Descripción

Pachamama Web Admin es una aplicación web empresarial diseñada para gestionar:

- **Productos**: Catálogo de productos agrícolas con validación de unicidad (código RUC)
- **Comunidades**: Registro y gestión de comunidades productoras
- **Brigadas**: Equipos de recolección con gestión de miembros y vigencia
- **Empresas**: Administración de empresas y asignación de administradores
- **Proyectos**: Gestión de proyectos con geolocalización (geomalla)
- **Inventario**: Habilitación y control de inventario por proyecto

## ✨ Características

### Sprint 1 (Actual)

- ✅ Layout responsivo con sidebar y header adaptables
- ✅ Sistema de navegación con rutas lazy-loaded
- ✅ Integración con Angular Material
- ✅ Tema personalizado con colores de marca
- ✅ Componentes compartidos (empty-state, utilities, pipes)
- ✅ Validadores personalizados (RUC, DNI, códigos únicos)
- 🚧 CRUD de Productos con validaciones
- 🚧 Gestión de Comunidades
- 🚧 Gestión de Brigadas
- 🚧 Módulo de Empresas con asignación de admin
- 🚧 Importación de Geomalla (GeoJSON/KML)
- 🚧 Flujo de habilitación de inventario

### Roadmap Futuro

- 📊 Dashboard con métricas y estadísticas
- 🗺️ Visualización de mapa interactivo con geomalla
- 📱 PWA (Progressive Web App)
- 🔔 Sistema de notificaciones en tiempo real
- 📄 Generación de reportes en PDF/Excel
- 🌐 Internacionalización (i18n) ES/EN

## � CI/CD & Deployment

### Deployment Process

El proyecto utiliza **GitHub Actions** + **Vercel** para despliegues automáticos:

#### Push a `main` → Deploy automático a QA

```bash
git push origin main
# ✅ Ejecuta lint, tests y build
# ✅ Despliega a: https://pachamama-web-admin.vercel.app
```

#### Pull Requests → Preview deployments

```bash
git push origin feature/my-feature
# Crea PR en GitHub
# ✅ GitHub Actions crea preview temporal
# ✅ URL única: https://pachamama-web-admin-git-feature-pr123.vercel.app
```

### Quality Gates

Todos los deployments requieren:

- ✅ **ESLint:** Sin errores de linting
- ✅ **Tests:** Todos los tests deben pasar
- ✅ **Build:** Compilación exitosa sin errores

### Rollback

Si algo falla en QA, puedes hacer rollback en 1 clic desde el dashboard de Vercel o desde GitHub Actions.

## �🛠 Tecnologías

### Core

- **Angular 20.3.x** - Framework principal
- **TypeScript 5.x** - Lenguaje tipado
- **RxJS** - Programación reactiva
- **Signals** - Gestión de estado reactivo

### UI/UX

- **Angular Material 20.x** - Componentes UI
- **Tailwind CSS 3.x** - Utility-first CSS
- **Inter Font** - Tipografía

### Herramientas

- **ESLint** - Linter de código
- **Prettier** - Formateador de código
- **Husky** - Git hooks
- **Cypress/Playwright** - Testing E2E (planificado)
- **Jest** - Testing unitario (planificado)

### Mapa/GIS (planificado)

- **MapLibre GL** o **Leaflet** - Visualización de mapas
- Soporte para GeoJSON, KML, TopoJSON

## 📦 Requisitos Previos

- **Node.js**: v22.x o superior
- **npm**: v10.x o superior
- **Git**: Para control de versiones

Verificar versiones instaladas:

```bash
node -v    # v22.x.x
npm -v     # 10.x.x
git --version
```

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd web-admin-pachamama
```

### 2. Instalar dependencias

```bash
npm ci
```

### 3. Configurar variables de entorno (opcional)

```bash
# Crear archivo .env para configuración local
cp .env.example .env
```

### 4. Iniciar servidor de desarrollo

```bash
npm start
```

La aplicación estará disponible en `http://localhost:4200`

## 💻 Desarrollo

### Servidor de Desarrollo

```bash
npm start
# o
ng serve
```

Abre `http://localhost:4200/` en tu navegador. La aplicación se recargará automáticamente al hacer cambios.

### Build

```bash
# Build de desarrollo
npm run build

# Build de producción
npm run build -- --configuration production
```

Los artefactos se generarán en `dist/`.

### Tests

```bash
# Tests unitarios
npm test

# Tests E2E (cuando estén configurados)
npm run e2e
```

### Linting y Formateo

```bash
# Ejecutar linter
npm run lint

# Formatear código
npm run format

# Verificar formato sin modificar
npm run format:check
```

## 📁 Arquitectura

El proyecto sigue una arquitectura **Feature-Sliced Design** con separación clara de responsabilidades.

```text
src/app/
├── core/                   # Funcionalidad core (singleton)
│   ├── layout/            # Shell, Header, Sidebar, LayoutService
│   ├── auth/              # Autenticación (futuro)
│   └── http/              # Interceptors HTTP
├── features/              # Módulos de negocio (lazy-loaded)
│   ├── products/          # Gestión de productos
│   ├── communities/       # Gestión de comunidades
│   ├── brigades/          # Gestión de brigadas
│   ├── companies/         # Gestión de empresas
│   ├── projects/          # Gestión de proyectos
│   ├── areas/             # Importación de geomalla
│   └── inventory/         # Habilitación de inventario
└── shared/                # Código reutilizable
    ├── components/        # Componentes UI genéricos
    ├── directives/        # Directivas custom
    ├── pipes/             # Pipes personalizados
    ├── utils/             # Utilidades y validators
    ├── models/            # Tipos/interfaces globales
    └── constants/         # Constantes de la app
```

### Estructura de una Feature

```text
features/products/
├── pages/                 # Componentes de ruta (mapean a URLs)
│   ├── products.page.ts
│   └── product-detail.page.ts
├── components/            # Componentes reutilizables DE ESTA feature
├── services/              # Servicios específicos
├── models/                # Tipos e interfaces
└── utils/                 # Utilidades específicas
```

### Reglas de Arquitectura

✅ **Usar componentes de Angular Material** cuando estén disponibles
✅ **Inline templates** para componentes < 80 líneas
✅ **Signals** para gestión de estado local
✅ **Lazy loading** para todas las features
✅ **Mobile-first** approach para diseño responsivo

## 📜 Scripts Disponibles

| Script                 | Descripción                                            |
| ---------------------- | ------------------------------------------------------ |
| `npm start`            | Inicia servidor de desarrollo en `http://0.0.0.0:4200` |
| `npm run build`        | Build de producción                                    |
| `npm test`             | Ejecuta tests unitarios                                |
| `npm run lint`         | Ejecuta ESLint                                         |
| `npm run format`       | Formatea código con Prettier                           |
| `npm run format:check` | Verifica formato sin modificar                         |

## 🎨 Convenciones de Código

### Componentes

```typescript
@Component({
  selector: 'app-my-component',
  imports: [CommonModule, MatButtonModule],
  template: `...`, // Inline si < 80 líneas
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyComponent {
  // Usar signals
  count = signal(0);

  // Usar input/output functions
  title = input.required<string>();
  action = output<void>();

  // Inject dependencies
  private service = inject(MyService);
}
```

### Servicios

```typescript
@Injectable({ providedIn: 'root' })
export class MyService {
  private http = inject(HttpClient);

  getData(): Observable<Data[]> {
    return this.http.get<Data[]>('/api/data');
  }
}
```

### Rutas

```typescript
{
  path: 'products',
  title: 'Mis productos',  // Título dinámico del header
  loadComponent: () => import('./features/products/pages/products.page')
                      .then(m => m.ProductsPage),  // Lazy loading
}
```

## 🗺 Roadmap

### Sprint 1 (3 semanas) - En Curso

**Semana 1**: Bootstrap Web, UX base, CI/CD

- [x] Layout responsivo
- [x] Integración Angular Material
- [x] Shared utilities y componentes
- [ ] Módulo Empresas (scaffold)

**Semana 2**: CRUD Features + API

- [ ] Endpoints API Productos
- [ ] Web Productos (CRUD completo)
- [ ] Web Comunidades
- [ ] Web Brigadas mínimo
- [ ] E2E Productos

**Semana 3**: Geomalla + Inventario

- [ ] UI Geomalla (import + visualización)
- [ ] Flujo "Habilitar inventario"
- [ ] E2E completo

Ver detalles completos en `.project-docs/sprint1-programador1-checklist.md`

## 🤝 Contribución

### Git Workflow

1. Crear una rama desde `develop`:

   ```bash
   git checkout -b feature/my-feature develop
   ```

2. Hacer commits siguiendo [Conventional Commits](https://www.conventionalcommits.org/):

   ```bash
   git commit -m "feat: add product CRUD"
   git commit -m "fix: resolve validation error"
   git commit -m "docs: update README"
   ```

3. Push y crear Pull Request a `develop`

### Commit Conventions

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Cambios de formato (no afectan lógica)
- `refactor:` Refactorización de código
- `test:` Añadir o modificar tests
- `chore:` Tareas de mantenimiento

### Pre-commit Hooks

Husky ejecuta automáticamente antes de cada commit:

- ✅ ESLint (lint)
- ✅ Tests unitarios (cuando estén configurados)

## 📄 Licencia

Proyecto privado - Todos los derechos reservados © 2025 Pachamama

## 📞 Contacto

Para dudas o consultas sobre el proyecto, contactar al equipo de desarrollo.

---

**Versión actual**: 0.1.0 (Sprint 1)  
**Última actualización**: Octubre 2025

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
