# Casos de prueba de alto nivel (High Level Test Cases) — Poseidon

| Campo | Valor |
|---|---|
| Identificador | HLTC-POSEIDON-001 |
| Versión | 1.0 |
| Fecha | 2026-11-14 |
| Plan de pruebas | [01_Test_Plan.md](01_Test_Plan.md) |
| Casos detallados | [03_Test_Cases.md](03_Test_Cases.md) · [03_Test_Cases.csv](03_Test_Cases.csv) |

## Propósito

Los casos de alto nivel describen **qué** se valida (escenario y objetivo) sin detallar los pasos. Sirven para
planificar la cobertura, revisar con negocio, priorizar la ejecución y armar la prueba de humo. Cada HLTC se
descompone en uno o más casos detallados (columna *Casos detallados*).

## Formato

| Columna | Descripción |
|---|---|
| ID | `HLTC-<MÓDULO>-<nn>` |
| Escenario | Nombre corto de la condición a probar |
| Objetivo | Qué debe demostrar la prueba |
| Prioridad | Alta / Media / Baja según impacto en el negocio y riesgo |
| HU | Historia de usuario cubierta (trazabilidad) |
| Smoke | ✔ = forma parte de la prueba de humo de cada build |
| Casos detallados | Casos `TC-…` que lo implementan |

## Resumen

- **54** escenarios de alto nivel, **161** casos detallados.
- Prioridad: Alta 34 · Media 19 · Baja 1.
- Prueba de humo: **12** escenarios (marcados con ✔).

## Escenarios por módulo

### AUT · Autenticación y sesión

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-AUT-01 | Ingreso exitoso con cada rol | Cada rol ingresa y llega a su vista de inicio. | Alta | — | ✔ | TC-AUT-001, TC-AUT-002 |
| HLTC-AUT-02 | Ingreso rechazado | Credenciales erróneas, cuentas pendientes o inactivas no ingresan y el mensaje no revela qué cuentas existen. | Alta | — | ✔ | TC-AUT-003, TC-AUT-004, TC-AUT-005, TC-AUT-006, TC-AUT-007, TC-AUT-008 |
| HLTC-AUT-03 | Límite de intentos de ingreso | Más de 20 intentos en 15 min desde la misma IP se bloquean. | Media | — |  | TC-AUT-009 |
| HLTC-AUT-04 | Ciclo de vida de la sesión | Salir, recargar, token inválido o usuario desactivado durante la sesión. | Alta | — |  | TC-AUT-010, TC-AUT-011, TC-AUT-012, TC-AUT-013 |

### RBAC · Roles, permisos y navegación

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-RBAC-01 | Menú según permisos del rol | El menú muestra solo las vistas permitidas por los permisos por defecto de cada rol. | Alta | HU-ADM-04 | ✔ | TC-RBAC-001 |
| HLTC-RBAC-02 | El servidor aplica los permisos | Las rutas de la API responden 401 sin sesión y 403 sin permiso, aunque se llamen fuera de la interfaz. | Alta | HU-ADM-04 |  | TC-RBAC-002, TC-RBAC-003 |
| HLTC-RBAC-03 | Cambio de permisos en caliente | Un permiso retirado deja de regir de inmediato en sesiones abiertas. | Alta | HU-ADM-04 |  | TC-RBAC-004, TC-RBAC-005 |

