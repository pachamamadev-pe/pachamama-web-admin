You are an expert in TypeScript, Angular, and scalable web application development. You write maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## UI Components & Angular Material

This project uses **Angular Material** as the primary UI component library. Do NOT create custom components in `shared/` if Angular Material already provides a solution.

### ✅ Use Angular Material for:

- **Buttons**: `MatButton`, `MatIconButton`, `MatFabButton` instead of custom button components
- **Form Fields**: `MatFormField`, `MatInput`, `MatSelect`, `MatDatepicker`, `MatCheckbox`, `MatRadioButton`
- **Dialogs/Modals**: `MatDialog` service and components
- **Tables**: `MatTable` with `MatPaginator` and `MatSort`
- **Progress Indicators**: `MatProgressSpinner`, `MatProgressBar`
- **Tooltips**: `MatTooltip` directive
- **Snackbar/Toasts**: `MatSnackBar` service
- **Cards**: `MatCard`
- **Badges**: `MatBadge`
- **Menus**: `MatMenu`
- **Autocomplete**: `MatAutocomplete`
- **Chips**: `MatChip`
- **Tabs**: `MatTab`

### Import Material Modules as Needed

Import only the specific Material modules you need in each component:

```typescript
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-my-component',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule],
  // ...
})
```

### ⚠️ Create Custom Components in `shared/` ONLY for:

1. **File Upload with Drag & Drop**: Angular Material doesn't provide this
2. **Empty State Component**: Custom illustrations and CTAs when lists are empty
3. **Domain-specific wrappers**: If you need to wrap Material components with app-specific logic

### Theme Customization

The project uses a custom Angular Material theme defined in `src/theme.scss` that matches the Pachamama brand colors:

- Primary: Green (`#218358`)
- Accent: Orange (`#FE714B`)
- Font: Inter

Material components will automatically use these colors.

## Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Design System & UX Guidelines

### Color Palette

Use the following color tokens defined in Tailwind configuration:

**Primarios:**

- `bg-primary-white` / `text-primary-white` - #FFFFFF (Blanco)
- `bg-primary-black` / `text-primary-black` - #000000 (Negro)

**Secundarios (Verde):**

- `bg-secondary` / `text-secondary` - #218358 (Verde principal)
- `bg-secondary-light` / `text-secondary-light` - #F4FBF6 (Verde claro/transparente)

**Neutrales:**

- `text-neutral-subheading` - #737373 (Subheadings)
- `border-neutral-border` - #E5E5E5 (Bordes)

**Acentos:**

- `text-accent-titles` - #0A0A0A (Títulos grandes y pequeños)
- `hover:bg-accent-hover` - #0A0A0A (Hover/Flotar)

**Interacción:**

- `text-price` - #FE714B (Precios - Naranja)
- `bg-nav-bg` - #D4D4D4 (Fondo left navigation - Gris claro)

**Gráficos:**

- `bg-chart-green-1` a `bg-chart-green-5` - Tonos de verde para gráficos
- `bg-map-red-1`, `bg-map-red-2` - Rojos para mapa de Perú
- `bg-map-orange` - #EA580C (Naranja en mapa)
- `bg-ump-blue` - #3B00FF (Azul eléctrico para perímetro comunidad)
- `bg-tree-yellow` - #FDE68A (Amarillo para árboles)

### Typography

Use the Inter font family with these size tokens:

- `text-body` (14pt) - Texto regular y de lectura
- `text-subtitle` (12pt) - Subtítulos
- `text-button` (14pt) - Botones
- `text-title` (30pt) - Títulos y títulos de gráficos (usar con `font-bold`)

**Font weights:**

- Regular (400) - Texto normal
- Bold (700) - Títulos

### Component Patterns

**Botones:**

```html
<!-- Botón primario -->
<button class="btn-primary">Texto</button>

<!-- Botón secundario -->
<button class="btn-secondary">Texto</button>
```

**Navegación:**

- Usar `bg-nav-bg` para el fondo de navegación izquierda
- Links en hover deben usar `hover:bg-accent-hover`

**Precios:**

- Siempre usar `text-price` para mostrar precios

**Iconos:**

- Por defecto usar `text-icon` (negro)

### Responsive Design & Breakpoints

