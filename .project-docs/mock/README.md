# 🎭 Datos Mock - Pachamama Web Admin

Este directorio contiene datos ficticios (mock data) para desarrollo y testing del proyecto sin necesidad de un backend real.

## 📋 Contenido

### `db.json`
Base de datos fake en formato JSON con las siguientes colecciones:

| Colección | Registros | Descripción |
|-----------|-----------|-------------|
| `products` | 6 | Productos agrícolas con códigos únicos, precios y créditos de carbono |
| `companies` | 3 | Empresas con RUC, razón social y administradores |
| `communities` | 3 | Comunidades campesinas/nativas con ubicación y datos geográficos |
| `brigades` | 3 | Brigadas de recolección con miembros y vigencia |
| `projects` | 3 | Proyectos de reforestación con geomallas (GeoJSON) |
| `inventorySettings` | 3 | Configuraciones de inventario por proyecto |
| `users` | 9 | Usuarios del sistema (admins, líderes, miembros) |

## 🚀 Uso

### Opción 1: JSON Server (API REST Fake) - **RECOMENDADO**

Instala json-server si aún no lo tienes:

```bash
npm install --save-dev json-server
```

Inicia el servidor mock:

```bash
npm run mock:server
```

Esto levantará una API REST en `http://localhost:3000` con endpoints completos:

#### Endpoints Disponibles

**Products:**
```bash
GET    http://localhost:3000/products          # Listar todos
GET    http://localhost:3000/products/prod-001 # Ver uno
POST   http://localhost:3000/products          # Crear
PUT    http://localhost:3000/products/prod-001 # Actualizar
PATCH  http://localhost:3000/products/prod-001 # Actualizar parcial
DELETE http://localhost:3000/products/prod-001 # Eliminar
```

**Filtros y Búsqueda:**
```bash
# Filtrar por campo
GET http://localhost:3000/products?status=active
GET http://localhost:3000/products?category=Café

# Búsqueda por texto
GET http://localhost:3000/products?q=orgánico

# Ordenar
GET http://localhost:3000/products?_sort=name&_order=asc

# Paginación
GET http://localhost:3000/products?_page=1&_limit=10

# Relaciones (expande referencias)
GET http://localhost:3000/projects?_embed=inventorySettings
GET http://localhost:3000/brigades?_expand=community
```

**Otros recursos:**
- `http://localhost:3000/companies`
- `http://localhost:3000/communities`
- `http://localhost:3000/brigades`
- `http://localhost:3000/projects`
- `http://localhost:3000/inventorySettings`
- `http://localhost:3000/users`

#### Ejemplo de Uso en Servicios

```typescript
// src/app/features/products/services/products.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/products'; // ← API Mock

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product);
  }

  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${id}`, product);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
```

### Opción 2: Importar Directamente en Tests

```typescript
// Importar todo el db.json
import mockData from '.project-docs/mock/db.json';

describe('ProductsComponent', () => {
  let mockProducts = mockData.products;

  it('debería mostrar 6 productos', () => {
    expect(mockProducts.length).toBe(6);
  });
});
```

### Opción 3: Mock Service Worker (MSW) - Para testing avanzado

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import mockData from '.project-docs/mock/db.json';

export const handlers = [
  http.get('/api/products', () => {
    return HttpResponse.json(mockData.products);
  }),
  
  http.get('/api/products/:id', ({ params }) => {
    const product = mockData.products.find(p => p.id === params.id);
    return product 
      ? HttpResponse.json(product)
      : new HttpResponse(null, { status: 404 });
  }),
];
```

## 📊 Estructura de Datos

### Products (Productos)

```typescript
interface Product {
  id: string;              // Identificador único
  code: string;            // Código único (CAT-PRO-NNN)
  name: string;            // Nombre del producto
  description: string;     // Descripción detallada
  category: string;        // Categoría (Café, Cacao, Frutas, etc.)
  unit: string;            // Unidad (kg, racimo, atado)
  pricePerUnit: number;    // Precio por unidad en soles (S/)
  imageUrl: string;        // URL de la imagen
  carbonCreditsPerUnit: number;  // Créditos de carbono por unidad
  status: 'active' | 'inactive';
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

**Validaciones a considerar:**
- `code` debe ser único en el sistema
- `pricePerUnit` debe ser mayor a 0
- `carbonCreditsPerUnit` debe ser >= 0

### Companies (Empresas)

```typescript
interface Company {
  id: string;
  ruc: string;             // RUC de 11 dígitos (validar formato)
  businessName: string;    // Razón social
  tradeName: string;       // Nombre comercial
  address: string;
  phone: string;
  email: string;
  website: string | null;
  adminUserId: string;     // FK a users
  logoUrl: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}