### ADM · Administración

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-ADM-01 | Registro de usuarios | Alta de cuentas con validación por campo; los roles con privilegios quedan pendientes. | Alta | HU-ADM-01 | ✔ | TC-ADM-001, TC-ADM-002, TC-ADM-003, TC-ADM-004, TC-ADM-005 |
| HLTC-ADM-02 | Aprobación de cuentas con doble control | Aprobar o rechazar cuentas pendientes respetando el doble control entre administradores. | Alta | HU-ADM-01 |  | TC-ADM-006, TC-ADM-007, TC-ADM-008, TC-ADM-009 |
| HLTC-ADM-03 | Cambio de rol y activación | Cambiar rol, activar y desactivar usuarios con sus restricciones. | Alta | HU-ADM-01 |  | TC-ADM-010, TC-ADM-011, TC-ADM-012, TC-ADM-013 |
| HLTC-ADM-04 | Matriz de roles y permisos | Otorgar y retirar permisos por rol; el permiso fijo del administrador no se puede quitar. | Alta | HU-ADM-04 |  | TC-ADM-014, TC-ADM-015 |
| HLTC-ADM-05 | Auditoría | Registro de acciones administrativas con actor y fecha, sin credenciales. | Media | HU-ADM-01 |  | TC-ADM-016, TC-ADM-017 |
| HLTC-ADM-06 | Asignación de parcelas a técnicos | Reparto automático por carga y reasignación manual. | Alta | HU-OPT-01 |  | TC-ADM-018, TC-ADM-019, TC-ADM-020 |
| HLTC-ADM-07 | Estado del sistema y catálogo | Panel de estado (base, respaldos, alertas, SMS, fotos) y catálogo de cultivos. | Baja | — |  | TC-ADM-021, TC-ADM-022 |

### RES · Respaldos y restauración

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-RES-01 | Respaldo manual y automático | Crear respaldos manuales y verificar el respaldo diario con retención. | Media | — |  | TC-RES-001, TC-RES-004, TC-RES-005 |
| HLTC-RES-02 | Restauración segura | Restaurar exige escribir el nombre y guarda antes el estado actual (previo-…). | Alta | — |  | TC-RES-002, TC-RES-003 |

### PAR · Registro de parcelas

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-PAR-01 | Registrar parcela por punto | Asistente de 3 pasos con punto en el mapa, coordenadas o GPS. | Alta | HU-USR-01 | ✔ | TC-PAR-001, TC-PAR-002, TC-PAR-003, TC-PAR-004 |
| HLTC-PAR-02 | Registrar parcela por perímetro | Dibujar el perímetro calcula la superficie y valida el polígono. | Alta | HU-USR-01 |  | TC-PAR-005, TC-PAR-006, TC-PAR-007, TC-PAR-008 |
| HLTC-PAR-03 | Validaciones del registro | Nombre, coordenadas, superficie, campos opcionales, avisos y corrección desde el resumen. | Alta | HU-USR-01 |  | TC-PAR-009, TC-PAR-010, TC-PAR-011, TC-PAR-012, TC-PAR-013, TC-PAR-014, TC-PAR-015 |

### FIC · Ficha de parcela

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-FIC-01 | Ficha y terreno (SRTM) | La ficha muestra pendiente, riesgo de erosión y cultivos de cobertura. | Alta | HU-USR-05 |  | TC-FIC-001, TC-FIC-002, TC-FIC-003 |
| HLTC-FIC-02 | Historial de campañas | Agregar y quitar campañas pasadas con rendimiento. | Media | HU-USR-02 |  | TC-FIC-004, TC-FIC-005, TC-FIC-006 |
| HLTC-FIC-03 | NDVI de MODIS | El NDVI se consulta en segundo plano y se grafica por año y época. | Media | HU-USR-02 |  | TC-FIC-007 |
| HLTC-FIC-04 | Fuentes de datos y corrección | Origen de cada dato y corrección de los datos declarados; acceso solo a parcelas visibles. | Alta | HU-OPT-01 |  | TC-FIC-008, TC-FIC-009, TC-FIC-010 |

