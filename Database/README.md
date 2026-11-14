# Database (MySQL)

1. Crear el esquema: `mysql -u root -p < Database/schema.sql`
2. Cargar catálogo y usuarios de demostración: desde `Backend/`, `npm run seed`

Las tablas añadidas después de la primera versión (permisos, alertas, ofertas, solicitudes, incidencias y
fotos) y el rol `comprador` los crean el backend al arrancar y `npm run seed` si faltan, así que una base
existente sigue sirviendo.

## Archivos
- `schema.sql`: tablas `usuarios`, `cultivos`, `parcelas`, `evaluaciones`, `rol_permisos`, las de alertas,
  `ofertas`, `solicitudes`, `incidencias` e `incidencia_fotos` (las fotos están en Google Drive; la tabla guarda su id).
- `cultivos.json`: catálogo de cultivos. Los valores (Kc, ciclo, mes de siembra, tolerancia a
  heladas, valor de mercado) son **referencias aproximadas** y deben validarse con un agrónomo local.
- `usuarios_demo.json`: un usuario por rol. La contraseña de todos es el valor de `DEMO_PASSWORD`
  en `Backend/.env`. Cámbiela antes de publicar la aplicación.

## Roles y permisos
Lo que puede hacer cada rol se guarda en `rol_permisos` y lo edita el administrador desde su panel.
Los valores por defecto (`Backend/src/permisos.js`) se cargan una sola vez por permiso: `permisos_sembrados`
registra cuáles ya se cargaron, así un permiso nuevo llega sin pisar lo que cambió el administrador.

| Rol | Por defecto |
|---|---|
| `cliente` (agricultor) | Comparar rotaciones de sus parcelas, ver sus evaluaciones, recibir alertas, ofertar su cosecha |
| `comprador` (cooperativa o mercado) | Ver la oferta sostenible y enviar solicitudes de compra |
| `operativo` | Ver todas las evaluaciones, revisarlas con una nota técnica, ver monitoreo, recibir alertas, registrar plagas en campo |
| `monitoreo` | Ver el tablero general, el mapa y las alertas (solo lectura), recibir alertas |
| `administrador` | Gestionar usuarios y permisos (fijo), respaldos, monitoreo y revisión |

## Respaldos
Son archivos JSON en `Backend/respaldos/`, no tablas. Incluyen todas las tablas salvo el catálogo de
cultivos, que se recarga con `npm run seed`. Ver el README principal.
