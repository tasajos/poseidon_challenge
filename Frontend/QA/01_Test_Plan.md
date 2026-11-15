# Plan de Pruebas (Test Plan) — Poseidon · Asesor de rotación de cultivos

| Campo | Valor |
|---|---|
| Identificador | TP-POSEIDON-001 |
| Versión del documento | 1.0 |
| Fecha | 2026-11-14 |
| Sistema bajo prueba | Poseidon (Frontend React + Vite, Backend Node.js + Express, MySQL / modo memoria) |
| Rama / build | `feature/asesor-rotacion` (commit `a877e38`) |
| Estándar de referencia | IEEE 829-2008 / ISO/IEC/IEEE 29119-3 (estructura del plan y de los casos) |
| Documentos relacionados | [02_High_Level_Test_Cases.md](02_High_Level_Test_Cases.md), [03_Test_Cases.md](03_Test_Cases.md), [03_Test_Cases.csv](03_Test_Cases.csv), `README.md` del proyecto, manual de usuario `Frontend/docs/` |

---

## 1. Introducción

Poseidon es una aplicación web responsive (escritorio y teléfono) creada para el NASA Space Apps Challenge 2026
(reto *Field Shift*). El agricultor registra su parcela, indica su rotación actual y sus prioridades, y el sistema
compara **tres estrategias de rotación** (actual, ajuste y cambio mayor) con datos de NASA POWER (clima), SRTM
(pendiente) y MODIS (NDVI). Alrededor de ese núcleo hay asistencia técnica, monitoreo regional, alertas climáticas,
un mercado de oferta sostenible, registro de plagas en campo y administración (usuarios, permisos, respaldos).

Este plan define **qué se prueba, cómo, con qué datos, quién y con qué criterios** se da por aceptada la versión.

## 2. Objetivos

1. Verificar que cada funcionalidad cumple las historias de usuario (HU) implementadas.
2. Verificar el control de acceso por permisos (RBAC) en la interfaz **y** en la API.
3. Verificar validaciones de datos, mensajes de error y casos límite.
4. Verificar la privacidad de datos entre roles (comprador, monitoreo, técnico, agricultor).
5. Verificar el comportamiento ante fallas de servicios externos (NASA POWER, SRTM, MODIS, GAMC, Drive, Twilio, MySQL).
6. Verificar requisitos no funcionales clave: responsive, modo de bajo consumo, rendimiento en 3G, seguridad básica.

## 3. Alcance

### 3.1 Funcionalidades dentro del alcance

| Módulo | Código | Historias de usuario | Rol principal |
|---|---|---|---|
| Autenticación y sesión | AUT | — | Todos |
| Roles, permisos y navegación (RBAC) | RBAC | HU-ADM-04 | Todos |
| Administración: usuarios y aprobación | ADM | HU-ADM-01 | administrador |
| Administración: permisos, auditoría, asignación, sistema, catálogo | ADM | HU-ADM-01, HU-ADM-04, HU-OPT-01 | administrador |
| Respaldos y restauración | RES | — | administrador |
| Registro de parcelas (asistente en 3 pasos) | PAR | HU-USR-01 | cliente (agricultor) |
| Ficha de parcela: terreno, historial, NDVI, fuentes | FIC | HU-USR-02, HU-USR-05, HU-OPT-01 | cliente, operativo |
| Comparar rotaciones y adopción | ROT | HU-USR-01, HU-USR-05, HU-OPT-02, HU-MON-03 | cliente |
| Mis evaluaciones | EVA | HU-OPT-04 | cliente |
| Modo de bajo consumo | LIG | HU-USR-06 | cliente |
| Asistencia técnica: parcelas, revisión, validaciones, visitas | OPT | HU-OPT-01, HU-OPT-03, HU-OPT-04 | operativo |
| Monitoreo regional | MON | HU-MON-01 a HU-MON-04 | monitoreo |
| Alertas climáticas | ALE | HU-USR-03 | cliente, operativo, monitoreo |
| Mis ventas (oferta y solicitudes recibidas) | VEN | HU-CLI-02, HU-CLI-03, HU-CLI-04 | cliente |
| Oferta sostenible (comprador) | COM | HU-CLI-02, HU-CLI-03, HU-CLI-04 | comprador |
| Plagas y enfermedades en campo | CAM | HU-OPT-02 | operativo |
| Glosario y guía | GLO | HU-USR-04 | Todos |
| No funcionales: responsive, rendimiento, seguridad, resiliencia, accesibilidad | NFR | HU-USR-06 | — |

