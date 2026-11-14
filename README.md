# Poseidon · Asesor de rotación de cultivos

Proyecto para NASA Space Apps Challenge 2026, reto **Field Shift: Adapting Farms with NASA Data**.

El agricultor marca su parcela, indica su rotación actual y sus prioridades, y la herramienta
compara **tres estrategias de rotación** (la actual, un ajuste y un cambio mayor). Para cada una
muestra por qué se sugiere, la evidencia, los riesgos y lo que el análisis no sabe.

## Roles, permisos y vistas

El acceso se controla por **permisos** (RBAC). Cada rol tiene un conjunto de permisos que el administrador
edita en *Administración → Roles y permisos*. El menú muestra solo las vistas permitidas y el servidor
comprueba el permiso en cada petición, así que un cambio rige de inmediato, incluso en sesiones abiertas.

| Permiso | Vista o acción | Por defecto |
|---|---|---|
| `evaluar` | Mi finca: comparar rotaciones de sus parcelas | cliente |
| `ver_todas` | Ver parcelas y evaluaciones de todos (sin él, solo las propias) | operativo, monitoreo, administrador |
| `revisar` | Revisión técnica: nota para el agricultor | operativo, administrador |
| `reportes` | Monitoreo: tablero y reporte regional | operativo, monitoreo, administrador |
| `alertas` | Alertas climáticas en el teléfono | cliente, operativo, monitoreo |
| `usuarios` | Usuarios, roles y permisos (fijo para el administrador) | administrador |
| `respaldos` | Crear y restaurar respaldos | administrador |

La interfaz es responsive (escritorio y teléfono). Paleta: azul, naranja, amarillo y vino; tipografía Nunito.

## Respaldos

Cada día a la hora `BACKUP_HORA` (03:00 por defecto) el backend guarda un respaldo JSON de usuarios,
permisos, parcelas, evaluaciones y alertas en `Backend/respaldos/` y conserva los `BACKUP_RETENER` más
recientes. Si el servidor estaba apagado a esa hora, lo hace al arrancar. Desde *Administración → Respaldos*
se crea un respaldo manual o se restaura uno: hay que escribir su nombre para confirmar, y antes se guarda
el estado actual (`previo-…`) para poder deshacer. No se restaura un respaldo sin un administrador activo.
Funciona igual en modo memoria, así que sirve para recuperar los datos de una demo tras reiniciar.

Los archivos contienen hashes de contraseñas: la carpeta está fuera de git y conviene copiarla a otro disco.

## Alertas climáticas

Cada `ALERTAS_CADA_HORAS` (6 por defecto) el backend consulta los datos **diarios** de NASA POWER de cada
parcela y avisa por notificación web (Web Push) y/o SMS:

- **Helada**: alguna mínima de los últimos 3 días publicados ≤ `ALERTA_HELADA_C` (0 °C).
- **Sequía severa**: lluvia de los últimos 30 días < `ALERTA_SEQUIA_PCT` (30 %) de lo normal para esas fechas
  según la climatología de POWER; no se evalúa cuando lo normal es casi no llover (época seca).

Cada persona elige en la vista *Alertas* qué tipos y canales quiere, puede enviarse una alerta de prueba y
revisar sus parcelas al momento. Una misma helada (por día) o sequía (por semana) no se avisa dos veces.

- POWER publica los datos diarios con 2 a 4 días de retraso y no da pronósticos: las alertas avisan de
  condiciones ya medidas que suelen repetirse, no de eventos futuros.
- Las notificaciones web necesitan https o `localhost`; desde la IP de la red local el navegador no las permite.
  En iPhone hay que agregar el sitio a la pantalla de inicio.
- Sin `TWILIO_*` en `.env` los SMS se simulan: se escriben en la consola y en el historial.

## Cómo funciona

