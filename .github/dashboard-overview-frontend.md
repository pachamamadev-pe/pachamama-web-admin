# Dashboard Empresarial — Especificaciones para Frontend (Angular)

## 1. Endpoint

| Campo | Valor |
|-------|-------|
| **Método** | `GET` |
| **URL** | `/api/v1/admin/kpis/dashboard/overview` |
| **Auth** | Bearer Token (rol `ADMIN_EMPRESA`) |
| **Query param** | `asOfDate` (opcional, formato `yyyy-MM-dd`, default: hoy) |

### Curl de referencia
```bash
curl --location 'http://localhost:8080/api/v1/admin/kpis/dashboard/overview?asOfDate=2026-03-13' \
  --header 'Authorization: Bearer <TOKEN>' \
  --header 'Accept: application/json'
```

---

## 2. Contrato de respuesta

```typescript
interface BusinessDashboardOverviewDto {
  asOfDate: string;                        // "yyyy-MM-dd"
  projectStageDistribution: ProjectStageItem[];
  partnerCommunities: PartnerCommunitiesDto;
  collectors: CollectorsSummaryDto;
  productionByProduct: ProductionByProductDto[];
}

interface ProjectStageItem {
  stage: string;   // "planning" | "inventory" | "collection" | "serfor_evaluation" | "primary_transformation" | ...
  count: number;
}

interface PartnerCommunitiesDto {
  total: number;
}

interface CollectorsSummaryDto {
  total: number;
  femaleTotal: number;
  femalePercentage: number;  // 0–100 con decimales
  ageDistribution: AgeDistributionDto[];
}

interface AgeDistributionDto {
  ageRange: string;
  count: number;
}

interface ProductionByProductDto {
  productId: string;
  productCode: string;
  productName: string;
  totalWeightKg: number;
  totalUnits: number;
  batchCount: number;
}
```

### Ejemplo real de respuesta
```json
{
  "asOfDate": "2026-03-23",
  "projectStageDistribution": [
    { "stage": "ctp_entry",               "count": 1 }
  ],
  "partnerCommunities": { "total": 1 },
  "collectors": {
    "total": 1,
    "femaleTotal": 0,
    "femalePercentage": 0.0,
    "ageDistribution": [
      { "ageRange": "25-35", "count": 1 }
    ]
  },
  "productionByProduct": [
    {
      "productId": "b68fdf46-638b-4b94-aecc-2e22c1f0f64e",
      "productCode": "aguaje-0b81",
      "productName": "Aguaje",
      "totalWeightKg": 20.0,
      "totalUnits": 3,
      "batchCount": 1
    }
  ]
}
```

---

## 3. Etapas de proyecto — Catálogo y orden

Mostrar en este orden fijo para que el gráfico sea coherente:

| stage (API) | Etiqueta visible | Color sugerido |
|---|---|---|
| `planning` | Planificación | `#6366F1` (índigo) |
| `inventory` | Inventario | `#3B82F6` (azul) |
| `collection` | Recolección | `#10B981` (verde) |
| `serfor_evaluation` | Eval. SERFOR | `#F59E0B` (ámbar) |
| `primary_transformation` | Transform. Primaria | `#8B5CF6` (violeta) |
| `closed` | Cerrado | `#6B7280` (gris) |

> **Tip:** Si la API devuelve un stage desconocido, mostrarlo con etiqueta en `title case` y color `#9CA3AF`.

---

## 4. Diseño del Dashboard — Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Dashboard Empresarial              Actualizado: 23/03/2026   [↻]  │
├───────────────────┬──────────────────────┬──────────────────────────┤
│  KPI Card         │  KPI Card            │  KPI Card                │
│  Proyectos        │  Comunidades socias  │  Recolectores            │
│  activos (total)  │  (total)             │  (total + % mujeres)     │
├───────────────────┴──────────────────────┴──────────────────────────┤
│                                                                     │
│   Gráfico de barras horizontales         Gráfico pie / donut        │
│   Proyectos por Etapa                    Recolectores por Género    │
│                                                                     │
├──────────────────────────────────────────┬──────────────────────────┤
│   Gráfico de barras / Tabla              │  Gráfico de barras col.  │
│   Producción por Producto                │  Recolectores por Edad   │
└──────────────────────────────────────────┴──────────────────────────┘
```

---

## 5. Componentes recomendados

### 5.1 KPI Cards (fila superior)

Tres tarjetas de resumen rápido:

#### Card 1 — Proyectos
- **Valor principal:** suma de todos los `count` en `projectStageDistribution`
- **Subtítulo:** "Proyectos vigentes"
- **Ícono:** `📁` o `FolderOpenIcon`
- **Color de acento:** `#6366F1`