### 3.2 Fuera del alcance

- Exactitud científica de los datos de NASA (POWER, SRTM, MODIS) y de los valores agronómicos del catálogo (Kc,
  ciclos, valor de mercado). Se prueba que se consumen y muestran correctamente, no que sean agronómicamente exactos.
- Pruebas de carga y estrés a gran escala (más de 50 usuarios concurrentes).
- Pentesting completo; solo se incluyen verificaciones de seguridad funcional (RBAC, IDOR, XSS, inyección de fórmulas CSV).
- Entrega real de SMS (Twilio) y Google Drive en producción si las credenciales no se proveen; en ese caso se prueba
  el modo simulado/local.
- Pruebas unitarias del motor (ya cubiertas por `Backend/test/*.test.js`; se ejecutan como prueba de humo).

## 4. Referencias

- `README.md` (raíz): roles, permisos, reglas de negocio, API.
- `Frontend/docs/01..08-*.md`: manual de usuario por rol.
- `Database/schema.sql`, `Database/cultivos.json`, `Database/usuarios_demo.json`.
- `Backend/test/`: pruebas automáticas existentes (`npm test`).

## 5. Enfoque y estrategia de pruebas

### 5.1 Niveles de prueba

| Nivel | Descripción | Responsable |
|---|---|---|
| Componente (unitarias) | `cd Backend && npm test` (motor de rotación, alertas, agregados, ofertas, plagas). Se ejecuta como **smoke** antes de cada ciclo. | Desarrollo / QA |
| Integración API | Peticiones directas a `/api/*` (Postman, curl o Thunder Client) para validar permisos, códigos HTTP y validaciones del servidor. | QA |
| Sistema (E2E manual) | Flujos completos en el navegador por rol, según [03_Test_Cases.md](03_Test_Cases.md). | QA |
| Aceptación | Recorrido de los casos de alto nivel con un representante de negocio / jurado. | QA + Product Owner |

### 5.2 Tipos de prueba

- **Funcional** positiva y negativa (validación de campos, mensajes de error).
- **Valores límite y particiones de equivalencia** (rotación 2–4 cultivos, prioridades 0–5, escenarios −60/+20 % y
  0/+5 °C, superficie 0–5000 ha, perímetro 3–60 vértices, fotos ≤ 5 y ≤ 8 MB, mensaje ≥ 10 caracteres, etc.).
- **Seguridad funcional / RBAC**: cada endpoint con y sin permiso (403), sin token (401), acceso a recursos de otro
  usuario (404 – IDOR), privacidad de datos para comprador y monitoreo.
- **Regresión**: re-ejecución de los casos de prioridad Alta tras cada corrección.
- **Usabilidad y responsive**: 375 px (móvil), 768 px (tablet), 1366 px (escritorio).
- **Compatibilidad**: Chrome, Edge, Firefox (escritorio); Chrome Android y Safari iOS.
- **Rendimiento**: carga inicial en 3G simulado (DevTools) con build de producción.
- **Resiliencia**: sin MySQL (modo memoria), sin internet hacia NASA (clima demo), servicios opcionales no configurados.
- **Exploratoria**: sesiones de 60 min por módulo con charter documentado.

### 5.3 Técnicas de diseño

Particiones de equivalencia, análisis de valores límite, tablas de decisión (matriz rol × permiso, filtros de
oferta, aprobación con doble control), transición de estados (cuenta pendiente → activa/rechazada; solicitud
pendiente → aceptada/rechazada/retirada; incidencia activa ↔ controlada; oferta activa ↔ pausada) y casos de uso.

## 6. Criterios de entrada, salida, suspensión y reanudación

### 6.1 Criterios de entrada
- Build desplegado en el ambiente de QA; `GET /api/health` responde `{ ok: true }`.
- Base de datos creada con `Database/schema.sql` y `npm run seed` ejecutado (usuarios demo y catálogo).
- `npm test` del backend en verde.
- Datos de prueba de la sección 8 cargados.

### 6.2 Criterios de salida (aceptación)
- 100 % de los casos de prioridad **Alta** ejecutados y ≥ 95 % aprobados.
- ≥ 90 % del total de casos ejecutados.
- 0 defectos abiertos de severidad **Crítica** o **Alta**.
- Defectos de severidad Media con plan de corrección acordado.
- Informe de resultados (sección 13) firmado.

