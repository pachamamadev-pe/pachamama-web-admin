import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { HeaderComponent } from './header.component';
import { LoadingComponent } from './loading.component';
import { LayoutService } from './layout.service';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, LoadingComponent],
  template: `
    <div
      class="h-screen w-full max-w-full overflow-hidden bg-gray-50 lg:grid"
      [style.gridTemplateColumns]="
        layoutService.isSidebarCollapsed() ? '88px minmax(0, 1fr)' : '280px minmax(0, 1fr)'
      "
    >
      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-20 w-72 -translate-x-full transform transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:w-full lg:translate-x-0"
        [class.translate-x-0]="layoutService.isSidebarVisible()"
      >
        <app-sidebar />
      </aside>

      <!-- Overlay for mobile -->
      @if (layoutService.isSidebarVisible()) {
        <div
          (click)="layoutService.hideSidebar()"
          class="fixed inset-0 z-10 bg-primary-black/50 backdrop-blur-sm transition-opacity lg:hidden"
          role="button"
          tabindex="0"
          (keydown.escape)="layoutService.hideSidebar()"
          aria-label="Cerrar menú"
        ></div>
      }

      <!-- Main content -->
      <main class="flex h-screen min-w-0 flex-col overflow-hidden bg-gray-50">
        <app-header />
        <section class="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <router-outlet />
        </section>
      </main>
    </div>

    <!-- Global Loading Spinner -->
    <app-loading />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  readonly layoutService = inject(LayoutService);
}
