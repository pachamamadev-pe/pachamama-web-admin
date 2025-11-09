import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { HeaderComponent } from './header.component';
import { LayoutService } from './layout.service';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="min-h-screen bg-gray-50 lg:grid lg:grid-cols-[280px_1fr]">
      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-20 w-72 -translate-x-full transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0"
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
      <main class="flex min-h-screen flex-col bg-gray-50">
        <app-header />
        <section class="flex-1 p-4 sm:p-6 lg:p-8">
          <router-outlet />
        </section>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  readonly layoutService = inject(LayoutService);
}
