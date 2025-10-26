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
import { LayoutService } from './layout.service';

@Component({
  standalone: true,
  selector: 'app-header',
  template: `
    <header
      class="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 border-b border-neutral-border bg-primary-white/95 px-3 backdrop-blur-sm sm:h-16 sm:gap-4 sm:px-4 md:px-6"
    >
      <!-- Left side: Menu button + Title -->
      <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          (click)="layoutService.toggleSidebar()"
          class="flex size-9 shrink-0 items-center justify-center rounded-lg text-accent-titles hover:bg-secondary-light lg:hidden"
          aria-label="Abrir menú de navegación"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-5 w-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
        <h1 class="truncate font-bold text-accent-titles">{{ title() }}</h1>
      </div>

      <!-- Right side: Search + Actions -->
      <div class="flex shrink-0 items-center gap-2 sm:gap-3">
        <!-- Search (hidden on mobile) -->
        <div class="hidden w-full max-w-[280px] lg:block">
          <label class="relative block">
            <span class="absolute inset-y-0 left-2.5 flex items-center text-neutral-subheading">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-4 w-4"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </span>
            <input
              type="search"
              class="w-full rounded-lg border border-neutral-border bg-primary-white py-1.5 pl-8 pr-3 text-sm transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              [placeholder]="placeholder()"
              (input)="onSearch($event)"
            />
          </label>
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-1.5 sm:gap-2">
          <button
            class="flex size-9 items-center justify-center rounded-lg border border-neutral-border bg-primary-white text-lg transition-colors hover:bg-secondary-light active:scale-95"
            aria-label="Notificaciones"
            (click)="action.emit('notifications')"
          >
            <span class="text-base">🔔</span>
          </button>
          <button
            class="flex items-center gap-2 rounded-lg transition-colors hover:bg-secondary-light active:scale-95 sm:px-2 sm:py-1"
            (click)="profile.emit()"
            aria-label="Perfil de usuario"
          >
            <img
              class="size-8 rounded-full ring-2 ring-neutral-border"
              src="https://i.pravatar.cc/32"
              alt="Avatar"
            />
          </button>
        </div>
      </div>
    </header>
  `,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly layoutService = inject(LayoutService);
  readonly router = inject(Router);
  readonly destroyRef = inject(DestroyRef);

  placeholder = input('Buscar…');

  search = output<string>();
  action = output<'notifications'>();
  profile = output<void>();

  title = signal('Inicio');

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
    this.search.emit(term);
  }
}
