import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para truncar texto largo y agregar puntos suspensivos.
 * Uso: {{ longText | truncate:50 }}
 * Ejemplo: "Este es un texto muy largo..." → "Este es un texto muy..."
 */
@Pipe({
  name: 'truncate',
  standalone: true,
})
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, limit = 50, ellipsis = '...'): string {
    if (!value) {
      return '';
    }

    if (value.length <= limit) {
      return value;
    }

    return value.substring(0, limit).trim() + ellipsis;
  }
}