- **Mobile-First Approach**: Always design for mobile first. Styles without a breakpoint prefix (e.g., `p-4`, `flex`) apply to all screen sizes (`xs` and up).
- **Breakpoints**: Use Tailwind's default breakpoints to adapt the layout for larger screens. The prefixes are applied to utility classes (e.g., `md:p-8`, `lg:flex-row`).
  - `sm`: `640px`
  - `md`: `768px`
  - `lg`: `1024px`
  - `xl`: `1280px`
- **Layouts**: Use `flex` and `grid` with responsive prefixes to create flexible and adaptive layouts. For example, a common pattern is to use `flex-col` on mobile and `md:flex-row` on medium screens and up.

## Project Architecture & Folder Structure

This project follows a **Feature-Sliced Design** architecture with clear separation of concerns. Understanding when and where to place code is crucial for scalability and maintainability.

### Folder Structure Overview

```
src/app/
├── core/           # Core functionality (singleton services, layout, auth)
├── features/       # Business features (lazy-loaded modules)
├── shared/         # Reusable code across multiple features
└── app.routes.ts   # Application routing configuration
```

### 1. `core/` - Application Core

**Purpose**: Contains singleton services, layout components, interceptors, and guards that are used throughout the entire application.

**Structure by Domain (Cohesion Pattern)**:

```
core/
├── layout/                    # Layout domain
│   ├── layout.service.ts      # Service specific to layout
│   ├── shell.component.ts     # Main layout wrapper
│   ├── header.component.ts    # Header component
│   └── sidebar.component.ts   # Sidebar component
├── auth/                      # Authentication domain
│   ├── auth.service.ts        # Auth logic and token management
│   └── auth.interceptor.ts    # HTTP interceptor for auth tokens
├── http/                      # HTTP domain
│   └── http-error.interceptor.ts  # Global error handling
└── services/                  # ONLY global cross-cutting services
    ├── theme.service.ts       # Example: App theming
    └── analytics.service.ts   # Example: Event tracking
```

**Rules for `core/`**:

- ✅ **Group services with their related components** (e.g., `layout.service.ts` lives in `layout/`, not `services/`)
- ✅ **Use domain-based folders** for cohesion (layout, auth, http)
- ✅ **Only put truly global services** in `core/services/` (used across multiple domains)
- ❌ **Don't put feature-specific services here** (those belong in `features/`)

**Why `layout.service.ts` is in `core/layout/` and not `core/services/`**:

- **Cohesion**: Everything related to layout is together, making it easier to find and maintain
- **Encapsulation**: `LayoutService` is an implementation detail of the layout module
- **Discoverability**: Developers immediately know this service is related to layout components

### 2. `features/` - Business Features

**Purpose**: Contains all business logic organized by feature/domain. Each feature is a self-contained module that can be lazy-loaded.

**Complete Feature Structure**:

```
features/
└── products/                       # Feature name (business domain)
    ├── pages/                      # Route components (map to URLs)
    │   ├── products.page.ts        # List page: /products
    │   ├── product-detail.page.ts  # Detail page: /products/:id
    │   └── product-form.page.ts    # Form page: /products/new or /products/:id/edit
    │
    ├── components/                 # Reusable components WITHIN this feature
    │   ├── product-card.component.ts
    │   ├── product-table.component.ts
    │   └── product-filters.component.ts
    │
    ├── services/                   # Feature-specific services
    │   ├── products.service.ts     # CRUD operations (HTTP calls)
    │   └── product-validator.service.ts
    │
    ├── models/                     # Feature-specific types/interfaces
    │   ├── product.model.ts        # export interface Product { ... }
    │   └── product-filter.model.ts
    │
    ├── guards/                     # Feature-specific route guards (optional)
    │   └── product-owner.guard.ts
    │
    └── utils/                      # Feature-specific utilities (optional)
        └── product-helpers.ts
```

**Rules for Pages (`pages/`)**:

Pages are components that represent **routes** (URLs) in your application.

✅ **Use inline templates when**:

- Template is **less than 50-80 lines**
- Component logic is simple and straightforward
- No complex HTML structure

