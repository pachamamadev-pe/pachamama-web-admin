import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LayoutService } from './layout.service';

export interface NavItem {
  label: string;
  icon: string; // Material icon name
  to?: string;
  badge?: string;
}

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatRippleModule,
    MatTooltipModule,
  ],
  styleUrl: './sidebar.component.scss',
  template: `
    <div class="sidebar-container">
      <!-- Header -->
      <div class="sidebar-header">
        <div class="logo-container">
          <img src="/images/logo/logo.svg" alt="Pachamama" />
        </div>
        <!-- Close button (mobile only) -->
        <button
          mat-icon-button
          (click)="layoutService.hideSidebar()"
          class="close-button"
          aria-label="Cerrar menú"
        >
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        <div class="nav-section">
          <div class="nav-items">
            @for (item of items(); track item.label) {
              <a
                [routerLink]="item.to"
                routerLinkActive="nav-link-active"
                [routerLinkActiveOptions]="{ exact: item.to === '/home' }"
                class="nav-link"
                matRipple
                [matRippleColor]="'rgba(33, 131, 88, 0.1)'"
                [attr.aria-label]="item.label"
                (click)="onNavItemClick()"
              >
                <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
                <span class="nav-label">{{ item.label }}</span>
                @if (item.badge) {
                  <span class="nav-badge">{{ item.badge }}</span>
                }
              </a>
            }
          </div>
        </div>
      </nav>

      <!-- Footer -->
      <div class="sidebar-footer">
        <div class="footer-content">
          <div class="footer-avatar">P</div>
          <div class="footer-info">
            <div class="footer-name">Pachamama</div>
            <div class="footer-version">v0.1.0 • 2025</div>
          </div>
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
    { label: 'Inicio', to: '/home', icon: 'home' },
    { label: 'Mis productos', to: '/products', icon: 'eco' },
    { label: 'Empresas', to: '/companies', icon: 'business' },
    { label: 'Reportes', to: '/projects', icon: 'assessment' },
    { label: 'Mapa recolección', to: '/communities', icon: 'map' },
    { label: 'Configuración', to: '/brigades', icon: 'settings' },
  ]);

  onNavItemClick(): void {
    // Close sidebar on mobile after clicking a nav item
    if (window.innerWidth < 1024) {
      this.layoutService.hideSidebar();
    }
  }
}
