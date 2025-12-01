import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

@Injectable({
  providedIn: 'root',
})
export class CustomPaginatorIntlService extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Elementos por página:';
  override nextPageLabel = 'Siguiente página';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel = 'Primera página';
  override lastPageLabel = 'Última página';

  // Personaliza el rango de elementos
  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return `0 de ${length}`;
    }
    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, length);
    return `${startIndex + 1} - ${endIndex} de ${length}`;
  };
}
