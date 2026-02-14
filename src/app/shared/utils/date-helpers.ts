/**
 * Formatea una fecha en formato DD/MM/YYYY.
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return '';

  const d = parseDateValue(date);
  if (!d) return '';

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Parsea una fecha en string a Date sin desfase por zona horaria.
 *
 * Nota importante: en JS, `new Date('YYYY-MM-DD')` se interpreta como UTC.
 * En zonas horarias negativas (ej. America/Lima), eso se muestra como el día anterior.
 * Para strings "date-only" usamos Date(year, monthIndex, day) (hora local).
 */
export function parseDateValue(value: Date | string | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  const raw = value.trim();
  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);

    const localDate = new Date(year, month - 1, day);
    return isNaN(localDate.getTime()) ? null : localDate;
  }

  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formatea una fecha en formato ISO (YYYY-MM-DD) para inputs de tipo date.
 */
export function formatDateISO(date: Date | string | null): string {
  if (!date) return '';

  const d = parseDateValue(date);
  if (!d) return '';

  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha con hora en formato DD/MM/YYYY HH:mm.
 */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return '';

  const d = parseDateValue(date);
  if (!d) return '';

  const dateStr = formatDate(d);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * Calcula la diferencia en días entre dos fechas.
 */
export function daysBetween(startDate: Date | string, endDate: Date | string): number {
  const start = parseDateValue(startDate) ?? new Date(NaN);
  const end = parseDateValue(endDate) ?? new Date(NaN);

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Verifica si una fecha es anterior a otra.
 */
export function isDateBefore(date1: Date | string, date2: Date | string): boolean {
  const d1 = parseDateValue(date1);
  const d2 = parseDateValue(date2);

  if (!d1 || !d2) return false;

  return d1.getTime() < d2.getTime();
}

/**
 * Verifica si una fecha es hoy.
 */
export function isToday(date: Date | string): boolean {
  const d = parseDateValue(date);
  if (!d) return false;
  const today = new Date();

  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Obtiene la fecha de hace N días.
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Obtiene la fecha dentro de N días.
 */
export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
