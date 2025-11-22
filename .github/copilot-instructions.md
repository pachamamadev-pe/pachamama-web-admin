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

### CRUD Pages Standard

For all CRUD list pages, **always define** a `displayedColumns` array that specifies visible table columns:

```typescript
export class MyFeaturePage {
  // ✅ REQUIRED: Define columns explicitly
  displayedColumns: string[] = [
    'column1',
    'column2',
    'column3',
    'actions', // Always include actions as last column
  ];
}
```

**Example from Companies (the standard):**

```typescript
displayedColumns: string[] = [
  'ruc',
  'businessName',
  'tradeName',
  'licenseType',
  'admins',
  'status',
  'actions',
];
```

**Example from Communities:**

```typescript
displayedColumns: string[] = [
  'code',
  'name',
  'ruc',
  'legalAddress',
  'location',
  'actions',
];
```

**Why?**

- Makes column management explicit and maintainable
- Easy to add/remove columns by editing the array
- Consistent pattern across all CRUDs
- Clear documentation of table structure

## CRUD Standard Pattern (Based on Companies)

**ALL CRUD modules MUST follow the exact UX/architecture pattern established in `features/companies/`**

This ensures:

- ✅ Consistent user experience across the entire application
- ✅ Mobile-first responsive design (table → cards)
- ✅ Predictable navigation and interactions
- ✅ Maintainable and scalable codebase

### 📋 Required File Structure

```
features/{feature-name}/
├── pages/
│   ├── {feature-name}.page.ts         # Main CRUD page
│   ├── {feature-name}.page.html       # Separate HTML template
│   └── {feature-name}.page.scss       # Separate styles (copy from companies)
├── components/
│   └── {feature-name}-form.component.ts  # Dialog for create/edit
├── services/
│   └── {feature-name}.service.ts      # CRUD service (4 methods)
└── models/
    └── {feature-name}.model.ts        # Types and interfaces
```

### 🎨 HTML Structure (EXACT Pattern)

All CRUD pages MUST follow this structure:

