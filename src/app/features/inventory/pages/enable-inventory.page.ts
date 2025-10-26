import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-enable-inventory-page',
  template: `<div class="space-y-4">
    <h2 class="text-xl font-semibold">Habilitar Inventario</h2>
    <button class="px-3 py-2 bg-brand-600 text-white rounded">Habilitar</button>
  </div>`,
})
export class EnableInventoryPage {}
