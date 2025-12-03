# RucValidatorComponent

Componente reutilizable para validar números RUC con la API de SUNAT.

## Características

✅ Validación en tiempo real con API de SUNAT
✅ UI consistente con el diseño Pachamama
✅ Manejo de estados: loading, error, success
✅ Personalizable mediante inputs
✅ Totalmente reactivo con signals
✅ Responsive (mobile-first)

## Uso Básico

```typescript
import {
  RucValidatorComponent,
  RucValidationResult,
} from '@shared/components/ruc-validator/ruc-validator.component';

@Component({
  imports: [RucValidatorComponent],
  template: ` <app-ruc-validator (rucValidated)="onRucValidated($event)" /> `,
})
export class MyComponent {
  onRucValidated(result: RucValidationResult): void {
    console.log('RUC:', result.ruc);
    console.log('Razón Social:', result.businessName);
    console.log('Dirección:', result.address);
  }
}
```

## Inputs

| Input             | Tipo      | Default           | Descripción                                  |
| ----------------- | --------- | ----------------- | -------------------------------------------- |
| `entityType`      | `string`  | `'de la empresa'` | Tipo de entidad para mensajes personalizados |
| `entityLabel`     | `string`  | `'de la Empresa'` | Label para el campo RUC                      |
| `showResetButton` | `boolean` | `true`            | Mostrar botón para resetear validación       |
| `successMessage`  | `string`  | `''`              | Mensaje personalizado de éxito               |

## Outputs

| Output            | Tipo                  | Descripción                                  |
| ----------------- | --------------------- | -------------------------------------------- |
| `rucValidated`    | `RucValidationResult` | Emite cuando el RUC es validado exitosamente |
| `validationReset` | `void`                | Emite cuando se resetea la validación        |

## Interface RucValidationResult

```typescript
interface RucValidationResult {
  ruc: string; // RUC validado
  businessName?: string; // Razón social (limpia)
  tradeName?: string; // Nombre comercial (limpia)
  address?: string; // Dirección fiscal (limpia)
  legalRepresentatives?: string; // Representantes legales (procesados)
  sunatData?: SunatData; // Datos completos de SUNAT
}
```

## Ejemplo Personalizado

```typescript
@Component({
  template: `
    <app-ruc-validator
      entityType="de la comunidad"
      entityLabel="de la Comunidad"
      [showResetButton]="false"
      successMessage="RUC validado. Completa los datos restantes."
      (rucValidated)="onRucValidated($event)"
    />
  `,
})
export class CommunityForm {
  onRucValidated(result: RucValidationResult): void {
    this.form.patchValue({
      ruc: result.ruc,
      name: result.businessName,
      address: result.address,
    });
  }
}
```

## Métodos Públicos

### `getRucValue(): string`

Obtiene el valor actual del RUC ingresado.

### `setValidated(validated: boolean): void`

Establece manualmente el estado de validación (útil para modo edición).

### `resetValidation(): void`

Reinicia el componente al estado inicial.

## Estilos

El componente usa:

- Colores del sistema de diseño Pachamama (`#218358`, `#f4fbf6`)
- Animaciones suaves (fade-in)
- Responsive con Tailwind breakpoints
- Material Icons

## Estados Visuales

1. **Inicial**: Input de RUC + botón "Validar RUC"
2. **Loading**: Spinner + botón deshabilitado
3. **Error**: Banner rojo con mensaje de error
4. **Success**: Banner verde con información de validación exitosa

## Notas Técnicas

- Usa `RucValidationService` para la llamada a SUNAT
- Limpia valores "-" que vienen de la API
- Procesa arrays de representantes legales automáticamente
- Validación con `rucValidator()` custom
- Change Detection: `OnPush` para mejor performance