#### Card 2 — Comunidades socias
- **Valor principal:** `partnerCommunities.total`
- **Subtítulo:** "Comunidades socias"
- **Ícono:** `🏘️` o `HomeGroupIcon`
- **Color de acento:** `#10B981`

#### Card 3 — Recolectores
- **Valor principal:** `collectors.total`
- **Subtítulo:** `collectors.femaleTotal` + " mujeres (" + `collectors.femalePercentage` + "%)"
- **Ícono:** `👷` o `UsersIcon`
- **Color de acento:** `#F59E0B`

---

### 5.2 Gráfico de barras horizontales — Proyectos por Etapa

- **Librería sugerida:** `ng-apexcharts` / `Chart.js` / `Recharts`
- **Tipo:** `bar` horizontal
- **Eje Y:** etiquetas de stage (ver catálogo §3)
- **Eje X:** cantidad de proyectos
- **Ordenar:** de mayor a menor `count`
- **Colores:** usar la paleta del catálogo §3
- **Tooltip:** "X proyectos en [etiqueta]"
- **Animación:** entrada desde la izquierda (`slideFromLeft`)

```typescript
// Transformación de datos
const chartData = response.projectStageDistribution
  .sort((a, b) => b.count - a.count)
  .map(item => ({
    label: stageLabel(item.stage),   // función helper con catálogo
    value: item.count,
    color: stageColor(item.stage),
  }));
```

---

### 5.3 Gráfico donut — Recolectores por Género

- **Tipo:** `donut` / `pie`
- **Secciones:**
  - **Mujeres** → `collectors.femaleTotal` — color `#EC4899` (rosa)
  - **Hombres / Otro** → `collectors.total - collectors.femaleTotal` — color `#6366F1` (índigo)
- **Centro del donut:** mostrar `collectors.femalePercentage + "% Mujeres"`
- **Tooltip:** valor absoluto + porcentaje
- **Leyenda:** debajo del gráfico

```typescript
const donutData = [
  { label: 'Mujeres', value: response.collectors.femaleTotal,
    color: '#EC4899' },
  { label: 'Hombres / Otro',
    value: response.collectors.total - response.collectors.femaleTotal,
    color: '#6366F1' },
];
```

---

### 5.4 Gráfico de barras columnas — Recolectores por Edad

- **Tipo:** `bar` (columnas verticales)
- **Eje X:** Rangos de edad (ej. "18-25", "26-35") ordenados
- **Eje Y:** Cantidad de recolectores (`count`)
- **Colores:** `#10B981` (verde)
- **Tooltip:** cantidad absoluta

```typescript
const ageData = response.collectors.ageDistribution.map(item => ({
  label: item.ageRange,
  value: item.count,
  color: '#10B981'
}));
```

---

### 5.5 Gráfico de barras múltiples o Tabla — Producción por Producto

- **Librería o Componente:** Gráfico de columnas / barras múltiples (Peso en base a `totalWeightKg` o `totalUnits`) o una tabla resumen.
- **Campos a mostrar:** Nombre del producto, Peso total (Kg), Unidades totales.
- Si se usa gráfico, se recomienda usar el Peso (Kg) como métrica principal.

```typescript
// Datos para Producción por Producto
const productionData = response.productionByProduct.map(item => ({
  label: item.productName,
  valueKg: item.totalWeightKg,
  valueUnits: item.totalUnits
}));
```

---

## 6. Servicio Angular

```typescript
// dashboard.service.ts
export interface BusinessDashboardOverview {
  asOfDate: string;
  projectStageDistribution: { stage: string; count: number }[];
  partnerCommunities: { total: number };
  collectors: { 
    total: number; 
    femaleTotal: number; 
    femalePercentage: number;
    ageDistribution: { ageRange: string; count: number }[];
  };
  productionByProduct: {
    productId: string;
    productCode: string;
    productName: string;
    totalWeightKg: number;
    totalUnits: number;
    batchCount: number;
  }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {

  private readonly BASE = '/api/v1/admin/kpis/dashboard';

  constructor(private http: HttpClient) {}

  getOverview(asOfDate?: string): Observable<BusinessDashboardOverview> {
    const params: Record<string, string> = {};
    if (asOfDate) params['asOfDate'] = asOfDate;
    return this.http.get<BusinessDashboardOverview>(`${this.BASE}/overview`, { params });
  }
}
```