### ROT · Comparar rotaciones

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-ROT-01 | Comparar tres estrategias | La comparación devuelve actual, ajuste y cambio mayor con porqué, evidencia, riesgos y vacíos. | Alta | HU-USR-01 | ✔ | TC-ROT-001, TC-ROT-002 |
| HLTC-ROT-02 | Reglas de la rotación | De 2 a 4 cultivos distintos del catálogo. | Alta | HU-USR-01 |  | TC-ROT-003, TC-ROT-004 |
| HLTC-ROT-03 | Prioridades del agricultor | Los deslizadores 0-5 ponderan el puntaje. | Media | HU-USR-01 |  | TC-ROT-005, TC-ROT-006 |
| HLTC-ROT-04 | Factores de contexto | Ladera, plagas cercanas y clima de demostración modifican o avisan en la comparación. | Alta | HU-USR-05, HU-OPT-02 |  | TC-ROT-007, TC-ROT-008, TC-ROT-009 |
| HLTC-ROT-05 | Adopción de una estrategia | El agricultor marca la estrategia que aplicará. | Media | HU-MON-03 |  | TC-ROT-010 |

### EVA · Mis evaluaciones

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-EVA-01 | Historial de evaluaciones | Listado, nota del técnico y observaciones locales; aislamiento entre agricultores. | Alta | HU-OPT-04 |  | TC-EVA-001, TC-EVA-002, TC-EVA-003 |

### LIG · Modo de bajo consumo

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-LIG-01 | Modo de bajo consumo | Activación manual y automática, contenido reducido, sin descargas pesadas, service worker. | Alta | HU-USR-06 |  | TC-LIG-001, TC-LIG-002, TC-LIG-003, TC-LIG-004, TC-LIG-005 |

### OPT · Asistencia técnica

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-OPT-01 | Parcelas asignadas del técnico | El técnico ve solo sus parcelas asignadas. | Alta | HU-OPT-01 | ✔ | TC-OPT-001, TC-OPT-002 |
| HLTC-OPT-02 | Revisión con nota técnica | El técnico revisa evaluaciones y deja una nota para el agricultor. | Alta | HU-OPT-01 |  | TC-OPT-003, TC-OPT-004 |
| HLTC-OPT-03 | Validación local de estrategias | Observación por estrategia y disponibilidad de semilla; historial por zona. | Media | HU-OPT-04 |  | TC-OPT-005, TC-OPT-006 |
| HLTC-OPT-04 | Visitas técnicas | Registro de visitas, resumen por período y exportación CSV. | Media | HU-OPT-03 |  | TC-OPT-007, TC-OPT-008, TC-OPT-009, TC-OPT-010 |

### MON · Monitoreo regional

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-MON-01 | Panorama regional con privacidad | Mapa y tabla por zona; agregados con mínimo de 3 productores; detalle solo con ver_todas. | Alta | HU-MON-01 | ✔ | TC-MON-001, TC-MON-002, TC-MON-003, TC-MON-004, TC-MON-010 |
| HLTC-MON-02 | Escenarios de agua | Simulación de lluvia y temperatura con límites y niveles de riesgo. | Media | HU-MON-02 |  | TC-MON-005, TC-MON-006 |
| HLTC-MON-03 | Adopción regional | Porcentaje de adopción por zona a partir de lo que marcan los agricultores. | Media | HU-MON-03 |  | TC-MON-007 |
| HLTC-MON-04 | Suelo desnudo | Porcentaje con NDVI < 0,2 por año y época y exportación de zonas prioritarias. | Media | HU-MON-04 |  | TC-MON-008, TC-MON-009 |

### ALE · Alertas climáticas

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-ALE-01 | Preferencias de alertas | Tipos y canales, teléfono obligatorio para SMS. | Media | HU-USR-03 |  | TC-ALE-001, TC-ALE-002, TC-ALE-008 |
| HLTC-ALE-02 | Notificaciones del dispositivo | Activar y desactivar Web Push en el navegador. | Media | HU-USR-03 |  | TC-ALE-003, TC-ALE-004 |
| HLTC-ALE-03 | Prueba, revisión y antiduplicado | Alerta de prueba, revisión inmediata con límite y no repetición de eventos. | Media | HU-USR-03 |  | TC-ALE-005, TC-ALE-006, TC-ALE-007 |

