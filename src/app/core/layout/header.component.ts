import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { LayoutService } from './layout.service';
import { AuthService } from '../auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
  ],
  styleUrl: './header.component.scss',
  template: `
    <header
      class="sticky top-0 header-container z-10 flex h-16 items-center justify-between gap-4 border-b border-neutral-border bg-primary-white/95 px-4 backdrop-blur-sm md:px-6"
    >
      <!-- Left side: Menu button + Title -->
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <button
          mat-icon-button
          (click)="layoutService.toggleSidebar()"
          class="menu-button"
          aria-label="Abrir menú de navegación"
        >
          <mat-icon>menu</mat-icon>
        </button>
        <h2 class="truncate text-lg font-bold text-accent-titles md:text-xl">{{ title() }}</h2>
      </div>

      <!-- Right side: Search + Actions -->
      <div class="flex shrink-0 items-center gap-3">
        <!-- Search (hidden on mobile) -->
        <mat-form-field
          appearance="outline"
          class="header-search-field hidden w-[280px] lg:block"
          subscriptSizing="dynamic"
        >
          <mat-icon matPrefix class="text-neutral-subheading">search</mat-icon>
          <input
            matInput
            type="search"
            [placeholder]="placeholder()"
            (input)="onSearch($event)"
            class="text-sm"
          />
        </mat-form-field>

        <!-- Action buttons -->
        <div class="flex items-center gap-2">
          <!-- Notifications Button -->
          <button
            mat-icon-button
            [matBadge]="notificationCount()"
            matBadgeColor="warn"
            [matBadgeHidden]="notificationCount() === 0"
            matBadgeSize="small"
            aria-label="Notificaciones"
            (click)="action.emit('notifications')"
          >
            <mat-icon>notifications</mat-icon>
          </button>

          <!-- User Profile Button with Menu -->
          <button
            mat-icon-button
            [matMenuTriggerFor]="userMenu"
            aria-label="Menú de usuario"
            class="overflow-hidden"
          >
            <img
              class="h-full w-full rounded-full object-cover"
              src="https://i.pravatar.cc/40"
              alt="Avatar"
            />
          </button>

          <!-- User Menu -->
          <mat-menu #userMenu="matMenu" xPosition="before">
            <div class="px-4 py-3 border-b border-neutral-border">
              <p class="text-sm font-semibold text-accent-titles">
                {{ authService.currentUser()?.email || 'Usuario' }}
              </p>
              <p class="text-xs text-neutral-subheading mt-1">Pachamama Platform</p>
            </div>
            <button mat-menu-item (click)="onProfile()">
              <mat-icon>person</mat-icon>
              <span>Mi perfil</span>
            </button>
            <button mat-menu-item (click)="onSettings()">
              <mat-icon>settings</mat-icon>
              <span>Configuración</span>
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="onLogout()">
              <mat-icon class="text-red-600">logout</mat-icon>
              <span class="text-red-600">Cerrar sesión</span>
            </button>
          </mat-menu>
        </div>
      </div>
    </header>
  `,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly layoutService = inject(LayoutService);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);
  readonly destroyRef = inject(DestroyRef);

  placeholder = input('Buscar…');

  searchQuery = output<string>();
  action = output<'notifications'>();
  profile = output<void>();

  title = signal('Inicio');
  notificationCount = signal(3); // TODO: Conectar con servicio de notificaciones real

  constructor() {
    // Suscribirse a los cambios de navegación
    this.router.events
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      )
      .subscribe(() => this.updateTitle());
  }

  private updateTitle(): void {
    let route: ActivatedRouteSnapshot = this.router.routerState.snapshot.root;

    // Recorrer hasta la ruta hija más profunda
    while (route.firstChild) {
      route = route.firstChild;
    }

    // Intentar obtener el título de diferentes fuentes
    const title = route.title || route.data['title'] || 'Inicio';

    console.log('Route snapshot:', route);
    console.log('Title found:', title);

    this.title.set(title);
  }

  onSearch(evt: Event) {
    const term = (evt.target as HTMLInputElement)?.value ?? '';
    this.searchQuery.emit(term);
  }

  /**
   * Navigate to user profile
   */
  onProfile(): void {
    this.router.navigate(['/profile']);
  }

  /**
   * Navigate to settings
   */
  onSettings(): void {
    this.router.navigate(['/settings']);
  }

  /**
   * Logout user and redirect to login page
   */
  async onLogout(): Promise<void> {
    await this.authService.logout();
  }
}