```html
<div class="page-container">
  <!-- 1. Header Section -->
  <header class="page-header">
    <div class="header-content">
      <div class="header-title">
        <h1 class="text-title font-bold text-accent-titles">{Title}</h1>
        <p class="text-subtitle text-neutral-subheading">{Description}</p>
      </div>
      <div class="header-actions">
        <button mat-raised-button class="btn-primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          <span class="hidden sm:inline">Añadir {entity}</span>
          <span class="sm:hidden">Añadir</span>
        </button>
      </div>
    </div>

    <!-- 2. Search Bar -->
    <div class="search-container">
      <mat-form-field class="search-field" appearance="outline">
        <mat-icon matPrefix class="text-neutral-subheading">search</mat-icon>
        <input
          matInput
          [ngModel]="searchTerm()"
          (ngModelChange)="onSearchChange($event)"
          placeholder="Buscar {entities}..."
          class="text-body"
        />
        @if (searchTerm()) {
        <button matSuffix mat-icon-button (click)="clearSearch()">
          <mat-icon>close</mat-icon>
        </button>
        }
      </mat-form-field>
    </div>
  </header>

  <!-- 3. Content Area -->
  <div class="page-content">
    @if (loading()) {
    <!-- Loading State -->
    <div class="loading-container">
      <mat-spinner diameter="48" />
      <p class="text-body text-neutral-subheading mt-4">Cargando {entities}...</p>
    </div>
    } @else if (items().length === 0 && !searchTerm()) {
    <!-- Empty State -->
    <app-empty-state
      icon="{icon}"
      [useMaterialIcon]="true"
      title="No hay {entities} registrados"
      description="Comienza creando {description}"
      actionLabel="Crear primer {entity}"
      (action)="openCreateDialog()"
    />
    } @else if (filteredItems().length === 0 && searchTerm()) {
    <!-- No Results State -->
    <div class="empty-state">
      <div class="empty-icon">
        <mat-icon>search_off</mat-icon>
      </div>
      <h3 class="text-body font-bold text-accent-titles">No se encontraron {entities}</h3>
      <p class="text-subtitle text-neutral-subheading">Intenta con otros términos de búsqueda</p>
      <button mat-stroked-button class="mt-4" (click)="clearSearch()">Limpiar búsqueda</button>
    </div>
    } @else {
    <!-- 4. Desktop Table (hidden on mobile) -->
    <div class="{feature}-table">
      <div class="products-table hidden md:block">
        <table class="table-auto w-full">
          <thead class="table-header">
            <tr>
              <th class="table-th text-left">{Column 1}</th>
              <th class="table-th text-left">{Column 2}</th>
              <!-- More columns -->
              <th class="table-th text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="table-body">
            @for (item of filteredItems(); track item.id) {
            <tr class="table-row">
              <td class="table-td"><!-- Column content --></td>
              <!-- More columns -->
              <td class="table-td text-right">
                <button mat-icon-button [matMenuTriggerFor]="tableMenu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #tableMenu="matMenu">
                  <button mat-menu-item (click)="openEditDialog(item)">
                    <mat-icon>edit</mat-icon>
                    <span>Editar</span>
                  </button>
                  <button mat-menu-item (click)="deleteItem(item)">
                    <mat-icon>delete</mat-icon>
                    <span>Eliminar</span>
                  </button>
                </mat-menu>
              </td>
            </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <mat-paginator
        [length]="totalElements()"
        [pageSize]="pageSize()"
        [pageIndex]="currentPage()"
        [pageSizeOptions]="[5, 10, 25, 50]"
        (page)="onPageChange($event)"
        showFirstLastButtons
      />
    </div>

    <!-- 5. Mobile Cards (hidden on desktop) -->
    <div class="mobile-cards">
      @for (item of filteredItems(); track item.id) {
      <div class="{feature}-card bg-primary-white rounded-lg shadow p-4">
        <div class="card-header">
          <div class="card-title">
            <h3 class="text-body font-bold text-primary-black">{{ item.name }}</h3>
          </div>
          <div class="card-actions">
            <button mat-icon-button [matMenuTriggerFor]="mobileMenu">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #mobileMenu="matMenu">
              <!-- Same actions as desktop -->
            </mat-menu>
          </div>
        </div>
        <div class="card-details">
          <div class="detail-row">
            <mat-icon class="detail-icon">{icon}</mat-icon>
            <span class="detail-label">{Label}:</span>
            <span class="detail-value">{{ item.field }}</span>
          </div>
          <!-- More detail rows -->
        </div>
      </div>
      }
    </div>
    }
  </div>
</div>
```

