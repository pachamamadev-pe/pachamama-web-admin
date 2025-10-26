import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para formatear montos en Soles peruanos (PEN).
 * Uso: {{ amount | currencySol }}
 * Ejemplo: 1500.50 → S/ 1,500.50
 */
@Pipe({
  name: 'currencySol',
  standalone: true,
})
export class CurrencySolPipe implements PipeTransform {
  transform(value: number | null | undefined, decimals = 2): string {
    if (value === null || value === undefined || isNaN(value)) {
      return 'S/ 0.00';
    }

    const formatted = value.toLocaleString('es-PE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return `S/ ${formatted}`;
  }
}