```

**Validaciones a considerar:**
- `ruc` debe tener exactamente 11 dígitos numéricos
- `email` debe ser válido
- `adminUserId` debe referenciar a un usuario con rol `company_admin`

### Communities (Comunidades)

```typescript
interface Community {
  id: string;
  code: string;            // Código único (COM-REGION-NNN)
  name: string;
  region: string;          // Región del Perú
  province: string;
  district: string;
  address: string;
  totalFamilies: number;
  totalHectares: number;
  mainProducts: string[];  // Array de productos principales
  contactPerson: string;
  contactPhone: string;
  contactEmail: string | null;
  geojson: GeoJSON.Polygon | null;  // Perímetro de la comunidad
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}
```

**Notas:**
- `geojson` es opcional (algunas comunidades no tienen perímetro definido)
- `mainProducts` es un array de strings con los nombres de productos

### Brigades (Brigadas)

```typescript
interface Brigade {
  id: string;
  code: string;            // Código único (BRIG-YYYY-NNN)
  name: string;
  communityId: string;     // FK a communities
  leaderId: string;        // FK a users (debe ser brigade_leader)
  members: BrigadeMember[];
  startDate: string;       // YYYY-MM-DD
  endDate: string;         // YYYY-MM-DD
  isActive: boolean;       // Si la brigada está vigente
  createdAt: string;
  updatedAt: string;
}

interface BrigadeMember {
  userId: string;
  name: string;
  dni: string;             // 8 dígitos
  role: 'leader' | 'member';
  phone: string;
  joinedAt: string;
}
```

**Validaciones a considerar:**
- `endDate` debe ser mayor a `startDate`
- `members` debe incluir al líder (leaderId)
- `dni` debe tener 8 dígitos

### Projects (Proyectos)

```typescript
interface Project {
  id: string;
  code: string;            // PROJ-YYYY-NNN
  name: string;
  companyId: string;       // FK a companies
  communityId: string;     // FK a communities
  description: string;
  startDate: string;       // YYYY-MM-DD
  endDate: string;         // YYYY-MM-DD
  totalHectares: number;
  targetTrees: number;     // Meta de árboles a plantar
  currentTrees: number;    // Árboles plantados actualmente
  estimatedCarbonCapture: number;  // Toneladas de CO2
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  geomalla: GeoJSON.FeatureCollection | null;  // Áreas del proyecto
  createdAt: string;
  updatedAt: string;
}
```

**Estructura de la geomalla:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lng, lat], ...]]
      },
      "properties": {
        "area_id": "A-001",
        "name": "Sector Norte",
        "hectares": 25,
        "planted_trees": 3000,
        "target_trees": 12500,
        "status": "active" | "planning" | "completed"
      }
    }
  ]
}
```

### Inventory Settings (Configuración de Inventario)

```typescript
interface InventorySetting {
  id: string;
  projectId: string;       // FK a projects
  isEnabled: boolean;
  startDate: string;       // YYYY-MM-DD
  endDate: string;         // YYYY-MM-DD
  allowedProducts: string[];  // Array de product IDs
  responsibleUserId: string;  // FK a users
  settings: {
    requiresApproval: boolean;
    maxDailyCollections: number;
    autoCalculateCarbonCredits: boolean;
    notifyOnLowStock: boolean;
    minStockThreshold: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

### Users (Usuarios)

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  dni: string;             // 8 dígitos
  phone: string;
  role: 'company_admin' | 'brigade_leader' | 'brigade_member';
  companyId?: string;      // Solo para company_admin
  communityId?: string;    // Solo para brigade_leader/member
  status: 'active' | 'inactive';
  createdAt: string;
}
```

**Roles:**
- `company_admin`: Administrador de empresa
- `brigade_leader`: Líder de brigada
- `brigade_member`: Miembro de brigada

## 🔗 Relaciones entre Entidades

```
Companies (1) ──< Projects (N)
Communities (1) ──< Projects (N)
Communities (1) ──< Brigades (N)
Projects (1) ──< InventorySettings (N)
Users (1) ──< Companies (1) [adminUserId]
Users (1) ──< Brigades (N) [leaderId]
Products (N) ──< InventorySettings (N) [allowedProducts]
```

## 💡 Tips de Uso

### 1. Simular Latencia de Red

json-server tiene latencia mínima. Para simular delays:

```bash
# Agregar delay de 500ms
json-server --watch .project-docs/mock/db.json --delay 500
```

### 2. Preservar Cambios

json-server **sobrescribe** el archivo db.json. Para evitar perder datos:

```bash
# Hacer una copia de respaldo
cp .project-docs/mock/db.json .project-docs/mock/db.backup.json
```

### 3. Resetear Datos

```bash
# Restaurar desde el backup
cp .project-docs/mock/db.backup.json .project-docs/mock/db.json
```

### 4. Datos Adicionales

Para agregar más registros, simplemente edita `db.json` y agrega objetos al array correspondiente. Asegúrate de:
- Usar IDs únicos
- Mantener la consistencia en las foreign keys
- Seguir el formato de fechas ISO 8601

## 📝 Notas Importantes

1. **IDs únicos**: Todos los IDs siguen el patrón `{tipo}-{número}` (ej: `prod-001`, `comm-001`)
2. **Fechas**: Formato ISO 8601 (`2024-01-15T10:00:00Z`)
3. **Coordenadas**: Formato GeoJSON estándar `[longitud, latitud]`
4. **Estados**: Usar solo los valores definidos en cada interfaz
5. **Productos en inventario**: Los IDs en `allowedProducts` deben existir en `products`

## 🛠 Mantenimiento

Al agregar nuevas features que requieran datos mock:

1. Actualiza `db.json` con la nueva colección o campos
2. Documenta la estructura en este README
3. Agrega al menos 2-3 registros de ejemplo
4. Verifica que las relaciones sean consistentes

---

**Última actualización:** Octubre 2024  
**Versión de datos:** 1.0.0