1. **Clima** — climatología mensual de [NASA POWER](https://power.larc.nasa.gov/) (temperatura mínima y máxima, lluvia) para las coordenadas.
2. **Balance hídrico** — evapotranspiración de referencia (Hargreaves) y demanda de cada cultivo (Kc); la diferencia con la lluvia es el riego necesario.
3. **Heladas** — meses con mínima media baja, cruzados con el calendario y la tolerancia de cada cultivo.
4. **Rotación** — puntaje de agua, heladas, suelo (leguminosas, alternancia de familias, raíz profunda, cobertura), ingreso y forraje, ponderado por las prioridades.

## Glosario y guía

Los indicadores de la interfaz (lluvia, evapotranspiración, mínima, mes seco, riego necesario, suelo desnudo,
puntaje, alertas de helada y sequía, NASA POWER) se muestran con línea punteada y un **?**. Al tocarlos se abre un
cuadro con la explicación en lenguaje cotidiano, un apoyo visual (escala o barras comparadas), un ejemplo práctico,
cómo lo usa Poseidon y la fuente del dato. En el teléfono el cuadro aparece como hoja inferior.

La vista *Glosario* (visible para todos los roles, sin permiso) reúne todos los términos con buscador, filtro por
tema y una guía rápida para leer la comparación. Incluye NDVI y humedad del suelo (SMAP) marcados como
“aún no se usa”, porque son índices satelitales comunes que Poseidon todavía no calcula.
Los textos están en `Frontend/src/glosario.js`.

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
cp .env.example .env      # completar MySQL, JWT_SECRET y DEMO_PASSWORD
npm install
npm run seed              # carga el catálogo y un usuario de demostración por rol
npm run dev

# 3. Frontend (puerto 5173), en otra terminal
cd Frontend
npm install
npm run dev
```

Pruebas del motor: `cd Backend && npm test`.

Los usuarios de demostración están en `Database/usuarios_demo.json`; su contraseña es el valor de `DEMO_PASSWORD`.

Sin MySQL el backend arranca en modo memoria: todo funciona, pero los datos se pierden al reiniciar.
Sin conexión a NASA POWER usa un clima de demostración de Cochabamba y la interfaz lo avisa.

## API

Todas las rutas, salvo el ingreso, requieren `Authorization: Bearer <token>`.

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | público | Ingreso; devuelve el usuario con sus permisos |
| GET | `/api/auth/yo` | sesión | Usuario y permisos vigentes |
| GET | `/api/cultivos`, `/api/clima?lat=&lon=` | sesión | Catálogo e indicadores de clima |
| POST | `/api/evaluar` | evaluar | Compara rotaciones y guarda la evaluación |
| GET | `/api/evaluaciones`, `/api/evaluaciones/:id` | sesión | Sin `ver_todas`, solo las propias; `?propias=1` las pide aunque lo tenga |
| PATCH | `/api/evaluaciones/:id/revision` | revisar | Marca como revisada con una nota |
| GET | `/api/monitoreo` | reportes | Totales, alertas y actividad |
| GET, POST, PATCH | `/api/usuarios` | usuarios | Gestión de usuarios |
| GET, PUT | `/api/permisos`, `/api/permisos/:rol` | usuarios | Matriz de permisos por rol |
| GET | `/api/sistema` | usuarios o respaldos | Estado de base, respaldos y alertas |
| GET, POST | `/api/respaldos` | respaldos | Lista y crea respaldos |
| POST | `/api/respaldos/:nombre/restaurar` | respaldos | Restaura; cuerpo `{ "confirmacion": "<nombre>" }` |
| GET | `/api/alertas` | alertas | Preferencias, historial y clave Web Push |
| PUT | `/api/alertas/preferencias` | alertas | Tipos (helada, sequía) y canales (web, SMS) |
| POST, DELETE | `/api/alertas/suscripcion` | alertas | Registra o quita este navegador |
| POST | `/api/alertas/prueba`, `/api/alertas/revisar` | alertas | Alerta de prueba; revisión inmediata |

## Límites conocidos

- Los valores del catálogo (Kc, ciclos, meses de siembra, valor de mercado) son referencias aproximadas y deben validarse con un agrónomo local.
- No usa datos de suelo de la parcela ni imágenes satelitales (NDVI, SMAP); son los siguientes pasos naturales.
- La herramienta apoya la decisión; no reemplaza el criterio del agricultor ni de un técnico local.