---

## 7. Componente Angular

```typescript
// dashboard-overview.component.ts
@Component({
  selector: 'app-dashboard-overview',
  templateUrl: './dashboard-overview.component.html',
})
export class DashboardOverviewComponent implements OnInit {

  overview?: BusinessDashboardOverview;
  totalProjects = 0;
  loading = false;
  error: string | null = null;

  // Fecha de corte: hoy por defecto, editable con datepicker
  asOfDate = new Date().toISOString().split('T')[0];

  constructor(private svc: DashboardService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.svc.getOverview(this.asOfDate).subscribe({
      next: (data) => {
        this.overview = data;
        this.totalProjects = data.projectStageDistribution
          .reduce((sum, s) => sum + s.count, 0);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'No se pudo cargar el dashboard. Intente de nuevo.';
        this.loading = false;
      },
    });
  }

  onDateChange(date: string): void {
    this.asOfDate = date;
    this.load();
  }
}
```

---

## 8. Funciones helper — Catálogo de stages

```typescript
// stage-catalog.ts
const STAGE_META: Record<string, { label: string; color: string }> = {
  planning:               { label: 'Planificación',        color: '#6366F1' },
  inventory:              { label: 'Inventario',            color: '#3B82F6' },
  collection:             { label: 'Recolección',           color: '#10B981' },
  serfor_evaluation:      { label: 'Eval. SERFOR',          color: '#F59E0B' },
  primary_transformation: { label: 'Transform. Primaria',  color: '#8B5CF6' },
  closed:                 { label: 'Cerrado',               color: '#6B7280' },
};

export function stageLabel(stage: string): string {
  return STAGE_META[stage]?.label
    ?? stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function stageColor(stage: string): string {
  return STAGE_META[stage]?.color ?? '#9CA3AF';
}
```

---

## 9. UX / UI — Buenas prácticas

| Aspecto | Recomendación |
|---------|---------------|
| **Loading** | Mostrar skeleton cards (no spinner bloqueante) durante la carga |
| **Error** | Mostrar banner con mensaje + botón "Reintentar" |
| **Fecha de corte** | Datepicker en la cabecera del dashboard; max = hoy |
| **Responsive** | Cards en 3 columnas desktop → 1 columna mobile |
| **Gráficos vacíos** | Si `count === 0` en todos los stages, mostrar empty state ilustrado |
| **Animaciones** | `countUp` en los valores de las KPI cards al cargar |
| **Actualización** | Botón `↻ Actualizar` que recarga con la fecha actual |
| **Accesibilidad** | `aria-label` en cada gráfico; colores con contraste WCAG AA |
| **Colores** | Usar la paleta del catálogo §3; no inventar colores nuevos |
| **Tooltip consistente** | Mismo estilo en barras y donut: fondo oscuro, texto blanco |

---

## 10. Manejo de errores HTTP

| Código | Causa | Mensaje sugerido en UI |
|--------|-------|------------------------|
| `401` | Token expirado o inválido | "Sesión expirada. Por favor inicia sesión nuevamente." |
| `403` | Rol insuficiente | "No tienes permisos para ver este dashboard." |
| `500` | Error interno (función SQL no encontrada, etc.) | "Error en el servidor. Contacta al administrador." |

---

## 11. Checklist de implementación

- [x] Crear `DashboardService` con `getOverview(asOfDate?)`
- [x] Crear `DashboardOverviewComponent` con skeleton loading
- [x] Implementar KPI Cards (3 columnas)
- [x] Implementar gráfico de barras horizontales con `stageLabel` y `stageColor`
- [x] Implementar gráfico donut con mujeres vs. resto
- [x] Implementar tabla/gráfico para Producción por Producto
- [x] Implementar gráfico de columnas para Recolectores por Edad
- [x] Agregar datepicker de fecha de corte en cabecera
- [ ] Agregar botón "Actualizar"
- [ ] Manejar estados: loading, error, empty
- [ ] Verificar responsive en mobile
- [ ] Validar accesibilidad (aria-labels, contraste)

