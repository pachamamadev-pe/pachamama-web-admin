import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-home-page',
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="font-bold text-accent-titles">Bienvenido</h1>
        <p class="mt-1 text-sm text-neutral-subheading sm:text-body">
          Panel de administración de Pachamama
        </p>
      </div>

      <!-- Stats Grid -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          class="rounded-lg border border-neutral-border bg-primary-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-subheading">Total Productos</p>
              <p class="mt-2 text-2xl font-bold text-accent-titles sm:text-3xl">24</p>
            </div>
            <div class="text-3xl sm:text-4xl">🌱</div>
          </div>
        </div>

        <div
          class="rounded-lg border border-neutral-border bg-primary-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-subheading">Comunidades</p>
              <p class="mt-2 text-2xl font-bold text-accent-titles sm:text-3xl">8</p>
            </div>
            <div class="text-3xl sm:text-4xl">🏘️</div>
          </div>
        </div>

        <div
          class="rounded-lg border border-neutral-border bg-primary-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-subheading">Proyectos Activos</p>
              <p class="mt-2 text-2xl font-bold text-accent-titles sm:text-3xl">12</p>
            </div>
            <div class="text-3xl sm:text-4xl">📊</div>
          </div>
        </div>

        <div
          class="rounded-lg border border-neutral-border bg-primary-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-subheading">Brigadas</p>
              <p class="mt-2 text-2xl font-bold text-accent-titles sm:text-3xl">5</p>
            </div>
            <div class="text-3xl sm:text-4xl">👥</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="rounded-lg border border-neutral-border bg-primary-white p-4 sm:p-6">
        <h2 class="mb-4 font-bold text-accent-titles">Acciones rápidas</h2>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button class="btn-primary justify-center">Nuevo Producto</button>
          <button class="btn-secondary justify-center">Crear Comunidad</button>
          <button class="btn-secondary justify-center">Ver Reportes</button>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="rounded-lg border border-neutral-border bg-primary-white p-4 sm:p-6">
        <h2 class="mb-4 font-bold text-accent-titles">Actividad reciente</h2>
        <div class="space-y-3">
          <div class="flex items-start gap-3 border-b border-neutral-border pb-3 last:border-0">
            <span class="text-xl">🌱</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-accent-titles sm:text-body">
                Nuevo producto registrado
              </p>
              <p class="mt-0.5 text-xs text-neutral-subheading sm:text-sm">Hace 2 horas</p>
            </div>
          </div>
          <div class="flex items-start gap-3 border-b border-neutral-border pb-3 last:border-0">
            <span class="text-xl">📊</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-accent-titles sm:text-body">
                Reporte generado
              </p>
              <p class="mt-0.5 text-xs text-neutral-subheading sm:text-sm">Hace 5 horas</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-xl">👥</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-accent-titles sm:text-body">
                Nueva brigada creada
              </p>
              <p class="mt-0.5 text-xs text-neutral-subheading sm:text-sm">Ayer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {}
