import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

/**
 * Marca todos los controles de un FormGroup como touched.
 * Útil para mostrar errores de validación después de intentar submit.
 */
export function markFormGroupTouched(formGroup: FormGroup | FormArray): void {
  Object.keys(formGroup.controls).forEach((key) => {
    const control = formGroup.get(key);

    if (control instanceof FormGroup || control instanceof FormArray) {
      markFormGroupTouched(control);
    } else {
      control?.markAsTouched();
    }
  });
}

/**
 * Obtiene los mensajes de error de un control.
 * @param control Control del formulario
 * @param fieldName Nombre del campo (para mensajes personalizados)
 * @returns Array de mensajes de error
 */
export function getControlErrors(control: AbstractControl | null, fieldName = 'Campo'): string[] {
  if (!control || !control.errors) {
    return [];
  }

  const errors: string[] = [];

  if (control.errors['required']) {
    errors.push(`${fieldName} es obligatorio`);
  }

  if (control.errors['email']) {
    errors.push(`${fieldName} debe ser un email válido`);
  }

  if (control.errors['minlength']) {
    const minLength = control.errors['minlength'].requiredLength;
    errors.push(`${fieldName} debe tener al menos ${minLength} caracteres`);
  }

  if (control.errors['maxlength']) {
    const maxLength = control.errors['maxlength'].requiredLength;
    errors.push(`${fieldName} no puede exceder ${maxLength} caracteres`);
  }

  if (control.errors['min']) {
    const min = control.errors['min'].min;
    errors.push(`${fieldName} debe ser mayor o igual a ${min}`);
  }

  if (control.errors['max']) {
    const max = control.errors['max'].max;
    errors.push(`${fieldName} debe ser menor o igual a ${max}`);
  }

  if (control.errors['pattern']) {
    errors.push(`${fieldName} tiene un formato inválido`);
  }

  if (control.errors['uniqueCode']) {
    errors.push(`Este código ya está en uso`);
  }

  if (control.errors['ruc']) {
    errors.push(`RUC debe tener 11 dígitos`);
  }

  if (control.errors['dni']) {
    errors.push(`DNI debe tener 8 dígitos`);
  }

  if (control.errors['positiveNumber']) {
    errors.push(`${fieldName} debe ser un número positivo`);
  }

  if (control.errors['dateRange']) {
    errors.push(`La fecha de inicio debe ser anterior a la fecha de fin`);
  }

  return errors;
}

/**
 * Resetea un formulario a su estado inicial.
 */
export function resetForm(formGroup: FormGroup, defaultValues?: Record<string, unknown>): void {
  formGroup.reset(defaultValues || {});
  formGroup.markAsUntouched();
  formGroup.markAsPristine();
}

/**
 * Verifica si un control tiene errores y ha sido tocado.
 */
export function hasError(control: AbstractControl | null): boolean {
  return !!(control && control.invalid && (control.dirty || control.touched));
}

/**
 * Obtiene el primer mensaje de error de un control.
 */
export function getFirstError(control: AbstractControl | null, fieldName = 'Campo'): string | null {
  const errors = getControlErrors(control, fieldName);
  return errors.length > 0 ? errors[0] : null;
}