### VEN · Mis ventas

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-VEN-01 | Publicar y gestionar oferta | Publicar cosecha desde una parcela evaluada, pausar y reactivar. | Alta | HU-CLI-02 | ✔ | TC-VEN-001, TC-VEN-002, TC-VEN-003, TC-VEN-004, TC-VEN-005 |
| HLTC-VEN-02 | Responder solicitudes | Aceptar o rechazar solicitudes; el contacto se comparte solo al aceptar. | Alta | HU-CLI-03 |  | TC-VEN-006, TC-VEN-007, TC-VEN-008, TC-VEN-009 |

### COM · Oferta sostenible (comprador)

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-COM-01 | Explorar y filtrar oferta | Filtros por cultivo, prácticas, verificada, agua, zona y sello; orden por agua. | Alta | HU-CLI-02, HU-CLI-04 | ✔ | TC-COM-001, TC-COM-002, TC-COM-003, TC-COM-004, TC-COM-005, TC-COM-006 |
| HLTC-COM-02 | Privacidad del productor | El comprador no ve ubicación exacta, correo ni apellido. | Alta | HU-CLI-02 |  | TC-COM-007 |
| HLTC-COM-03 | Solicitudes de compra o contacto | Envío, límites, retiro y contacto tras la aceptación. | Alta | HU-CLI-03 |  | TC-COM-008, TC-COM-009, TC-COM-010, TC-COM-011, TC-COM-012, TC-COM-013, TC-COM-014 |

### CAM · Plagas y enfermedades en campo

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-CAM-01 | Registrar incidencia con GPS y fotos | Ubicación, tipo, agente, severidad y hasta 5 fotos. | Alta | HU-OPT-02 | ✔ | TC-CAM-001, TC-CAM-002, TC-CAM-003, TC-CAM-004, TC-CAM-005, TC-CAM-006 |
| HLTC-CAM-02 | Estado y consulta de incidencias | Marcar activa/controlada; monitoreo consulta sin poder registrar. | Media | HU-OPT-02 |  | TC-CAM-007, TC-CAM-008 |

### GLO · Glosario y guía

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-GLO-01 | Glosario y ayudas contextuales | Términos con ?, cuadro emergente, vista Glosario con buscador y filtro. | Media | HU-USR-04 |  | TC-GLO-001, TC-GLO-002, TC-GLO-003, TC-GLO-004 |

### NFR · No funcionales

| ID | Escenario | Objetivo | Prioridad | HU | Smoke | Casos detallados |
|---|---|---|---|---|---|---|
| HLTC-NFR-01 | Responsive y compatibilidad | Móvil, tablet y escritorio en los navegadores soportados. | Alta | HU-USR-06 |  | TC-NFR-001, TC-NFR-002 |
| HLTC-NFR-02 | Rendimiento en redes lentas | Tiempos de carga en 3G con la compilación de producción. | Media | HU-USR-06 |  | TC-NFR-003 |
| HLTC-NFR-03 | Resiliencia ante servicios caídos | Modo memoria sin MySQL y avisos cuando faltan servicios externos. | Alta | — |  | TC-NFR-004, TC-NFR-010 |
| HLTC-NFR-04 | Seguridad funcional | XSS, inyección de fórmulas en CSV, tamaño de cuerpo, IDOR. | Alta | — |  | TC-NFR-005, TC-NFR-006, TC-NFR-007 |
| HLTC-NFR-05 | Accesibilidad y pruebas automáticas | Navegación con teclado, etiquetas y suite unitaria del backend. | Media | — | ✔ | TC-NFR-008, TC-NFR-009 |

## Prueba de humo (Smoke test)

Ejecutar en este orden en cada build nuevo antes del ciclo completo:

1. **HLTC-AUT-01** — Ingreso exitoso con cada rol: TC-AUT-001 (Ingreso exitoso del administrador).
2. **HLTC-AUT-02** — Ingreso rechazado: TC-AUT-003 (Contraseña incorrecta).
3. **HLTC-RBAC-01** — Menú según permisos del rol: TC-RBAC-001 (Menú por defecto de cada rol).
4. **HLTC-ADM-01** — Registro de usuarios: TC-ADM-001 (Registrar un agricultor (cuenta activa)).
5. **HLTC-PAR-01** — Registrar parcela por punto: TC-PAR-001 (Registrar parcela marcando un punto en el mapa).
6. **HLTC-ROT-01** — Comparar tres estrategias: TC-ROT-001 (Comparar rotaciones de una parcela registrada).
7. **HLTC-OPT-01** — Parcelas asignadas del técnico: TC-OPT-001 (El técnico ve solo sus parcelas asignadas).
8. **HLTC-MON-01** — Panorama regional con privacidad: TC-MON-001 (Panorama regional).
9. **HLTC-VEN-01** — Publicar y gestionar oferta: TC-VEN-001 (Publicar cosecha).
10. **HLTC-COM-01** — Explorar y filtrar oferta: TC-COM-001 (Listado de oferta disponible).
11. **HLTC-CAM-01** — Registrar incidencia con GPS y fotos: TC-CAM-001 (Registrar incidencia con GPS y fotos).
12. **HLTC-NFR-05** — Accesibilidad y pruebas automáticas: TC-NFR-008 (Navegación con teclado y etiquetas).

## Matriz de trazabilidad (Historia de usuario → casos)