### 6.3 Criterios de suspensión
- El login o la carga de la aplicación fallan para cualquier rol.
- El backend se cae de forma repetida (> 3 veces por hora).
- Más del 30 % de los casos de un módulo bloqueados por un mismo defecto.

### 6.4 Criterios de reanudación
- Defecto bloqueante corregido y verificado con la prueba de humo (casos HLTC marcados *Smoke*).

## 7. Ambiente de pruebas

| Elemento | Configuración |
|---|---|
| Frontend | `cd Frontend && npm run dev` → http://localhost:5173 (desarrollo) y `npm run build && npm run preview` (producción, para rendimiento y service worker) |
| Backend | `cd Backend && npm run dev` → http://localhost:3001 |
| Base de datos | MySQL 8 con `schema.sql`; adicionalmente una corrida en **modo memoria** (sin MySQL) |
| Variables `.env` | `JWT_SECRET`, `DEMO_PASSWORD`, `BACKUP_HORA`, `BACKUP_RETENER`, `ALERTAS_CADA_HORAS`, `ALERTA_HELADA_C`, `ALERTA_SEQUIA_PCT`; opcionales `TWILIO_*`, `GOOGLE_DRIVE_*`, `GAMC_WMS_*`, `ELEVACION_URL` |
| Navegadores | Chrome ≥ 120, Edge ≥ 120, Firefox ≥ 120, Safari iOS ≥ 16, Chrome Android |
| Dispositivos | PC Windows 11; teléfono Android con GPS; iPhone (prueba de notificación instalando el sitio en la pantalla de inicio) |
| Herramientas | DevTools (network throttling, device toolbar, Lighthouse), Postman/curl, Excel/LibreOffice (CSV), gestor de defectos (Jira/GitHub Issues) |
| Red | Notificaciones web y GPS requieren `https` o `localhost` |

## 8. Datos de prueba

### 8.1 Usuarios demo (contraseña = valor de `DEMO_PASSWORD` del `.env`)

| Rol | Usuario | Uso |
|---|---|---|
| administrador | admin@poseidon.test | Administración, respaldos, asignación |
| operativo (técnico) | operativo@poseidon.test | Asistencia técnica, plagas en campo, alertas |
| cliente (agricultor) | cliente@poseidon.test | Mi finca, ventas, alertas |
| monitoreo | monitoreo@poseidon.test | Monitoreo regional, alertas |
| comprador | comprador@poseidon.test | Oferta sostenible |

### 8.2 Usuarios adicionales a crear durante la prueba
- `admin2@poseidon.test` (administrador, para el doble control de aprobación).
- `agricultor2@poseidon.test`, `agricultor3@poseidon.test` (cliente, para agregados ≥ 3 productores por zona e IDOR).
- `tecnico2@poseidon.test` (operativo, para asignación y aislamiento entre técnicos).
- `comprador2@poseidon.test` (comprador, para límites de solicitudes).

### 8.3 Ubicaciones de referencia (Cochabamba)

| Nombre | Lat, Lon | Uso |
|---|---|---|
| Cochabamba centro | -17.3895, -66.1568 | Ubicación por defecto |
| Tiquipaya | -17.3380, -66.2150 | Zona conocida |
| Ladera (Sacaba alto) | -17.3700, -66.0300 | Pendiente media/alta (verificar valor real en la ficha) |
| Fuera de zona | 40.4168, -3.7038 (Madrid) | Aviso "fuera de las zonas de Cochabamba" |
| Inválida | 95, -200 | Error de coordenadas |

### 8.4 Catálogo de cultivos
papa, maíz, haba, tarwi, quinua, trigo, cebada, avena forrajera, alfalfa, cebolla (`Database/cultivos.json`).

### 8.5 Archivos
- Fotos JPEG/PNG/WebP de 200 KB, 5 MB y una de > 8 MB; una foto con metadatos EXIF de GPS; un archivo `.pdf` renombrado a `.jpg`.

## 9. Entregables de prueba

| Entregable | Archivo |
|---|---|
| Plan de pruebas | `Frontend/QA/01_Test_Plan.md` |
| Casos de prueba de alto nivel | `Frontend/QA/02_High_Level_Test_Cases.md` |
| Casos de prueba detallados | `Frontend/QA/03_Test_Cases.md` (lectura) y `Frontend/QA/03_Test_Cases.csv` (ejecución en Excel) |
| Registro de defectos | Gestor de defectos (plantilla en sección 12) |
| Informe de resultados | `Frontend/QA/04_Test_Summary_Report.md` (a elaborar al cierre) |