### 📝 TypeScript Component Pattern

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-{feature}-page',
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    EmptyStateComponent,
  ],
  templateUrl: './{feature}.page.html',
  styleUrl: './{feature}.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {Feature}Page implements OnInit {
  private {feature}Service = inject({Feature}Service);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  // Search and filtering
  searchTerm = signal('');

  // Pagination
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);

  // Data
  items = signal<{Type}[]>([]);
  loading = signal(true);

  // Filtered items based on search
  filteredItems = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    if (!search) {
      return this.items();
    }
    return this.items().filter((item) => {
      // Filter logic for multiple fields
      return (
        item.field1.toLowerCase().includes(search) ||
        item.field2.toLowerCase().includes(search)
      );
    });
  });

  // ✅ REQUIRED: displayedColumns array
  displayedColumns: string[] = ['col1', 'col2', 'col3', 'actions'];

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.loading.set(true);
    this.{feature}Service.get{Items}().subscribe({
      next: (response) => {
        this.items.set(response ?? []);
        this.totalElements.set(response.length ?? 0);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading {items}:', error);
        this.notification.error('Error al cargar {items}');
        this.items.set([]);
        this.totalElements.set(0);
        this.loading.set(false);
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open({Feature}FormComponent, {
      width: '100%',
      maxWidth: '600px',
      data: { mode: 'create' },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.mode === 'create') {
        this.createItem(result.data);
      }
    });
  }

  openEditDialog(item: {Type}): void {
    const dialogRef = this.dialog.open({Feature}FormComponent, {
      width: '100%',
      maxWidth: '600px',
      data: { mode: 'edit', {item}: item },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.mode === 'edit') {
        this.updateItem(item.id, result.data);
      }
    });
  }

  deleteItem(item: {Type}): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Eliminar {entity}?',
        message: `Esta acción eliminará permanentemente "${item.name}".`,
        confirmText: 'Eliminar',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.performDelete(item.id);
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    // Future: call loadItems() with pagination params
  }

  private createItem(data: Create{Type}Request): void {
    this.{feature}Service.create{Item}(data).subscribe({
      next: () => {
        this.notification.success('{Entity} creado correctamente');
        this.loadItems();
      },
      error: (error) => {
        console.error('Error creating {item}:', error);
        this.notification.error('Error al crear {entity}');
      },
    });
  }

  private updateItem(id: string, data: Update{Type}Request): void {
    this.{feature}Service.update{Item}(id, data).subscribe({
      next: () => {
        this.notification.success('{Entity} actualizado correctamente');
        this.loadItems();
      },
      error: (error) => {
        console.error('Error updating {item}:', error);
        this.notification.error('Error al actualizar {entity}');
      },
    });
  }

  private performDelete(id: string): void {
    this.{feature}Service.delete{Item}(id).subscribe({
      next: () => {
        this.notification.success('{Entity} eliminado correctamente');
        this.loadItems();
      },
      error: (error) => {
        console.error('Error deleting {item}:', error);
        this.notification.error('Error al eliminar {entity}');
      },
    });
  }
}
```

### 🎨 SCSS Pattern (Copy from Companies)

**ALWAYS copy the SCSS from `companies.page.scss` and only change:**

- Class names: `.companies-table` → `.{feature}-table`
- Class names: `.company-card` → `.{feature}-card`

The SCSS includes:

- ✅ Mobile-first responsive design
- ✅ Desktop table styles (hidden on mobile)
- ✅ Mobile cards (hidden on desktop)
- ✅ Pachamama color scheme
- ✅ Loading, empty, and error states
- ✅ Hover effects and transitions
- ✅ Tailwind @apply utilities

### 🔧 Service Pattern (4 Required Methods)

```typescript
@Injectable({ providedIn: 'root' })
export class {Feature}Service {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/{feature-plural}`;

  get{Items}(): Observable<{Type}[]> {
    return this.http.get<{Type}[]>(this.apiUrl);
  }

  create{Item}(data: Create{Type}Request): Observable<{Type}> {
    return this.http.post<{Type}>(this.apiUrl, data);
  }

  update{Item}(id: string, data: Update{Type}Request): Observable<{Type}> {
    return this.http.put<{Type}>(`${this.apiUrl}/${id}`, data);
  }

  delete{Item}(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
```

### 💬 Dialog/Form Component Pattern

- Use `MatDialog` with `maxWidth: '600px'`
- Pass `{ mode: 'create' | 'edit', item?: T }` as data
- Use `disableClose: true` to prevent accidental closes
- Return `{ mode, data }` on close
- Use Reactive Forms with validation
- Show loading state with `mat-spinner` on save button

### ✅ CRUD Checklist

Before marking a CRUD as complete, verify:

**Structure:**

- [ ] Files organized: pages/, components/, services/, models/
- [ ] Page separated into .ts, .html, .scss
- [ ] SCSS copied from companies.page.scss

**HTML:**

- [ ] Uses `<div class="page-container">` wrapper
- [ ] Has page-header with title + subtitle + create button
- [ ] Has search-container with MatFormField
- [ ] Shows loading state with mat-spinner
- [ ] Shows empty state with app-empty-state component
- [ ] Shows "no results" state when search has no matches
- [ ] Desktop table with `.{feature}-table` class (hidden md:block)
- [ ] Mobile cards with `.mobile-cards` class (visible on mobile only)
- [ ] MatPaginator with standard config

**TypeScript:**

- [ ] Uses signals: searchTerm, loading, items, currentPage, pageSize, totalElements
- [ ] Has computed signal: filteredItems
- [ ] Has displayedColumns array
- [ ] Methods: loadItems, openCreateDialog, openEditDialog, deleteItem
- [ ] Methods: onSearchChange, clearSearch, onPageChange
- [ ] Private methods with typed parameters (not `any`)
- [ ] Imports NotificationService, ConfirmDialogComponent, EmptyStateComponent
- [ ] Uses ChangeDetectionStrategy.OnPush

**Service:**

- [ ] Has all 4 CRUD methods: get, create, update, delete
- [ ] Methods properly typed (no `any`)
- [ ] Uses environment.apiUrl

**UX:**

- [ ] Search filters multiple fields with debounce
- [ ] Delete confirmation uses ConfirmDialogComponent
- [ ] Success/error notifications via NotificationService
- [ ] Responsive: table on desktop, cards on mobile
- [ ] Loading states during operations
- [ ] Empty states with helpful messages and CTAs

**Reference:** `features/companies/` is the AUTHORITATIVE implementation

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

## Notifications & Dialogs Best Practices

### ✅ Use Centralized Services (DO)

**Always use `NotificationService` for user feedback** instead of `MatSnackBar` directly:

```typescript
// ✅ CORRECT - Use NotificationService
import { NotificationService } from '@core/services/notification.service';

export class MyComponent {
  private notification = inject(NotificationService);

  saveData(): void {
    this.service.save().subscribe({
      next: () => this.notification.success('Datos guardados correctamente'),
      error: () => this.notification.error('Error al guardar datos'),
    });
  }
}
```

```typescript
// ❌ INCORRECT - Don't use MatSnackBar directly
import { MatSnackBar } from '@angular/material/snack-bar';

export class MyComponent {
  private snackBar = inject(MatSnackBar);

  saveData(): void {
    this.snackBar.open('Datos guardados', 'Cerrar', { duration: 3000 }); // ❌ NO
  }
}
```

**NotificationService API**:

- `notification.success(message)` - Success notifications (green, 4s)
- `notification.error(message)` - Error notifications (red, 6s)
- `notification.warning(message)` - Warning notifications (orange, 5s)
- `notification.info(message)` - Info notifications (blue, 4s)

### ✅ Use ConfirmDialogComponent for Confirmations (DO)

**Always use `ConfirmDialogComponent`** for delete/destructive actions instead of `confirm()`:

```typescript
// ✅ CORRECT - Use ConfirmDialogComponent
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

export class MyComponent {
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  deleteItem(item: Item): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Eliminar elemento?',
        message: `Esta acción eliminará permanentemente "${item.name}".`,
        confirmText: 'Eliminar',
        type: 'danger', // 'danger' | 'warning' | 'info'
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.service.delete(item.id).subscribe({
          next: () => this.notification.success('Elemento eliminado'),
          error: () => this.notification.error('Error al eliminar'),
        });
      }
    });
  }
}
```

```typescript
// ❌ INCORRECT - Don't use native confirm()
deleteItem(item: Item): void {
  if (confirm('¿Estás seguro?')) { // ❌ NO - Not styled, no control
    this.service.delete(item.id).subscribe();
  }
}
```

**Why?**

- ✅ Consistent UI/UX across the app
- ✅ Styled with Material Design
- ✅ Customizable (title, message, button text)
- ✅ Different types for different severities
- ✅ Accessible and responsive

### Import Checklist

When working with notifications and dialogs:

```typescript
// Required imports
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

export class MyComponent {
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
}
```

**Never import**:

- ❌ `MatSnackBar` or `MatSnackBarModule` - Use `NotificationService` instead
- ❌ Don't use `window.confirm()` or `window.alert()` - Use `ConfirmDialogComponent`

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
// Used in: products/, companies/, brigades/
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