| Historia de usuario | Escenarios de alto nivel | Casos detallados | Total casos |
|---|---|---|---|
| HU-ADM-01 | HLTC-ADM-01, HLTC-ADM-02, HLTC-ADM-03, HLTC-ADM-05 | TC-ADM-001, TC-ADM-002, TC-ADM-003, TC-ADM-004, TC-ADM-005, TC-ADM-006, TC-ADM-007, TC-ADM-008, TC-ADM-009, TC-ADM-010, TC-ADM-011, TC-ADM-012, TC-ADM-013, TC-ADM-016, TC-ADM-017 | 15 |
| HU-ADM-04 | HLTC-RBAC-01, HLTC-RBAC-02, HLTC-RBAC-03, HLTC-ADM-04 | TC-RBAC-001, TC-RBAC-002, TC-RBAC-003, TC-RBAC-004, TC-RBAC-005, TC-ADM-014, TC-ADM-015 | 7 |
| HU-CLI-02 | HLTC-VEN-01, HLTC-COM-01, HLTC-COM-02 | TC-VEN-001, TC-VEN-002, TC-VEN-003, TC-VEN-004, TC-VEN-005, TC-COM-001, TC-COM-002, TC-COM-003, TC-COM-004, TC-COM-005, TC-COM-007 | 11 |
| HU-CLI-03 | HLTC-VEN-02, HLTC-COM-03 | TC-VEN-006, TC-VEN-007, TC-VEN-008, TC-VEN-009, TC-COM-008, TC-COM-009, TC-COM-010, TC-COM-011, TC-COM-012, TC-COM-013, TC-COM-014 | 11 |
| HU-CLI-04 | HLTC-COM-01 | TC-COM-006 | 1 |
| HU-MON-01 | HLTC-MON-01 | TC-MON-001, TC-MON-002, TC-MON-003, TC-MON-004, TC-MON-010 | 5 |
| HU-MON-02 | HLTC-MON-02 | TC-MON-005, TC-MON-006 | 2 |
| HU-MON-03 | HLTC-ROT-05, HLTC-MON-03 | TC-ROT-010, TC-MON-007 | 2 |
| HU-MON-04 | HLTC-MON-04 | TC-MON-008, TC-MON-009 | 2 |
| HU-OPT-01 | HLTC-ADM-06, HLTC-FIC-04, HLTC-OPT-01, HLTC-OPT-02 | TC-ADM-018, TC-ADM-019, TC-ADM-020, TC-FIC-008, TC-FIC-010, TC-OPT-001, TC-OPT-002, TC-OPT-003, TC-OPT-004 | 9 |
| HU-OPT-02 | HLTC-ROT-04, HLTC-CAM-01, HLTC-CAM-02 | TC-ROT-008, TC-CAM-001, TC-CAM-002, TC-CAM-003, TC-CAM-004, TC-CAM-005, TC-CAM-006, TC-CAM-007, TC-CAM-008 | 9 |
| HU-OPT-03 | HLTC-OPT-04 | TC-OPT-007, TC-OPT-008, TC-OPT-009, TC-OPT-010 | 4 |
| HU-OPT-04 | HLTC-EVA-01, HLTC-OPT-03 | TC-EVA-001, TC-EVA-002, TC-EVA-003, TC-OPT-005, TC-OPT-006 | 5 |
| HU-USR-01 | HLTC-PAR-01, HLTC-PAR-02, HLTC-PAR-03, HLTC-ROT-01, HLTC-ROT-02, HLTC-ROT-03 | TC-PAR-001, TC-PAR-002, TC-PAR-003, TC-PAR-004, TC-PAR-005, TC-PAR-006, TC-PAR-007, TC-PAR-008, TC-PAR-009, TC-PAR-010, TC-PAR-011, TC-PAR-012, TC-PAR-013, TC-PAR-014, TC-PAR-015, TC-FIC-009, TC-ROT-001, TC-ROT-002, TC-ROT-003, TC-ROT-004, TC-ROT-005, TC-ROT-006, TC-ROT-009 | 23 |
| HU-USR-02 | HLTC-FIC-02, HLTC-FIC-03 | TC-FIC-001, TC-FIC-004, TC-FIC-005, TC-FIC-006, TC-FIC-007 | 5 |
| HU-USR-03 | HLTC-ALE-01, HLTC-ALE-02, HLTC-ALE-03 | TC-ALE-001, TC-ALE-002, TC-ALE-003, TC-ALE-004, TC-ALE-005, TC-ALE-006, TC-ALE-007, TC-ALE-008 | 8 |
| HU-USR-04 | HLTC-GLO-01 | TC-GLO-001, TC-GLO-002, TC-GLO-003, TC-GLO-004 | 4 |
| HU-USR-05 | HLTC-FIC-01, HLTC-ROT-04 | TC-FIC-002, TC-FIC-003, TC-ROT-007 | 3 |
| HU-USR-06 | HLTC-LIG-01, HLTC-NFR-01, HLTC-NFR-02 | TC-LIG-001, TC-LIG-002, TC-LIG-003, TC-LIG-004, TC-LIG-005, TC-NFR-001, TC-NFR-003 | 7 |
| Transversal (sesión, respaldos, seguridad, no funcionales) | — | 28 casos sin HU específica | 28 |

## Matriz de acceso esperada (rol × vista)

Con los permisos por defecto (`Backend/src/permisos.js`). Se verifica en TC-RBAC-001 y en los casos de seguridad de cada módulo.

| Vista (permiso) | cliente | operativo | monitoreo | comprador | administrador |
|---|---|---|---|---|---|
| Mi finca (`evaluar`) | ✔ | | | | |
| Asistencia técnica (`revisar`) | | ✔ | | | ✔ |
| Monitoreo (`reportes`) | | ✔ | ✔ | | ✔ |
| Detalle individual (`ver_todas`) | | | | | ✔ |
| Alertas (`alertas`) | ✔ | ✔ | ✔ | | |
| Mis ventas (`ofertar`) | ✔ | | | | |
| Oferta sostenible (`comprar`) | | | | ✔ | |
| Plagas en campo (`incidencias`) | | ✔ | | | |
| Visitas y validaciones (`asistencia`) | | ✔ | | | |
| Administración (`usuarios`, `respaldos`, `asignar`) | | | | | ✔ |
| Glosario (sin permiso) | ✔ | ✔ | ✔ | ✔ | ✔ |
