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
| `ofertar` | Mis ventas: publicar cosecha y responder a compradores | cliente |
| `comprar` | Oferta sostenible: filtrar la oferta y enviar solicitudes | comprador |
| `incidencias` | Plagas en campo: marcar incidencias con GPS y fotos | operativo |
| `usuarios` | Usuarios, roles y permisos (fijo para el administrador) | administrador |
| `respaldos` | Crear y restaurar respaldos | administrador |

Roles: `cliente` es el **agricultor**; `comprador` es la **cooperativa o mercado local**. Un permiso nuevo llega a
una base existente con sus valores por defecto una sola vez (tabla `permisos_sembrados`), sin pisar los cambios del
administrador en los demás.

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

## Oferta sostenible y solicitudes de compra

El agricultor publica en *Mis ventas* un cultivo de una parcela que ya evaluó (cantidad, unidad, mes de
disponibilidad). La cooperativa o mercado ve esa oferta en *Oferta sostenible* y la filtra por:

- **Cultivo**.
- **Prácticas de rotación aplicadas**: leguminosa en la rotación, alternancia de familias, suelo cubierto
  (6 meses o menos desnudo) y raíz profunda. Se **calculan** con la rotación registrada, no las declara el productor.
- **Verificada**: un técnico revisó la evaluación de esa parcela. No es una certificación oficial.
- **Uso eficiente del agua**: el puntaje de agua de la rotación (0-100; alto ≥ 70, medio 40-69), con el riego
  estimado del cultivo y el % que cubre la lluvia. La lista se ordena por este indicador.
- **Zona**: municipio más cercano a la parcela (aproximado, `Backend/src/geo.js`).

El comprador no ve la parcela exacta (el mapa la aproxima a ~2 km), ni el correo ni el apellido del productor.
Desde una oferta envía una **solicitud** (intención de compra con cantidad, o solo contacto) con un mensaje;
el productor recibe un aviso web y la acepta o rechaza. **Solo al aceptar** cada uno ve el correo del otro, y el
teléfono del productor si decide compartirlo. Límites: 20 solicitudes por día y una pendiente por oferta.

## Plagas y enfermedades en campo

El técnico abre *Plagas en campo* en el teléfono, toma la ubicación con el GPS (o la corrige tocando el mapa, con
capa satelital), indica plaga, enfermedad o deficiencia, cultivo afectado, severidad, una nota y hasta 5 fotos.
Las fotos se reducen en el teléfono (1600 px, JPEG) antes de subir y pierden los metadatos EXIF.

Las incidencias **activas** de plagas y enfermedades a menos de 5 km, del último año, castigan las rotaciones que
siembran la familia atacada (más si la repiten dos campañas seguidas). La explicación de cada estrategia lo dice.
Al marcarla como *controlada* deja de contar. Monitoreo las ve en su mapa.

### Fotos en Google Drive (unidad compartida)

1. En Google Cloud, cree una **cuenta de servicio**, habilite la **API de Google Drive** y descargue su clave JSON.
2. Guárdela fuera de git, por ejemplo `Backend/credenciales/drive.json` (la carpeta está en `.gitignore`).
3. En Google Drive, abra la **unidad compartida** → *Administrar miembros* → agregue el `client_email` de la cuenta
   de servicio como **Gestor de contenido**.
4. En `Backend/.env`: `GOOGLE_DRIVE_CREDENTIALS=./credenciales/drive.json` y `GOOGLE_DRIVE_FOLDER_ID=<id>` (el id de
   la unidad compartida o de una carpeta dentro de ella, tomado de la URL).

Tiene que ser una unidad compartida: las cuentas de servicio no tienen cuota en "Mi unidad". Cada foto se nombra
`incidencia-<id>-<fecha>-<n>.jpg` y su descripción lleva tipo, agente, coordenadas y técnico. La aplicación las
muestra a través del backend, así que no hace falta compartirlas con cada usuario. *Administración → Sistema*
comprueba la conexión. Sin estas variables las fotos se guardan en `Backend/fotos/` (solo para pruebas) y la
interfaz lo avisa.

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
| GET | `/api/mis-ofertas` | ofertar | Ofertas propias y parcelas desde las que puede ofertar |
| POST, PATCH | `/api/ofertas`, `/api/ofertas/:id` | ofertar | Publica una oferta; la pausa o reactiva (`{ "activa": false }`) |
| GET | `/api/ofertas?cultivos=&practicas=&verificada=1&agua=media&zona=` | comprar | Oferta pública filtrada |
| POST | `/api/solicitudes` | comprar | Solicitud de compra o contacto |
| GET | `/api/solicitudes/enviadas`, `/api/solicitudes/recibidas` | comprar / ofertar | Historial con estado |
| PATCH | `/api/solicitudes/:id/respuesta` | ofertar | Acepta o rechaza (`{ estado, respuesta?, telefono? }`) |
| POST | `/api/solicitudes/:id/retirar` | comprar | Retira una solicitud pendiente |
| GET | `/api/incidencias` | incidencias o reportes | Incidencias con sus fotos y estado del almacén |
| POST, PATCH | `/api/incidencias`, `/api/incidencias/:id` | incidencias | Registra; marca activa o controlada |
| POST | `/api/incidencias/:id/fotos` | incidencias | Una foto por petición, cuerpo binario JPEG/PNG/WebP (≤ 8 MB) |
| GET | `/api/incidencias/:id/fotos/:foto` | incidencias o reportes | Devuelve la foto (desde Drive o local) |

## Límites conocidos

- Los valores del catálogo (Kc, ciclos, meses de siembra, valor de mercado) son referencias aproximadas y deben validarse con un agrónomo local.
- No usa datos de suelo de la parcela ni imágenes satelitales (NDVI, SMAP); son los siguientes pasos naturales.
- El indicador de agua de la oferta es una estimación con el clima típico; no mide el riego realmente aplicado.
- La zona de una oferta es el municipio cuyo centro está más cerca, no el límite municipal oficial.
- Las incidencias de campo no avisan todavía a los agricultores cercanos; influyen en sus próximas evaluaciones.
- El GPS del navegador, como las notificaciones, necesita https o `localhost`.
- La herramienta apoya la decisión; no reemplaza el criterio del agricultor ni de un técnico local.
