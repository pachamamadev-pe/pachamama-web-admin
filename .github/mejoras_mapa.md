# Mejoras de Gestión de Mapa GeoJSON

## Estructura del servicio `/current/geojson`

El servicio devuelve una colección de features en formato GeoJSON:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "geometry": {
        "coordinates": [
          [
            [-57.4971175402862, 37.64981867318379],
            "..."
          ]
        ],
        "type": "Polygon"
      },
      "id": "6a7ac953-14cf-4cf9-a61b-1e389aac8c25",
      "type": "Feature",
      "properties": {
        "code": "AREA_16aa12ec_V1_0000",
        "name": "Emulador",
        "version": 1,
        "currentVersion": true
      }
    },
    {
      "geometry": {
        "coordinates": [
          [
            [-79.85112309160847, -6.770468986493218],
            "..."
          ]
        ],
        "type": "Polygon"
      },
      "id": "e4326a67-bcda-48bd-bfc9-c3c70ab80cbe",
      "type": "Feature",
      "properties": {
        "code": "AREA_16aa12ec_V2_0000",
        "name": "ChiclayoTest1",
        "version": 2,
        "currentVersion": true
      }
    }
  ]
}
```

---

## Instrucciones para Back (API)

### Nuevos Endpoints

#### 1. Eliminar un feature por ID

```
DELETE /current/geojson/{id}
```

- Recibe el `id` del feature (UUID del área en `geo.areas`).
- Elimina el área correspondiente en la tabla `geo.areas`.
- Devuelve una respuesta indicando si la eliminación fue exitosa o si hubo algún error.

**Ejemplos de IDs:**
- `6a7ac953-14cf-4cf9-a61b-1e389aac8c25`
- `e4326a67-bcda-48bd-bfc9-c3c70ab80cbe`

#### 2. Eliminar todos los features actuales del proyecto

```
DELETE /current/geojson
```

- Elimina **todos** los features actuales (`currentVersion: true`) del proyecto.
- Devuelve una respuesta indicando si la operación fue exitosa o si hubo algún error.

### Reglas de negocio

> ⚠️ **Restricción:** Ambas operaciones de eliminación **solo se pueden ejecutar cuando el proyecto esté en stage `planning`**.

- Si el proyecto no está en stage `planning`, el endpoint debe retornar un error apropiado (ej. `400 Bad Request` o `409 Conflict`) con un mensaje descriptivo.
- Los features se encuentran almacenados en la tabla `geo.areas`.

---

## Instrucciones para Front (Angular)

### Nueva Página: Gestión de Mapa

Crear una nueva página accesible desde el **detalle del proyecto**, destinada a la gestión visual del mapa GeoJSON.

### Funcionalidades

#### Visualización
- Mostrar el mapa con todos los features cargados desde `/current/geojson`.
- Mostrar una sección lateral (o panel inferior) con la **lista de features**, mostrando:
  - `name`
  - `code`
  - `version`

#### Visibilidad de features
- Permitir **mostrar u ocultar** cada feature individualmente en el mapa mediante un toggle o checkbox.
- Esta acción es solo visual (no afecta el backend).

#### Eliminación de un feature
- Cada feature en la lista debe tener un botón **Eliminar**.
- Al hacer clic, se debe:
  1. Llamar al endpoint `DELETE /current/geojson/{id}`.
  2. Actualizar la lista de features en el front para reflejar el cambio.
  3. Remover el feature del mapa.

#### Eliminación masiva
- Incluir un botón **"Eliminar todos"**.
- Al hacer clic, se debe:
  1. Mostrar un diálogo de confirmación.
  2. Llamar al endpoint `DELETE /current/geojson`.
  3. Limpiar la lista de features y el mapa.

### Restricción de edición

> ⚠️ Las acciones de **eliminar** (individual y masiva) **solo deben estar habilitadas cuando el proyecto esté en stage `planning`**.

- Si el proyecto está en otro stage, los botones de eliminar deben estar **deshabilitados** o **ocultos**.
- Se puede mostrar un tooltip o mensaje informativo indicando la razón.

