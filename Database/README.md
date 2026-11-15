# Database (MySQL)

1. Crear el esquema: `mysql -u root -p < Database/schema.sql`
2. Cargar catálogo y usuarios de demostración: desde `Backend/`, `npm run seed`

Las tablas y columnas añadidas después de la primera versión (permisos, alertas, ofertas, solicitudes,
incidencias, fotos, ciclos, NDVI, visitas, validaciones, auditoría; datos de la parcela y estado de las cuentas)
y el rol `comprador` los crean el backend al arrancar y `npm run seed` si faltan, así que una base existente
sigue sirviendo.

## Actualizar una base existente después de un `git pull`

Opción automática: `cd Backend && npm install && npm run seed` (o simplemente arrancar el backend). Aplica las
tablas, columnas, el rol y los permisos que falten, sin borrar datos.

Opción manual, para revisar el SQL antes de aplicarlo:

```bash
mysql -u root -p < Database/schema.sql       # crea las tablas que falten
mysql -u root -p < Database/actualizar.sql   # agrega el rol y las columnas nuevas a tablas que ya existían
cd Backend && npm run seed                    # catálogo, usuarios demo y permisos por defecto
```

`schema.sql` solo crea tablas (`CREATE TABLE IF NOT EXISTS`): no agrega columnas a una tabla que ya existe.
Para eso está `actualizar.sql`, que se puede ejecutar más de una vez.

## Archivos
- `actualizar.sql`: lleva una base existente al esquema actual (rol `comprador` y columnas nuevas de `usuarios`,
  `parcelas` y `evaluaciones`).
- `schema.sql`: tablas `usuarios`, `cultivos`, `parcelas`, `evaluaciones`, `rol_permisos`, las de alertas,
  `ofertas`, `solicitudes`, `incidencias` e `incidencia_fotos` (las fotos están en Google Drive; la tabla guarda su id),
  `ciclos` y `ndvi` (historial de cada parcela), `visitas` y `validaciones` (asistencia técnica) y `auditoria`.
- `distritos.geojson` (opcional, no incluido): límites distritales oficiales para agrupar las parcelas por distrito.
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
| `cliente` (agricultor) | Registrar sus parcelas, comparar rotaciones, ver su historial, recibir alertas, ofertar su cosecha |
| `comprador` (cooperativa o mercado) | Ver la oferta sostenible y enviar solicitudes de compra |
| `operativo` | Ver sus parcelas asignadas, revisarlas con una nota técnica, registrar visitas y validaciones, ver monitoreo agregado, recibir alertas, registrar plagas en campo |
| `monitoreo` | Ver el tablero regional agregado por zona (sin datos individuales), recibir alertas |
| `administrador` | Gestionar usuarios y permisos (fijo), aprobar cuentas, auditoría, asignar parcelas, respaldos, monitoreo con detalle y revisión |

## Respaldos
Son archivos JSON en `Backend/respaldos/`, no tablas. Incluyen todas las tablas salvo el catálogo de
cultivos, que se recarga con `npm run seed`. Ver el README principal.
