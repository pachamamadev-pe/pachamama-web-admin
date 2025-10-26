import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-areas-import-page',
  template: `<div class="space-y-4">
    <h2 class="text-xl font-semibold">Importar Geomalla</h2>
    <p class="text-sm text-gray-600">HU-012: Acepta .geojson/.kml/.topojson/.zip</p>
    <!-- TODO: input de archivo + preview/resumen -->
  </div> `,
})
export class AreasImportPage {}
