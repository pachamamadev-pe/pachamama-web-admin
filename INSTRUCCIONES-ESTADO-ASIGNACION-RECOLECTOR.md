# Instrucciones: Gestión de estado de asignación de recolectores

## 1) Contexto funcional

- La tabla `catalog.collectors` contiene la información de recolectores.
- La tabla `geo.project_community_collectors` contiene la relación entre:
  - `collectorId`
  - `projectCommunityId` (proyecto/comunidad asignados)
- En `geo.project_community_collectors` existe la columna `status` con valores:
  - `active`
  - `inactive`
  - `archived`

## 2) Reglas de negocio

1. Cuando una asignación está en `active`, el recolector puede ser asignado a una brigada y puede registrar actividades.
2. El estado de esta asignación debe devolverse en la consulta del recolector en móvil.
3. En el portal web, un usuario con scope **Empresa** puede cambiar los estados de esta asignación.
4. En onboarding, la asignación del recolector se crea por defecto en estado `active`.
5. Transiciones permitidas de estado:
   - `active` → `inactive`
   - `inactive` → `active`
   - `active` → `archived`
   - `inactive` → `archived`
6. Regla terminal:
   - Si una asignación está en `archived`, no puede volver a cambiar de estado.
7. En cada cambio de estado se debe registrar auditoría con:
   - fecha del cambio
   - usuario que realiza el cambio
   - motivo del cambio

## 3) DDL

Implementar una nueva tabla para auditoría del historial de cambios de estado de asignación.

### Requerimiento mínimo

- Debe relacionarse con `geo.project_community_collectors.id` (campo referencial sugerido: `project_community_collector_id`).
- Debe almacenar, como mínimo:
  - identificador del registro de auditoría
  - `project_community_collector_id`
  - estado anterior
  - estado nuevo
  - motivo del cambio
  - usuario que realiza el cambio
  - fecha/hora del cambio

## 4) API Admin

### 4.1 Endpoint para cambiar estado de asignación

Asegurar que exista un endpoint para cambio de estado de asignación del recolector a proyecto/comunidad.

#### Validaciones obligatorias

- Validar que el usuario que realiza la operación pertenezca al mismo `tenantId` del recurso, recorriendo:
  - `projectCommunityCollectorId` → `projectCommunityId` → `projectId` → `companyId`
- Validar transiciones de estado según reglas de negocio definidas.
- Validar que se envíe un motivo de cambio.
- Si el estado actual es `archived`, rechazar cualquier cambio.

#### Payload esperado

- Estado destino (`newStatus`)
- Motivo de cambio (`reason`)

#### Efecto esperado

- Actualizar estado en `geo.project_community_collectors`.
- Registrar evento en la tabla de auditoría.

### 4.2 Endpoint para historial de cambios por recolector

Implementar endpoint para consultar historial de cambios de estado por `projectCommunityCollectorId`.

#### Validaciones obligatorias

- Validar que el usuario que realiza la consulta pertenezca al mismo `tenantId` del recurso, recorriendo:
  - `projectCommunityCollectorId` → `projectCommunityId` → `projectId` → `companyId`

#### Respuesta esperada

- Lista cronológica de cambios con:
  - fecha/hora
  - usuario
  - estado anterior
  - estado nuevo
  - motivo

## 5) Front Web

### Ubicación

- Web → Detalle de Proyecto → Tab de Recolectores

### Requerimientos

1. Mostrar solo recolectores con estado `active` o `inactive`.
2. En la columna de acciones, mostrar opción para cambiar estado de asignación según reglas definidas.
3. Al cambiar estado, mostrar un diálogo que permita:
   - seleccionar estado destino válido
   - ingresar motivo del cambio
4. No habilitar cambios para registros en estado `archived`.

## 6) Consideraciones de implementación

- Mantener consistencia entre:
  - reglas de dominio (backend)
  - validaciones de UI (frontend)
  - persistencia de auditoría (base de datos)
- Asegurar trazabilidad completa de cambios para auditoría y soporte.
- Garantizar que móvil y web consuman/representen el estado actualizado de asignación.


# cURLs — Collector Assignment Status

> Reemplaza `{TOKEN}` por tu Bearer JWT y `{PCC_ID}` por el UUID de la asignación (`geo.project_community_collectors.id`).

---

## 4.1 — PATCH Cambiar estado