```typescript
// ✅ Good: Simple page with inline template
@Component({
  selector: 'app-products-page',
  template: `
    <div class="space-y-4">
      <h1>Productos</h1>
      <app-product-table [products]="products()" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPage {
  products = signal<Product[]>([]);
}
```

❌ **Use external template files when**:

- Template is **more than 80-100 lines**
- Complex HTML structure with multiple nested levels
- Heavy use of control flow (`@if`, `@for`)

```typescript
// ❌ Use external file for complex templates
@Component({
  selector: 'app-product-form-page',
  templateUrl: './product-form.page.html', // Separate file
  styleUrl: './product-form.page.scss', // Separate styles if needed
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormPage {}
```

**When to extract components** from a page:

✅ **Extract to `components/` when**:

1. **Reusability**: Component is used in 2+ pages within the same feature
2. **Complexity**: Page template exceeds 150-200 lines
3. **Single Responsibility**: A section has its own logic and can be isolated
4. **Testing**: Component needs to be tested independently

```typescript
// ✅ Before: products.page.ts (200+ lines)
template: `
  <div>
    <div><!-- 50 lines of filters --></div>
    <div><!-- 100 lines of table --></div>
    <div><!-- 50 lines of pagination --></div>
  </div>
`;

// ✅ After: Extract components
template: `
  <div class="space-y-4">
    <app-product-filters (filter)="onFilter($event)" />
    <app-product-table [products]="filteredProducts()" />
    <app-pagination [total]="total()" (pageChange)="onPageChange($event)" />
  </div>
`;
```

❌ **Keep inline when**:

- Component is used in only ONE page
- Template is less than 100 lines
- No complex logic that needs isolation

**Services in Features**:

Feature services should handle:

- HTTP calls to API endpoints
- Business logic specific to the feature
- State management for the feature (if not using a global store)

```typescript
// features/products/services/products.service.ts
@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>('/api/products');
  }

  createProduct(product: CreateProductDto): Observable<Product> {
    return this.http.post<Product>('/api/products', product);
  }
}
```

### 3. `shared/` - Shared/Reusable Code

**Purpose**: Contains code that is **reused across 2 or more features**. This includes UI components, directives, pipes, utilities, and global models.

**Complete Shared Structure**:

```
shared/
├── components/                 # Generic UI components
│   ├── button/
│   │   └── button.component.ts           # <app-button variant="primary">
│   ├── modal/
│   │   ├── modal.component.ts            # <app-modal>
│   │   └── modal.service.ts              # Service to open modals programmatically
│   ├── table/
│   │   ├── table.component.ts            # Generic table component
│   │   └── table-column.directive.ts
│   ├── input/
│   │   └── input.component.ts            # <app-input> with validation
│   ├── card/
│   │   └── card.component.ts             # <app-card>
│   ├── badge/
│   │   └── badge.component.ts            # <app-badge>
│   ├── spinner/
│   │   └── spinner.component.ts          # <app-spinner> loading indicator
│   └── file-upload/
│       └── file-upload.component.ts      # <app-file-upload>
│
├── directives/                 # Reusable directives
│   ├── auto-focus.directive.ts           # [appAutoFocus]
│   ├── click-outside.directive.ts        # [appClickOutside]
│   └── tooltip.directive.ts              # [appTooltip="text"]
│
├── pipes/                      # Custom pipes
│   ├── format-date.pipe.ts               # {{ date | formatDate }}
│   ├── currency-sol.pipe.ts              # {{ price | currencySol }}
│   └── truncate.pipe.ts                  # {{ text | truncate:50 }}
│
├── utils/                      # Pure utility functions
│   ├── validators.ts                     # Custom form validators
│   ├── date-helpers.ts                   # Date manipulation functions
│   └── string-helpers.ts                 # String utilities
│
├── models/                     # Global types/interfaces
│   ├── api-response.model.ts             # export interface ApiResponse<T>
│   ├── pagination.model.ts               # export interface PaginationParams
│   └── user.model.ts                     # If User is used across features
│
└── constants/                  # Global constants
    ├── api-endpoints.ts                  # export const API_URLS = { ... }
    └── app-config.ts                     # export const APP_CONFIG = { ... }
```

**Golden Rule for `shared/`**:

```
❓ Is this component/utility used in 2+ different features?
   ├─ YES → Place in shared/
   └─ NO  → Keep it in the specific feature folder
