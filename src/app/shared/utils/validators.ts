import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator para códigos únicos.
 * Verifica que el valor no esté en la lista de códigos existentes.
 */
export function uniqueCodeValidator(existingCodes: string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const isDuplicate = existingCodes.includes(control.value.trim());
    return isDuplicate ? { uniqueCode: { value: control.value } } : null;
  };
}

/**
 * Validator para RUC peruano (11 dígitos).
 */
export function rucValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const ruc = control.value.toString().trim();
    const rucPattern = /^\d{11}$/;

    if (!rucPattern.test(ruc)) {
      return { ruc: { value: control.value } };
    }

    return null;
  };
}

/**
 * Validator para DNI peruano (8 dígitos).
 */
export function dniValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const dni = control.value.toString().trim();
    const dniPattern = /^\d{8}$/;

    if (!dniPattern.test(dni)) {
      return { dni: { value: control.value } };
    }

    return null;
  };
}

/**
 * Validator para números positivos.
 */
export function positiveNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value && control.value !== 0) {
      return null;
    }

    const value = Number(control.value);

    if (isNaN(value) || value <= 0) {
      return { positiveNumber: { value: control.value } };
    }

    return null;
  };
}

/**
 * Validator para rangos de fechas.
 * Verifica que la fecha de inicio sea anterior a la fecha de fin.
 */
export function dateRangeValidator(startDateKey: string, endDateKey: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const formGroup = control as any;
    const startDate = formGroup.get(startDateKey)?.value;
    const endDate = formGroup.get(endDateKey)?.value;

    if (!startDate || !endDate) {
      return null;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return { dateRange: { startDate, endDate } };
    }

    return null;
  };
}