## 10. Cronograma estimado

| Actividad | Duración |
|---|---|
| Preparación de ambiente y datos | 0,5 día |
| Smoke test (HLTC Smoke + `npm test`) | 0,5 día |
| Ciclo 1: ejecución completa de casos detallados | 4 días |
| Reporte y corrección de defectos | 2 días (en paralelo) |
| Ciclo 2: re-test + regresión de prioridad Alta | 1,5 días |
| Pruebas no funcionales y compatibilidad | 1 día |
| Informe de cierre | 0,5 día |
| **Total** | **≈ 10 días hábiles** |

## 11. Roles y responsabilidades

| Rol | Responsabilidad |
|---|---|
| QA Lead | Mantener el plan, priorizar, aprobar el cierre |
| QA Analyst | Ejecutar casos, registrar evidencias y defectos |
| Desarrollador | Corregir defectos, apoyar con ambiente y datos |
| Product Owner | Aclarar reglas de negocio, aceptar la versión |

## 12. Gestión de defectos

### 12.1 Severidad

| Severidad | Definición | Ejemplo |
|---|---|---|
| Crítica | Bloquea el sistema o expone datos privados | Login caído; comprador ve correo del productor sin aceptar |
| Alta | Funcionalidad principal no funciona sin alternativa | No se pueden comparar rotaciones |
| Media | Funcionalidad falla con alternativa o regla de negocio secundaria incorrecta | El CSV de visitas no respeta el filtro de fechas |
| Baja | Cosmético, texto, alineación | Error ortográfico en un mensaje |

### 12.2 Prioridad
P1 (corregir ya), P2 (antes del cierre del ciclo), P3 (próxima versión).

### 12.3 Plantilla de reporte de defecto
ID · Título · Módulo · Caso de prueba relacionado · Ambiente/navegador · Rol y usuario · Pasos para reproducir ·
Resultado esperado · Resultado obtenido · Evidencia (captura, HAR, consola) · Severidad · Prioridad · Estado.

### 12.4 Ciclo de vida
Nuevo → Asignado → En corrección → Resuelto → Re-test → Cerrado / Reabierto.

## 13. Métricas e informe

- Casos planificados / ejecutados / aprobados / fallidos / bloqueados por módulo.
- Defectos por severidad, por módulo y tasa de reapertura.
- Cobertura de historias de usuario (matriz de trazabilidad en [02_High_Level_Test_Cases.md](02_High_Level_Test_Cases.md)).

## 14. Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| NASA POWER / ORNL DAAC / OpenTopoData lentos o caídos | Resultados con clima demo, NDVI o pendiente no disponibles | Probar explícitamente el modo degradado (casos NFR); repetir casos dependientes cuando el servicio vuelva |
| NDVI tarda decenas de segundos o minutos | Casos de ficha bloqueados | Ejecutar esos casos al final de la jornada, tras registrar parcelas por la mañana |
| Notificaciones/GPS requieren https | No se pueden probar desde la IP de la red local | Usar `localhost` o un túnel https |
| Sin credenciales de Twilio/Drive | No se prueba entrega real | Probar modo simulado (consola/historial) y almacenamiento local de fotos |
| Agregados exigen ≥ 3 productores por zona | Tableros vacíos con pocos datos | Crear 3 agricultores con parcelas en la misma zona (datos 8.2) |
| Límite de 20 intentos de login por IP en 15 min | Bloqueo del equipo de QA | Reiniciar el backend o esperar 15 min tras el caso de prueba de límite |
| Modo memoria pierde datos al reiniciar | Pérdida de datos de prueba | Usar MySQL para el ciclo principal; crear respaldo manual antes de reiniciar |

## 15. Supuestos y dependencias

- Los usuarios demo existen y `DEMO_PASSWORD` es conocida por QA.
- El ambiente tiene salida a internet para los servicios de NASA (excepto en los casos de resiliencia).
- Las reglas de negocio documentadas en `README.md` son la fuente de verdad del resultado esperado.

## 16. Aprobaciones

| Rol | Nombre | Firma | Fecha |
|---|---|---|---|
| QA Lead | | | |
| Product Owner | | | |
| Líder de desarrollo | | | |
