import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from './layout.service';

export interface NavItem {
  label: string;
  icon?: string; // reserved for future icon component
  to?: string;
  badge?: string;
}

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-full flex-col bg-nav-bg">
      <!-- Header with logo and close button (mobile) -->
      <div
        class="flex h-14 shrink-0 items-center justify-between border-b border-neutral-border px-4 sm:h-16"
      >
        <div class="flex min-w-0 flex-1 items-center">
          <img src="/images/logo/logo.svg" alt="Pachamama" class="h-6 w-auto sm:h-7" />
        </div>
        <button
          (click)="layoutService.hideSidebar()"
          class="ml-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-subheading hover:bg-primary-black/5 lg:hidden"
          aria-label="Cerrar menú"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-5 w-5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        @for (i of items(); track i.label) {
          <a
            [routerLink]="i.to"
            routerLinkActive="nav-link-active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="nav-link"
            [attr.aria-label]="i.label"
            (click)="onNavItemClick()"
          >
            <span class="w-6 text-center text-lg">{{ i.icon }}</span>
            <span class="truncate">{{ i.label }}</span>
            @if (i.badge) {
              <span class="badge ml-auto">{{ i.badge }}</span>
            }
          </a>
        }
      </nav>

      <!-- Footer (optional) -->
      <div class="shrink-0 border-t border-neutral-border p-3">
        <div class="text-xs text-neutral-subheading">
          <p class="font-medium">Empresa Demo</p>
          <p class="mt-0.5">Sprint 1 • v0.1.0</p>
        </div>
      </div>
    </div>
  `,
  host: {
    class: 'block h-full',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly layoutService = inject(LayoutService);

  items = input<NavItem[]>([
    { label: 'Inicio', to: '/home', icon: '🏠' },
    { label: 'Mis productos', to: '/products', icon: '🌱' },
    { label: 'Empresas', to: '/companies', icon: '🏢' },
    { label: 'Reportes', to: '/projects', icon: '📊' },
    { label: 'Mapa recolección aprobada', to: '/communities', icon: '🗺️' },
    { label: 'Configuración', to: '/brigades', icon: '⚙️' },
  ]);

  onNavItemClick(): void {
    // Close sidebar on mobile after clicking a nav item
    if (window.innerWidth < 1024) {
      this.layoutService.hideSidebar();
    }
  }
}