### active → inactive
```bash
curl --location --request PATCH \
  'http://localhost:8080/api/v1/admin/collector-assignment-status/{PCC_ID}/status' \
  --header 'Authorization: Bearer {TOKEN}' \
  --header 'Content-Type: application/json' \
  --data '{
    "newStatus": "inactive",
    "reason": "Recolector suspendido temporalmente por vacaciones"
  }'
```

### active → archived
```bash
curl --location --request PATCH \
  'http://localhost:8080/api/v1/admin/collector-assignment-status/{PCC_ID}/status' \
  --header 'Authorization: Bearer {TOKEN}' \
  --header 'Content-Type: application/json' \
  --data '{
    "newStatus": "archived",
    "reason": "Fin de contrato. No se renovará la asignación."
  }'
```

### inactive → active
```bash
curl --location --request PATCH \
  'http://localhost:8080/api/v1/admin/collector-assignment-status/{PCC_ID}/status' \
  --header 'Authorization: Bearer {TOKEN}' \
  --header 'Content-Type: application/json' \
  --data '{
    "newStatus": "active",
    "reason": "Recolector regresó de vacaciones, se reactiva la asignación"
  }'
```

### Respuesta esperada `200 OK`
```json
{
  "projectCommunityCollectorId": "d0bc6612-bd57-4ed4-8049-598471a8a390",
  "previousStatus": "active",
  "newStatus": "inactive",
  "reason": "Recolector suspendido temporalmente por vacaciones"
}
```

---

### Errores esperados

#### `400` — Transición no permitida (ej. archived → active)
```bash
curl --location --request PATCH \
  'http://localhost:8080/api/v1/admin/collector-assignment-status/{PCC_ID}/status' \
  --header 'Authorization: Bearer {TOKEN}' \
  --header 'Content-Type: application/json' \
  --data '{
    "newStatus": "active",
    "reason": "Intentando reactivar una asignación archivada"
  }'
```
```json
{
  "code": "BAD_REQUEST",
  "message": "La asignacion esta en estado 'archived' y no puede cambiar de estado."
}
```

#### `400` — reason vacío (falla validación `@NotBlank`)
```bash
curl --location --request PATCH \
  'http://localhost:8080/api/v1/admin/collector-assignment-status/{PCC_ID}/status' \
  --header 'Authorization: Bearer {TOKEN}' \
  --header 'Content-Type: application/json' \
  --data '{
    "newStatus": "inactive",
    "reason": ""
  }'
```

#### `400` — newStatus inválido
```bash
curl --location --request PATCH \
  'http://localhost:8080/api/v1/admin/collector-assignment-status/{PCC_ID}/status' \
  --header 'Authorization: Bearer {TOKEN}' \
  --header 'Content-Type: application/json' \
  --data '{
    "newStatus": "deleted",
    "reason": "Estado que no existe"
  }'
```
```json
{
  "code": "BAD_REQUEST",
  "message": "Estado invalido: 'deleted'. Valores permitidos: active, inactive, archived"
}
```

#### `403` — Asignación de otro tenant
```json
{
  "code": "ACCESS_DENIED",
  "message": "No autorizado: la asignacion no pertenece a su empresa"
}
```

#### `404` — PCC_ID inexistente
```json
{
  "code": "NOT_FOUND",
  "message": "Asignacion no encontrada: d0bc6612-bd57-4ed4-8049-598471a8a390"
}
```

---

## 4.2 — GET Historial de cambios

```bash
curl --location \
  'http://localhost:8080/api/v1/admin/collector-assignment-status/{PCC_ID}/history' \
  --header 'Authorization: Bearer {TOKEN}'
```

### Respuesta esperada `200 OK`
```json
[
  {
    "id": "a1b2c3d4-0000-0000-0000-000000000001",
    "previousStatus": "active",
    "newStatus": "inactive",
    "reason": "Recolector suspendido temporalmente por vacaciones",
    "changedBy": "439c313a-d727-4d19-83b2-5b71d1b28b1e",
    "changedByName": "Jecri Rey Do Santos Ocmin",
    "changedAt": "2026-02-28T10:00:00Z"
  },
  {
    "id": "a1b2c3d4-0000-0000-0000-000000000002",
    "previousStatus": "inactive",
    "newStatus": "active",
    "reason": "Regresó de vacaciones",
    "changedBy": "439c313a-d727-4d19-83b2-5b71d1b28b1e",
    "changedByName": "Jecri Rey Do Santos Ocmin",
    "changedAt": "2026-02-27T08:00:00Z"
  }
]
```
> La lista viene ordenada del **más reciente al más antiguo** (`changed_at DESC`).

### Respuesta cuando no hay historial `200 OK`
```json
[]
```
