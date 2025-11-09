# Shared Components

Este directorio contiene componentes reutilizables que se usan en múltiples features de la aplicación.

## 📊 Chart Components (Chart.js)

### SparklineChartComponent

Componente de mini gráfico (sparkline) para mostrar tendencias rápidas en cards de estadísticas.

**Características:**

- Sin ejes ni labels (diseño minimalista)
- Ideal para stat cards
- Rápido y ligero

**Uso:**

```typescript
import { SparklineChartComponent } from '@shared/components';

// En tu componente
sparklineData = [400, 420, 410, 435, 440, 458]; // Últimos 6 meses
```

**Template:**

```html
<app-sparkline-chart [values]="sparklineData" color="#218358" />
```

**Props:**

- `values` (required): Array de números para el gráfico
- `color` (default: '#218358'): Color de la línea

---

### LineChartComponent

Componente de gráfico de líneas para mostrar evolución temporal de datos.

**Uso:**

```typescript
import { LineChartComponent, type LineChartData } from '@shared/components';

// En tu componente
chartData = signal<LineChartData>({
  labels: ['2021', '2022', '2023', '2024', '2025'],
  values: [30, 50, 53, 62, 98],
  label: 'Trazabilidad verificada',
});
```

**Template:**

```html
<app-line-chart [data]="chartData()" [height]="280" [showGrid]="true" color="#218358" />
```

**Props:**

- `data` (required): Datos del gráfico (LineChartData)
- `height` (default: 250): Altura del gráfico en px
- `showGrid` (default: true): Mostrar grid de fondo
- `color` (default: '#218358'): Color de la línea

---

### BarChartComponent

Componente de gráfico de barras vertical u horizontal.

**Uso:**

```typescript
import { BarChartComponent, type BarChartData } from '@shared/components';

// En tu componente
chartData = signal<BarChartData>({
  labels: ['Mamíferos', 'Aves', 'Reptiles', 'Anfibios', 'Otros'],
  values: [45, 62, 78, 34, 23],
  label: 'Número de especies',
  colors: ['#218358', '#1a6b47', '#2d9d68', '#3eb77f', '#50d196'],
});
```

**Template:**

```html
<app-bar-chart [data]="chartData()" [height]="280" [horizontal]="false" [showGrid]="true" />
```

**Props:**

- `data` (required): Datos del gráfico (BarChartData)
- `height` (default: 250): Altura del gráfico en px
- `horizontal` (default: false): Orientación horizontal
- `showGrid` (default: true): Mostrar grid de fondo

---

## 🎨 Pachamama Colors

Los gráficos usan los colores oficiales de Pachamama:

- **Primary Green**: `#218358` (default)
- **Dark Green**: `#1a6b47`
- **Accent Orange**: `#fe714b`

---

## 📦 Instalación de Dependencias

Estos componentes requieren Chart.js:

```bash
npm install chart.js ng2-charts --save --legacy-peer-deps
```

---

## 🔧 Configuración Global

Los gráficos están configurados globalmente en `app.config.ts`:

```typescript
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...otros providers
    provideCharts(withDefaultRegisterables()),
  ],
};
```

---

## 📚 Recursos

- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
- [ng2-charts GitHub](https://github.com/valor-software/ng2-charts)
