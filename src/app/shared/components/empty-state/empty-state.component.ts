import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Componente para mostrar un estado vacío cuando no hay datos.
 * Se usa en listas vacías de productos, comunidades, brigadas, etc.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div
      class="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed border-neutral-border bg-gray-50/50 p-8 text-center sm:p-12"
    >
      <!-- Icon/Illustration -->
      @if (useMaterialIcon()) {
        <mat-icon class="!text-[96px] !w-24 !h-24 opacity-50 text-neutral-subheading">
          {{ icon() }}
        </mat-icon>
      } @else {
        <div class="text-6xl opacity-50 sm:text-7xl">
          {{ icon() }}
        </div>
      }

      <!-- Title -->
      <h3 class="font-bold text-accent-titles">
        {{ title() }}
      </h3>

      <!-- Message -->
      @if (message()) {
        <p class="max-w-md text-sm text-neutral-subheading sm:text-body">
          {{ message() }}
        </p>
      }

      <!-- Action Button -->
      @if (actionLabel()) {
        <button mat-raised-button color="primary" (click)="action.emit()" class="mt-4">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  icon = input<string>('📦');
  title = input<string>('No hay datos disponibles');
  message = input<string>('');
  actionLabel = input<string>('');
  useMaterialIcon = input<boolean>(false); // true para Material Icons, false para emojis

  action = output<void>();
}