```

**Examples**:

✅ **Goes in `shared/components/`**:

```typescript
// shared/components/button/button.component.ts
// Used in: products/, communities/, brigades/
@Component({
  selector: 'app-button',
  template: `<button [class]="buttonClasses()">...</button>`,
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary'>('primary');
}
```

❌ **Stays in `features/products/components/`**:

```typescript
// features/products/components/product-card.component.ts
// Only used in products feature
@Component({
  selector: 'app-product-card',
  template: `<div>Product-specific card</div>`,
})
export class ProductCardComponent {
  product = input.required<Product>();
}
```

### 4. Routing Configuration

Routes are defined in `app.routes.ts` using **lazy loading** for optimal performance.

```typescript
// app.routes.ts
export const appRoutes: Routes = [
  {
    path: '',
    component: ShellComponent, // Layout wrapper
    children: [
      // Simple route
      {
        path: 'products',
        title: 'Mis productos', // Dynamic header title
        loadComponent: () =>
          import('./features/products/pages/products.page').then((m) => m.ProductsPage), // Lazy loading
      },

      // Route with parameters
      {
        path: 'products/:id',
        title: 'Detalle de producto',
        loadComponent: () =>
          import('./features/products/pages/product-detail.page').then((m) => m.ProductDetailPage),
      },

      // Nested route
      {
        path: 'projects/:projectId/areas/import',
        title: 'Importar áreas',
        loadComponent: () =>
          import('./features/areas/pages/areas-import.page').then((m) => m.AreasImportPage),
      },
    ],
  },
];
```

**Navigation between pages**:

```typescript
// Option 1: Template (HTML)
template: `
  <a routerLink="/products">Ver productos</a>
  <a [routerLink]="['/products', productId]">Ver detalle</a>
`;

// Option 2: Programmatic (TypeScript)
export class MyComponent {
  private router = inject(Router);

  goToProducts(): void {
    this.router.navigate(['/products']);
  }

  goToDetail(id: string): void {
    this.router.navigate(['/products', id]);
  }
}
```

### Summary: Decision Tree

**Where should I put this SERVICE?**

```
Is it specific to a single feature?
├─ YES → features/{feature-name}/services/
└─ NO  → Is it related to a core domain (layout, auth, http)?
         ├─ YES → core/{domain}/
         └─ NO  → core/services/ (global cross-cutting service)
```

**Where should I put this COMPONENT?**

```
Is it a route/page?
├─ YES → features/{feature-name}/pages/
└─ NO  → Is it used in 2+ features?
         ├─ YES → shared/components/
         └─ NO  → features/{feature-name}/components/
```

**Should I use an INLINE TEMPLATE?**

```
Is the template less than 80 lines AND simple?
├─ YES → Use inline template
└─ NO  → Use external .html file
```

## Static Assets & Resources

Static assets (images, fonts, icons, etc.) are placed in the `public/` directory at the root of the project.

### Asset Structure

```
public/
├── favicon.ico                    # App favicon
├── images/                        # All images
│   ├── logo/
│   │   ├── logo.svg               # Main Pachamama logo
│   │   ├── logo-white.svg         # White logo (for dark backgrounds)
│   │   └── logo-icon.svg          # Icon only (no text)
│   ├── illustrations/
│   │   ├── empty-state.svg        # Empty state illustrations
│   │   ├── error-404.svg          # 404 page
│   │   └── error-500.svg          # Server error page
│   └── backgrounds/
│       └── login-bg.jpg           # Login/auth background
├── icons/                         # Custom icons (if not using Material Icons)
│   └── custom-icons.svg
└── data/                          # Static/mock data
    └── mock-data.json             # For development without backend
```

### Referencing Assets

```typescript
// In HTML templates
<img src="/images/logo/logo.svg" alt="Pachamama" />
<img src="/images/illustrations/empty-state.svg" alt="No data" />

// In CSS/SCSS
background-image: url('/images/backgrounds/login-bg.jpg');

// In TypeScript
const logoUrl = '/images/logo/logo.svg';
```

**Important**: Always use absolute paths starting with `/` when referencing assets from `public/`.

## Project Documentation & Context

Refer to the following files for project requirements, user stories, and development roadmaps. This context is crucial for understanding the "why" behind the code.

- `./.project-docs/historias-de-usuario.md`: User stories defining the application's features.
- `./.project-docs/roadmap-sprints.md`: The overall development plan broken down by sprints.
- `./.project-docs/roadmap-semana-1.md`: Specific development tasks and goals for the current week.
