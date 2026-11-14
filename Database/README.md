# Database (MySQL)

1. Crear el esquema: `mysql -u root -p < Database/schema.sql`
2. Cargar catálogo y usuarios de demostración: desde `Backend/`, `npm run seed`

Si ya había creado una versión anterior del esquema, bórrela antes (`DROP DATABASE poseidon;`):
las tablas cambiaron y `CREATE TABLE IF NOT EXISTS` no las actualiza.

## Archivos
- `schema.sql`: tablas `usuarios`, `cultivos`, `parcelas`, `evaluaciones`.
- `cultivos.json`: catálogo de cultivos. Los valores (Kc, ciclo, mes de siembra, tolerancia a
  heladas, valor de mercado) son **referencias aproximadas** y deben validarse con un agrónomo local.
- `usuarios_demo.json`: un usuario por rol. La contraseña de todos es el valor de `DEMO_PASSWORD`
  en `Backend/.env`. Cámbiela antes de publicar la aplicación.

## Roles
| Rol | Qué puede hacer |
|---|---|
| `cliente` | Comparar rotaciones de sus parcelas y ver sus evaluaciones |
| `operativo` | Ver todas las evaluaciones y marcarlas como revisadas con una nota técnica |
| `monitoreo` | Ver el tablero general, el mapa y las alertas (solo lectura) |
| `administrador` | Todo lo anterior, más gestionar usuarios |
