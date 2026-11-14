# Poseidon · Asesor de rotación de cultivos

Proyecto para NASA Space Apps Challenge 2026, reto **Field Shift: Adapting Farms with NASA Data**.

El agricultor marca su parcela, indica su rotación actual y sus prioridades, y la herramienta
compara **tres estrategias de rotación** (la actual, un ajuste y un cambio mayor). Para cada una
muestra por qué se sugiere, la evidencia, los riesgos y lo que el análisis no sabe.

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

```bash
# 1. Base de datos
mysql -u root -p < Database/schema.sql

# 2. Backend (puerto 3001)
cd Backend
cp .env.example .env      # completar usuario y contraseña de MySQL
npm install
npm run seed              # carga el catálogo de cultivos
npm run dev

# 3. Frontend (puerto 5173), en otra terminal
cd Frontend
npm install
npm run dev
```

Pruebas del motor: `cd Backend && npm test`.

Sin MySQL el backend igual responde: lee el catálogo de `Database/cultivos.json` y no guarda las evaluaciones.
Sin conexión a NASA POWER usa un clima de demostración de Cochabamba y la interfaz lo avisa.

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/cultivos` | Catálogo de cultivos |
| GET | `/api/clima?lat=&lon=` | Indicadores mensuales del lugar |
| POST | `/api/evaluar` | Compara rotaciones: `{ nombre, lat, lon, rotacion: ["papa","maiz"], prioridades: { agua, suelo, clima, ingreso, forraje } }` (0 a 5) |
| GET | `/api/evaluaciones` | Últimas evaluaciones guardadas |

## Límites conocidos

- Los valores del catálogo (Kc, ciclos, meses de siembra, valor de mercado) son referencias aproximadas y deben validarse con un agrónomo local.
- No usa datos de suelo de la parcela ni imágenes satelitales (NDVI, SMAP); son los siguientes pasos naturales.
- La herramienta apoya la decisión; no reemplaza el criterio del agricultor ni de un técnico local.
