# Poseidon · Asesor de rotación de cultivos

Proyecto para NASA Space Apps Challenge 2026, reto **Field Shift: Adapting Farms with NASA Data**.

El agricultor marca su parcela, indica su rotación actual y sus prioridades, y la herramienta
compara **tres estrategias de rotación** (la actual, un ajuste y un cambio mayor). Para cada una
muestra por qué se sugiere, la evidencia, los riesgos y lo que el análisis no sabe.

## Roles y paneles

| Rol | Panel |
|---|---|
| Cliente | Compara rotaciones de sus parcelas y ve sus evaluaciones con la nota del técnico |
| Operativo | Revisa las evaluaciones de los agricultores y deja una nota técnica |
| Monitoreo | Tablero de solo lectura: indicadores, mapa de parcelas, alertas y actividad |
| Administrador | Gestiona usuarios (alta, rol, acceso) y consulta el catálogo y el estado del sistema |

La interfaz es responsive (escritorio y teléfono). Paleta: azul, naranja, amarillo y vino; tipografía Nunito.

## Cómo funciona

1. **Clima** — climatología mensual de [NASA POWER](https://power.larc.nasa.gov/) (temperatura mínima y máxima, lluvia) para las coordenadas.
2. **Balance hídrico** — evapotranspiración de referencia (Hargreaves) y demanda de cada cultivo (Kc); la diferencia con la lluvia es el riego necesario.
3. **Heladas** — meses con mínima media baja, cruzados con el calendario y la tolerancia de cada cultivo.
4. **Rotación** — puntaje de agua, heladas, suelo (leguminosas, alternancia de familias, raíz profunda, cobertura), ingreso y forraje, ponderado por las prioridades.

## Estructura

| Carpeta | Contenido |
|---|---|
| `Backend/` | API Node.js + Express: cliente NASA POWER, indicadores de clima y motor de rotación |
| `Database/` | Esquema MySQL y catálogo de cultivos |
| `Frontend/` | React + Vite con mapa (Leaflet) y comparación de estrategias |

## Puesta en marcha

### 1. Base de datos
- **SQLite (Predeterminado - ¡No requiere instalar nada!)**:
  La base de datos se conecta de forma persistente y automática en `Database/poseidon.db` usando el motor SQLite nativo de Node.js. No necesitas instalar MySQL, XAMPP ni MariaDB.
- **MySQL / MariaDB (Opcional)**:
  Si en el futuro deseas usar un servidor MySQL tradicional, importa el esquema con `mysql -u root -p < Database/schema.sql` y configura `DB_ENGINE=mysql` en `Backend/.env`.

### 2. Backend (puerto 3001)
```bash
cd Backend
npm install
npm run seed              # carga el catálogo y usuarios demo en Database/poseidon.db
npm run dev
```

### 3. Frontend (puerto 5173), en otra terminal
```bash
cd Frontend
npm install
npm run dev
```

Pruebas del motor y API: `cd Backend && npm test`.

Los usuarios de demostración están en `Database/usuarios_demo.json`; la contraseña de todos es `admin123` (definida en `DEMO_PASSWORD` en `Backend/.env`).
Sin conexión a NASA POWER usa un clima de demostración de Cochabamba y la interfaz lo avisa.

## API

Todas las rutas, salvo el ingreso, requieren `Authorization: Bearer <token>`.

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | público | Ingreso con correo y contraseña |
| GET | `/api/cultivos`, `/api/clima?lat=&lon=` | todos | Catálogo e indicadores de clima |
| POST | `/api/evaluar` | cliente, operativo, administrador | Compara rotaciones y guarda la evaluación |
| GET | `/api/evaluaciones`, `/api/evaluaciones/:id` | todos | El cliente ve solo las suyas |
| PATCH | `/api/evaluaciones/:id/revision` | operativo, administrador | Marca como revisada con una nota |
| GET | `/api/monitoreo` | monitoreo, operativo, administrador | Totales, alertas y actividad |
| GET, POST, PATCH | `/api/usuarios` | administrador | Gestión de usuarios |

## Límites conocidos

- Los valores del catálogo (Kc, ciclos, meses de siembra, valor de mercado) son referencias aproximadas y deben validarse con un agrónomo local.
- No usa datos de suelo de la parcela ni imágenes satelitales (NDVI, SMAP); son los siguientes pasos naturales.
- La herramienta apoya la decisión; no reemplaza el criterio del agricultor ni de un técnico local.
