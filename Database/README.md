# Database (MySQL)

1. Crear el esquema: `mysql -u root -p < Database/schema.sql`
2. Cargar el catálogo de cultivos: desde `Backend/`, `npm run seed`

`cultivos.json` es la fuente del catálogo. Los valores (Kc, ciclo, mes de siembra,
tolerancia a heladas, valor de mercado) son **referencias aproximadas** para el prototipo
y deben validarse con un agrónomo local antes de usarse en campo.

Tablas: `cultivos` (catálogo), `parcelas` (ubicaciones), `evaluaciones` (cada comparación guardada).
