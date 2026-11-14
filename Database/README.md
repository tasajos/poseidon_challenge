# Database (MySQL)

1. Crear el esquema: `mysql -u root -p < Database/schema.sql`
2. Cargar catálogo y usuarios de demostración: desde `Backend/`, `npm run seed`

Las tablas de permisos y alertas (`rol_permisos`, `preferencias_alertas`, `suscripciones_push`,
`alertas_enviadas`) las crea el backend al arrancar si faltan, así que una base existente sigue sirviendo.

## Archivos
- `schema.sql`: tablas `usuarios`, `cultivos`, `parcelas`, `evaluaciones`, `rol_permisos` y las de alertas.
- `cultivos.json`: catálogo de cultivos. Los valores (Kc, ciclo, mes de siembra, tolerancia a
  heladas, valor de mercado) son **referencias aproximadas** y deben validarse con un agrónomo local.
- `usuarios_demo.json`: un usuario por rol. La contraseña de todos es el valor de `DEMO_PASSWORD`
  en `Backend/.env`. Cámbiela antes de publicar la aplicación.

## Roles y permisos
Lo que puede hacer cada rol se guarda en `rol_permisos` y lo edita el administrador desde su panel.
`npm run seed` carga los valores por defecto (`Backend/src/permisos.js`) solo si la tabla está vacía.

| Rol | Por defecto |
|---|---|
| `cliente` | Comparar rotaciones de sus parcelas, ver sus evaluaciones, recibir alertas |
| `operativo` | Ver todas las evaluaciones, revisarlas con una nota técnica, ver monitoreo, recibir alertas |
| `monitoreo` | Ver el tablero general, el mapa y las alertas (solo lectura), recibir alertas |
| `administrador` | Gestionar usuarios y permisos (fijo), respaldos, monitoreo y revisión |

## Respaldos
Son archivos JSON en `Backend/respaldos/`, no tablas. Incluyen todas las tablas salvo el catálogo de
cultivos, que se recarga con `npm run seed`. Ver el README principal.
