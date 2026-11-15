# Casos de prueba detallados (Test Cases) — Poseidon

| Campo | Valor |
|---|---|
| Identificador | TC-POSEIDON-001 |
| Versión | 1.0 |
| Fecha | 2026-11-14 |
| Plan de pruebas | [01_Test_Plan.md](01_Test_Plan.md) |
| Alto nivel | [02_High_Level_Test_Cases.md](02_High_Level_Test_Cases.md) |
| Hoja de ejecución | [03_Test_Cases.csv](03_Test_Cases.csv) (abrir en Excel; separador `;`, UTF-8) |

## Formato estándar del caso de prueba

Cada caso sigue la estructura de IEEE 829 / ISO 29119-3:

| Campo | Descripción |
|---|---|
| ID del caso | `TC-<MÓDULO>-<nnn>`, único |
| Título | Qué verifica, en una frase |
| Módulo / HLTC | Módulo funcional y caso de alto nivel al que pertenece |
| Historia de usuario | Requisito que cubre (trazabilidad) |
| Prioridad | Alta (bloquea negocio o seguridad), Media, Baja |
| Tipo | Funcional, Negativa, Límite, Seguridad, Usabilidad, Rendimiento, Resiliencia, Compatibilidad, Integración, Accesibilidad |
| Rol / usuario | Con qué cuenta se ejecuta |
| Precondiciones | Estado necesario antes de empezar |
| Datos de prueba | Valores concretos a usar |
| Pasos y resultado esperado | Acción numerada y lo que debe ocurrir en cada paso |
| Resultado obtenido / Estado | Lo completa QA al ejecutar: **Pass**, **Fail**, **Blocked**, **No ejecutado** |
| Ejecutado por / Fecha / Defecto | Trazabilidad de la ejecución |

Convenciones: `DEMO_PASSWORD` es la contraseña de los usuarios demo definida en `Backend/.env`. Las verificaciones
marcadas "API" se hacen con Postman/curl usando `Authorization: Bearer <token>` obtenido de `POST /api/auth/login`.
Los datos de prueba generales están en la sección 8 del plan.

## Resumen

| Módulo | Casos | Alta | Media | Baja |
|---|---|---|---|---|
| [AUT · Autenticación y sesión](#aut) | 13 | 9 | 2 | 2 |
| [RBAC · Roles, permisos y navegación](#rbac) | 5 | 4 | 1 | 0 |
| [ADM · Administración](#adm) | 22 | 12 | 6 | 4 |
| [RES · Respaldos y restauración](#res) | 5 | 2 | 3 | 0 |
| [PAR · Registro de parcelas](#par) | 15 | 5 | 8 | 2 |
| [FIC · Ficha de parcela](#fic) | 10 | 4 | 6 | 0 |
| [ROT · Comparar rotaciones](#rot) | 10 | 6 | 3 | 1 |
| [EVA · Mis evaluaciones](#eva) | 3 | 3 | 0 | 0 |
| [LIG · Modo de bajo consumo](#lig) | 5 | 2 | 3 | 0 |
| [OPT · Asistencia técnica](#opt) | 10 | 3 | 6 | 1 |
| [MON · Monitoreo regional](#mon) | 10 | 3 | 5 | 2 |
| [ALE · Alertas climáticas](#ale) | 8 | 0 | 6 | 2 |
| [VEN · Mis ventas](#ven) | 9 | 5 | 2 | 2 |
| [COM · Oferta sostenible (comprador)](#com) | 14 | 7 | 7 | 0 |
| [CAM · Plagas y enfermedades en campo](#cam) | 8 | 3 | 5 | 0 |
| [GLO · Glosario y guía](#glo) | 4 | 0 | 2 | 2 |
| [NFR · No funcionales](#nfr) | 10 | 4 | 5 | 1 |
| **Total** | **161** | **72** | **70** | **19** |

Por tipo: Funcional 84 · Negativa 23 · Seguridad 23 · Límite 16 · Resiliencia 5 · Usabilidad 4 · Rendimiento 3 · Integración 1 · Compatibilidad 1 · Accesibilidad 1.

<a id="aut"></a>

## AUT · Autenticación y sesión

### TC-AUT-001 · Ingreso exitoso del administrador

| Campo | Detalle |
|---|---|
| Módulo | Autenticación y sesión |
| Caso de alto nivel | HLTC-AUT-01 — Ingreso exitoso con cada rol |
| Historia de usuario | — |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | administrador |
| Precondiciones | Backend y frontend en ejecución; seed cargado. |
| Datos de prueba | admin@poseidon.test / contraseña = DEMO_PASSWORD |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir http://localhost:5173. | Se muestra la pantalla "Ingresar" con los campos Correo y Contraseña. |
| 2 | Escribir el correo y la contraseña y pulsar "Ingresar". | El botón cambia a "Ingresando…" y luego se carga la aplicación. |
| 3 | Observar la cabecera. | Muestra el logo Poseidon, el nombre "Administrador Demo", la insignia "administrador" y el botón "Salir". |
| 4 | Observar la vista activa. | La vista inicial es "Administración" y aparece primera en el menú. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-AUT-002 · Vista de inicio de cada rol

| Campo | Detalle |
|---|---|
| Módulo | Autenticación y sesión |
| Caso de alto nivel | HLTC-AUT-01 — Ingreso exitoso con cada rol |
| Historia de usuario | — |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente, operativo, monitoreo, comprador |
| Precondiciones | Usuarios demo activos. |
| Datos de prueba | cliente@, operativo@, monitoreo@, comprador@poseidon.test / contraseña = DEMO_PASSWORD |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ingresar como cliente@poseidon.test. | La vista inicial es "Mi finca". |
| 2 | Salir e ingresar como operativo@poseidon.test. | La vista inicial es "Asistencia técnica". |
| 3 | Salir e ingresar como monitoreo@poseidon.test. | La vista inicial es "Monitoreo regional". |
| 4 | Salir e ingresar como comprador@poseidon.test. | La vista inicial es "Oferta sostenible". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-AUT-003 · Contraseña incorrecta

| Campo | Detalle |
|---|---|
| Módulo | Autenticación y sesión |
| Caso de alto nivel | HLTC-AUT-02 — Ingreso rechazado |
| Historia de usuario | — |
| Prioridad | Alta |
| Tipo | Negativa |
| Rol / usuario | Anónimo |
| Precondiciones | Usuario cliente@poseidon.test activo. |
| Datos de prueba | cliente@poseidon.test / "ClaveErronea1" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ingresar el correo válido y una contraseña incorrecta. | Se muestra el error "Correo o contraseña incorrectos". |
| 2 | Verificar que no se haya iniciado sesión. | Permanece en la pantalla de ingreso. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-AUT-004 · Correo inexistente no revela si la cuenta existe

| Campo | Detalle |
|---|---|
| Módulo | Autenticación y sesión |
| Caso de alto nivel | HLTC-AUT-02 — Ingreso rechazado |
| Historia de usuario | — |
| Prioridad | Alta |
| Tipo | Seguridad |
| Rol / usuario | Anónimo |
| Precondiciones | — |
| Datos de prueba | noexiste@poseidon.test / cualquier contraseña |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ingresar un correo que no existe. | Se muestra exactamente el mismo mensaje "Correo o contraseña incorrectos" que en TC-AUT-003. |
| 2 | Comparar en DevTools > Network el código HTTP de ambos casos. | Ambos responden 401 con el mismo cuerpo. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-AUT-005 · Cuenta pendiente de aprobación

| Campo | Detalle |
|---|---|
| Módulo | Autenticación y sesión |
| Caso de alto nivel | HLTC-AUT-02 — Ingreso rechazado |
| Historia de usuario | — |
| Prioridad | Alta |
| Tipo | Negativa |
| Rol / usuario | operativo (pendiente) |
| Precondiciones | Cuenta tecnico2@poseidon.test creada por el administrador y aún pendiente (TC-ADM-002). |
| Datos de prueba | tecnico2@poseidon.test / contraseña inicial correcta y una incorrecta |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ingresar con la contraseña correcta. | Error 403: "Su cuenta está pendiente de aprobación. Un responsable debe habilitarla antes de que pueda ingresar." |
| 2 | Ingresar con una contraseña incorrecta. | Se muestra "Correo o contraseña incorrectos" (no revela que la cuenta está pendiente). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-AUT-006 · Cuenta desactivada no ingresa

| Campo | Detalle |
|---|---|
| Módulo | Autenticación y sesión |
| Caso de alto nivel | HLTC-AUT-02 — Ingreso rechazado |
| Historia de usuario | — |
| Prioridad | Alta |
| Tipo | Negativa |
| Rol / usuario | cliente (inactivo) |
| Precondiciones | agricultor2@poseidon.test desactivado por el administrador (TC-ADM-011). |
| Datos de prueba | agricultor2@poseidon.test / contraseña correcta |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ingresar con las credenciales correctas. | Se muestra "Correo o contraseña incorrectos"; no ingresa. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-AUT-007 · Correo sin distinguir mayúsculas y con espacios

| Campo | Detalle |
|---|---|
| Módulo | Autenticación y sesión |
| Caso de alto nivel | HLTC-AUT-02 — Ingreso rechazado |
| Historia de usuario | — |
| Prioridad | Baja |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | — |
| Datos de prueba | "  Cliente@Poseidon.TEST  " / contraseña = DEMO_PASSWORD |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ingresar el correo con mayúsculas y espacios alrededor. | Ingresa correctamente como Agricultor Demo. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-AUT-008 · Campos obligatorios del formulario de ingreso

| Campo | Detalle |
|---|---|
| Módulo | Autenticación y sesión |
| Caso de alto nivel | HLTC-AUT-02 — Ingreso rechazado |
| Historia de usuario | — |
| Prioridad | Baja |
| Tipo | Negativa |
| Rol / usuario | Anónimo |
| Precondiciones | — |
| Datos de prueba | Campos vacíos; correo "abc" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "Ingresar" con ambos campos vacíos. | El navegador impide el envío e indica que el campo es obligatorio. |
| 2 | Escribir "abc" en Correo y una contraseña; pulsar "Ingresar". | El navegador indica que el correo no tiene un formato válido. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-AUT-009 · Bloqueo tras 20 intentos de ingreso

| Campo | Detalle |
|---|---|
| Módulo | Autenticación y sesión |
| Caso de alto nivel | HLTC-AUT-03 — Límite de intentos de ingreso |
| Historia de usuario | — |
| Prioridad | Media |
| Tipo | Seguridad |
| Rol / usuario | Anónimo |
| Precondiciones | Backend recién reiniciado (contador en memoria en cero). Ejecutar al final del día: bloquea la IP 15 minutos. |
| Datos de prueba | Correo válido con contraseña errónea, 21 veces |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Realizar 20 intentos de ingreso fallidos seguidos. | Cada intento devuelve "Correo o contraseña incorrectos". |
| 2 | Realizar el intento 21 (incluso con la contraseña correcta). | HTTP 429: "Demasiados intentos. Espere unos minutos." |
| 3 | Esperar 15 minutos (o reiniciar el backend) e ingresar con la contraseña correcta. | Ingresa correctamente. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-AUT-010 · Cerrar sesión

| Campo | Detalle |
|---|---|
| Módulo | Autenticación y sesión |
| Caso de alto nivel | HLTC-AUT-04 — Ciclo de vida de la sesión |
| Historia de usuario | — |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | Cualquiera |
| Precondiciones | Sesión iniciada. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "Salir" en la cabecera. | Vuelve a la pantalla "Ingresar". |
| 2 | Revisar DevTools > Application > Session Storage. | La clave "poseidon_token" ya no existe. |
| 3 | Pulsar "Atrás" del navegador o recargar. | Sigue en la pantalla de ingreso; no se muestran datos del usuario. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-AUT-011 · Persistencia de sesión por pestaña

| Campo | Detalle |
|---|---|
| Módulo | Autenticación y sesión |
| Caso de alto nivel | HLTC-AUT-04 — Ciclo de vida de la sesión |
| Historia de usuario | — |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Sesión iniciada en una pestaña. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Recargar la página (F5). | La sesión se mantiene y vuelve a la aplicación. |
| 2 | Abrir la URL en una pestaña nueva. | Pide ingresar de nuevo (el token vive en sessionStorage de la pestaña). |
| 3 | Cerrar el navegador y volver a abrir la URL. | Pide ingresar de nuevo. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-AUT-012 · Token inválido o vencido

| Campo | Detalle |
|---|---|
| Módulo | Autenticación y sesión |
| Caso de alto nivel | HLTC-AUT-04 — Ciclo de vida de la sesión |
| Historia de usuario | — |
| Prioridad | Alta |
| Tipo | Seguridad |
| Rol / usuario | cliente |
| Precondiciones | Sesión iniciada. |
| Datos de prueba | Token alterado |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | En Session Storage modificar un carácter del valor "poseidon_token" y recargar. | Se descarta la sesión y se muestra la pantalla de ingreso. |
| 2 | Llamar GET /api/auth/yo con "Authorization: Bearer abc". | HTTP 401: "Sesión no válida. Ingrese de nuevo." |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-AUT-013 · Usuario desactivado con la sesión abierta

| Campo | Detalle |
|---|---|
| Módulo | Autenticación y sesión |
| Caso de alto nivel | HLTC-AUT-04 — Ciclo de vida de la sesión |
| Historia de usuario | — |
| Prioridad | Alta |
| Tipo | Seguridad |
| Rol / usuario | cliente + administrador |
| Precondiciones | agricultor2 con sesión abierta en el navegador A; admin en el navegador B. |
| Datos de prueba | agricultor2@poseidon.test |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | En B, desactivar a agricultor2 (Administración > Usuarios). | El cambio se guarda. |
| 2 | En A, cambiar de pestaña del navegador y volver (o realizar cualquier acción). | La petición devuelve 401 y la aplicación vuelve a la pantalla de ingreso. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="rbac"></a>

## RBAC · Roles, permisos y navegación

### TC-RBAC-001 · Menú por defecto de cada rol

| Campo | Detalle |
|---|---|
| Módulo | Roles, permisos y navegación |
| Caso de alto nivel | HLTC-RBAC-01 — Menú según permisos del rol |
| Historia de usuario | HU-ADM-04 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | Todos |
| Precondiciones | Matriz de permisos con los valores por defecto. |
| Datos de prueba | Tabla esperada: cliente = Mi finca, Alertas, Mis ventas, Glosario · operativo = Asistencia técnica, Monitoreo, Alertas, Plagas en campo, Glosario · monitoreo = Monitoreo, Alertas, Glosario · administrador = Administración, Asistencia técnica, Monitoreo, Glosario · comprador = Oferta sostenible, Glosario |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ingresar con cada usuario demo y anotar los botones del menú "Secciones". | Cada rol ve exactamente las vistas de la tabla de datos, con su vista de inicio en primer lugar. |
| 2 | Verificar el botón activo. | El botón de la vista abierta tiene estilo activo y aria-current="page". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-RBAC-002 · API responde 403 sin el permiso

| Campo | Detalle |
|---|---|
| Módulo | Roles, permisos y navegación |
| Caso de alto nivel | HLTC-RBAC-02 — El servidor aplica los permisos |
| Historia de usuario | HU-ADM-04 |
| Prioridad | Alta |
| Tipo | Seguridad |
| Rol / usuario | comprador, cliente, monitoreo |
| Precondiciones | Tokens de cada rol obtenidos con POST /api/auth/login. |
| Datos de prueba | Endpoints: GET /api/monitoreo, GET /api/usuarios, POST /api/incidencias, GET /api/ofertas, POST /api/respaldos |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Con el token del comprador llamar GET /api/monitoreo. | HTTP 403: "Su rol no tiene permiso para esto." |
| 2 | Con el token del cliente llamar GET /api/usuarios y POST /api/respaldos. | HTTP 403 en ambos. |
| 3 | Con el token de monitoreo llamar POST /api/incidencias. | HTTP 403. |
| 4 | Con el token del cliente llamar GET /api/ofertas (permiso comprar). | HTTP 403. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-RBAC-003 · API responde 401 sin sesión

| Campo | Detalle |
|---|---|
| Módulo | Roles, permisos y navegación |
| Caso de alto nivel | HLTC-RBAC-02 — El servidor aplica los permisos |
| Historia de usuario | HU-ADM-04 |
| Prioridad | Alta |
| Tipo | Seguridad |
| Rol / usuario | Anónimo |
| Precondiciones | — |
| Datos de prueba | GET /api/cultivos, GET /api/parcelas, POST /api/evaluar sin cabecera Authorization |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Llamar cada endpoint sin cabecera Authorization. | HTTP 401 "Sesión no válida. Ingrese de nuevo." en todos; GET /api/health sí responde { ok: true }. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-RBAC-004 · Permiso retirado rige en la sesión abierta

| Campo | Detalle |
|---|---|
| Módulo | Roles, permisos y navegación |
| Caso de alto nivel | HLTC-RBAC-03 — Cambio de permisos en caliente |
| Historia de usuario | HU-ADM-04 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | administrador + cliente |
| Precondiciones | cliente con sesión abierta en el navegador A; admin en B. |
| Datos de prueba | Permiso "ofertar" del rol cliente |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | En B, Administración > Roles y permisos: retirar "ofertar" al rol cliente. | Se guarda el cambio. |
| 2 | En A, sin salir, cambiar de pestaña del navegador y volver. | El botón "Mis ventas" desaparece del menú. |
| 3 | En A, llamar GET /api/mis-ofertas con el token actual. | HTTP 403. |
| 4 | En B, volver a otorgar "ofertar" al cliente. | Al volver a la pestaña de A reaparece "Mis ventas". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-RBAC-005 · Rol sin permisos ve solo el Glosario

| Campo | Detalle |
|---|---|
| Módulo | Roles, permisos y navegación |
| Caso de alto nivel | HLTC-RBAC-03 — Cambio de permisos en caliente |
| Historia de usuario | HU-ADM-04 |
| Prioridad | Media |
| Tipo | Límite |
| Rol / usuario | comprador |
| Precondiciones | Admin retira todos los permisos al rol comprador. Restaurar al terminar. |
| Datos de prueba | Rol comprador sin permisos |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ingresar como comprador@poseidon.test. | Solo se muestra la vista "Glosario y guía" (sin barra de secciones, porque hay una sola vista). |
| 2 | Restaurar el permiso "comprar" al rol comprador. | Al volver a la pestaña reaparece "Oferta sostenible". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="adm"></a>

## ADM · Administración

### TC-ADM-001 · Registrar un agricultor (cuenta activa)

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-01 — Registro de usuarios |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | administrador |
| Precondiciones | Sesión de administrador. |
| Datos de prueba | Nombre "Agricultor Dos", correo agricultor2@poseidon.test, teléfono vacío, rol cliente, contraseña "Prueba123" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ir a Administración > Usuarios > Registrar usuario y completar el formulario. | Los campos obligatorios están marcados. |
| 2 | Pulsar registrar. | Mensaje: "Cuenta de Agricultor Dos registrada y habilitada." y aparece en la tabla Usuarios como activa. |
| 3 | Salir e ingresar como agricultor2@poseidon.test. | Ingresa y llega a "Mi finca". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-002 · Registrar un técnico (cuenta pendiente)

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-01 — Registro de usuarios |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | administrador |
| Precondiciones | Sesión de administrador. |
| Datos de prueba | Nombre "Técnico Dos", tecnico2@poseidon.test, rol operativo, contraseña "Prueba123" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Registrar la cuenta con rol operativo. | Mensaje: "Cuenta de Técnico Dos registrada. Queda pendiente: un responsable debe aprobarla antes de que pueda ingresar." |
| 2 | Revisar la sección "Cuentas pendientes de aprobación". | La cuenta aparece pendiente con opciones de aprobar y rechazar. |
| 3 | Repetir con roles monitoreo y administrador (admin2@poseidon.test). | Ambas quedan pendientes. Con rol comprador la cuenta queda activa. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-003 · Validaciones por campo del registro

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-01 — Registro de usuarios |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Alta |
| Tipo | Negativa |
| Rol / usuario | administrador |
| Precondiciones | Formulario "Registrar usuario" abierto. |
| Datos de prueba | Nombre vacío · correo "juan@" · teléfono "70000000" · contraseña "1234567" (7) y "12345678" (8) |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Enviar con el nombre vacío. | Error "El nombre es obligatorio" señalado en el campo Nombre. |
| 2 | Enviar con correo "juan@". | Error "Escriba un correo válido: es el identificador de la cuenta" en el campo Correo. |
| 3 | Enviar con teléfono "70000000" (sin código de país). | Error "Escriba el teléfono con código de país, por ejemplo +59170000000" en Teléfono. |
| 4 | Enviar con contraseña de 7 caracteres. | Error "La contraseña debe tener al menos 8 caracteres". |
| 5 | Enviar con contraseña de exactamente 8 caracteres y datos válidos. | La cuenta se registra. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-004 · Correo duplicado

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-01 — Registro de usuarios |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Alta |
| Tipo | Negativa |
| Rol / usuario | administrador |
| Precondiciones | Existe cliente@poseidon.test. |
| Datos de prueba | "CLIENTE@poseidon.test" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Registrar una cuenta con ese correo en mayúsculas. | HTTP 409, error "Ya existe una cuenta con ese correo" en el campo Correo. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-005 · Teléfono con espacios y guiones se normaliza

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-01 — Registro de usuarios |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Baja |
| Tipo | Funcional |
| Rol / usuario | administrador |
| Precondiciones | — |
| Datos de prueba | Teléfono "+591 700-00000" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Registrar un comprador con ese teléfono. | Se registra y la tabla muestra el teléfono como "+59170000000". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-006 · Doble control: quien registra no aprueba si hay otro administrador

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-02 — Aprobación de cuentas con doble control |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Alta |
| Tipo | Seguridad |
| Rol / usuario | administrador ×2 |
| Precondiciones | admin2@poseidon.test aprobado y activo. tecnico2 registrado por admin@ y pendiente. |
| Datos de prueba | tecnico2@poseidon.test |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Como admin@, intentar aprobar tecnico2. | Error 403: "Otro administrador debe aprobar las cuentas que usted registró". |
| 2 | Ingresar como admin2@ y aprobar tecnico2. | La cuenta pasa a activa. |
| 3 | Ingresar como tecnico2@poseidon.test. | Ingresa y llega a "Asistencia técnica". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-007 · Único administrador aprueba su propio registro

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-02 — Aprobación de cuentas con doble control |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | administrador |
| Precondiciones | Solo admin@ es administrador activo (admin2 pendiente o desactivado). |
| Datos de prueba | Cuenta operativa nueva "tecnico3@poseidon.test" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Registrar tecnico3 y aprobarlo con el mismo admin@. | La aprobación se permite. |
| 2 | Abrir Administración > Auditoría. | El evento "usuario.aprobado" incluye el aviso "Aprobada por quien la registró: no hay otro administrador activo". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-008 · Rechazar una cuenta pendiente

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-02 — Aprobación de cuentas con doble control |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | administrador |
| Precondiciones | Cuenta monitoreo pendiente "monitoreo2@poseidon.test". |
| Datos de prueba | monitoreo2@poseidon.test |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar rechazar en la cuenta pendiente. | La cuenta deja de estar pendiente y queda inactiva; auditoría registra "usuario.rechazado". |
| 2 | Intentar ingresar como monitoreo2. | Muestra "Correo o contraseña incorrectos". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-009 · Aprobar una cuenta ya resuelta

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-02 — Aprobación de cuentas con doble control |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Baja |
| Tipo | Negativa |
| Rol / usuario | administrador |
| Precondiciones | Cuenta ya aprobada; su id conocido. |
| Datos de prueba | POST /api/usuarios/:id/aprobacion { "aprobar": true } |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Enviar la aprobación por API sobre una cuenta ya aprobada. | HTTP 404: "No hay una cuenta pendiente con ese identificador". |
| 2 | Enviar { "aprobar": "si" } sobre una cuenta pendiente. | HTTP 400: "Indique si aprueba o rechaza la cuenta". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-010 · Ascender a rol con privilegios deja la cuenta pendiente

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-03 — Cambio de rol y activación |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Alta |
| Tipo | Seguridad |
| Rol / usuario | administrador |
| Precondiciones | agricultor3@poseidon.test activo (cliente). |
| Datos de prueba | Cambiar rol cliente → operativo |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | En Usuarios cambiar el rol de agricultor3 a operativo. | La cuenta aparece en "Cuentas pendientes de aprobación". |
| 2 | Intentar ingresar como agricultor3. | Mensaje de cuenta pendiente de aprobación. |
| 3 | Revisar Auditoría. | Evento "usuario.rol" con antes: cliente, ahora: operativo, estado: pendiente de aprobación. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-011 · Desactivar y reactivar un usuario

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-03 — Cambio de rol y activación |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | administrador |
| Precondiciones | agricultor2 activo. |
| Datos de prueba | agricultor2@poseidon.test |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Desactivar a agricultor2. | La tabla lo muestra inactivo; auditoría "usuario.desactivado". |
| 2 | Intentar ingresar como agricultor2. | No ingresa (TC-AUT-006). |
| 3 | Reactivarlo e ingresar. | Ingresa correctamente; auditoría "usuario.activado". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-012 · No puede cambiar su propio rol ni desactivarse

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-03 — Cambio de rol y activación |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Alta |
| Tipo | Negativa |
| Rol / usuario | administrador |
| Precondiciones | Sesión de admin@. |
| Datos de prueba | Fila del propio admin |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Intentar cambiar el rol o desactivar la propia cuenta (UI o PATCH /api/usuarios/<propio id>). | HTTP 400: "No puede cambiar su propio rol ni desactivarse". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-013 · Activar una cuenta pendiente no está permitido

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-03 — Cambio de rol y activación |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Media |
| Tipo | Negativa |
| Rol / usuario | administrador |
| Precondiciones | Una cuenta pendiente. |
| Datos de prueba | PATCH /api/usuarios/:id { "activo": true } |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Intentar activarla. | HTTP 400: "La cuenta está pendiente: apruébela en lugar de activarla". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-014 · Otorgar y retirar permisos de un rol

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-04 — Matriz de roles y permisos |
| Historia de usuario | HU-ADM-04 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | administrador |
| Precondiciones | Matriz por defecto. |
| Datos de prueba | Rol monitoreo: otorgar "ver_todas" y luego retirarlo |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir Administración > Roles y permisos. | Se ve la matriz roles × 12 permisos con su descripción. |
| 2 | Marcar "ver_todas" para monitoreo y guardar. | Se guarda; auditoría "permisos.cambiados" con otorgados: [ver_todas]. |
| 3 | Ingresar como monitoreo. | En Monitoreo aparece la pestaña "Detalle por parcela". |
| 4 | Retirar "ver_todas" a monitoreo. | Auditoría con retirados: [ver_todas]; la pestaña desaparece. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-015 · Permiso fijo del administrador y permiso inválido

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-04 — Matriz de roles y permisos |
| Historia de usuario | HU-ADM-04 |
| Prioridad | Alta |
| Tipo | Negativa |
| Rol / usuario | administrador |
| Precondiciones | — |
| Datos de prueba | PUT /api/permisos/administrador sin "usuarios"; PUT /api/permisos/cliente ["volar"]; PUT /api/permisos/invitado |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Intentar quitar "usuarios" al rol administrador. | La casilla está bloqueada en la UI; por API el permiso se conserva en la respuesta. |
| 2 | Enviar un permiso inexistente. | HTTP 400: "Lista de permisos no válida". |
| 3 | Enviar un rol inexistente. | HTTP 404: "Rol no encontrado". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-016 · Contenido de la auditoría

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-05 — Auditoría |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Media |
| Tipo | Seguridad |
| Rol / usuario | administrador |
| Precondiciones | Ejecutados TC-ADM-001 a 014 y una asignación. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir Administración > Auditoría. | Lista registros, aprobaciones, rechazos, cambios de rol, permisos, asignaciones y restauraciones con actor y fecha/hora. |
| 2 | Buscar en la tabla y en la respuesta de GET /api/auditoria contraseñas o hashes. | No aparece ninguna contraseña ni hash. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-017 · Auditoría restringida a quien gestiona usuarios

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-05 — Auditoría |
| Historia de usuario | HU-ADM-01 |
| Prioridad | Media |
| Tipo | Seguridad |
| Rol / usuario | operativo |
| Precondiciones | — |
| Datos de prueba | GET /api/auditoria |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Llamar el endpoint con el token del técnico. | HTTP 403. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-018 · Asignación automática al técnico con menos carga

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-06 — Asignación de parcelas a técnicos |
| Historia de usuario | HU-OPT-01 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente + administrador |
| Precondiciones | Técnicos activos: operativo@ (con N parcelas) y tecnico2@ (con menos). |
| Datos de prueba | Parcela nueva del cliente |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Como cliente, registrar una parcela nueva. | Se guarda con código PAR-xxxxx. |
| 2 | Como admin, abrir Administración > Parcelas y técnicos. | La parcela nueva está asignada al técnico con menos parcelas (tecnico2). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-019 · Reasignar parcela a otro técnico

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-06 — Asignación de parcelas a técnicos |
| Historia de usuario | HU-OPT-01 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | administrador + operativo |
| Precondiciones | Parcela asignada a operativo@. |
| Datos de prueba | Nuevo técnico: tecnico2@ |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Reasignar la parcela a tecnico2. | Se guarda; auditoría "parcela.asignada" con antes/ahora. |
| 2 | Ingresar como tecnico2 > Asistencia técnica > Mis parcelas. | La parcela aparece. |
| 3 | Ingresar como operativo@. | La parcela ya no aparece en sus parcelas. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-020 · Asignar a usuario no técnico, inactivo o dejar sin asignar

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-06 — Asignación de parcelas a técnicos |
| Historia de usuario | HU-OPT-01 |
| Prioridad | Media |
| Tipo | Negativa |
| Rol / usuario | administrador |
| Precondiciones | — |
| Datos de prueba | tecnico_id de un comprador, de un técnico inactivo y null |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | PATCH /api/parcelas/:id/asignacion con el id de un comprador. | HTTP 400: "Elija un técnico activo". |
| 2 | Repetir con un técnico desactivado. | HTTP 400: "Elija un técnico activo". |
| 3 | Enviar { "tecnico_id": null }. | La parcela queda sin técnico asignado. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-021 · Estado del sistema

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-07 — Estado del sistema y catálogo |
| Historia de usuario | — |
| Prioridad | Baja |
| Tipo | Funcional |
| Rol / usuario | administrador |
| Precondiciones | — |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir Administración > Sistema. | Muestra el modo de base de datos (MySQL o memoria), estado de respaldos, revisión de alertas, si el SMS está configurado y el almacén de fotos (Drive o local). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ADM-022 · Catálogo de cultivos

| Campo | Detalle |
|---|---|
| Módulo | Administración |
| Caso de alto nivel | HLTC-ADM-07 — Estado del sistema y catálogo |
| Historia de usuario | — |
| Prioridad | Baja |
| Tipo | Funcional |
| Rol / usuario | administrador |
| Precondiciones | — |
| Datos de prueba | Database/cultivos.json |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir Administración > Cultivos. | Lista los 10 cultivos (papa, maíz, haba, tarwi, quinua, trigo, cebada, avena forrajera, alfalfa, cebolla) con sus atributos. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="res"></a>

## RES · Respaldos y restauración

### TC-RES-001 · Crear respaldo manual

| Campo | Detalle |
|---|---|
| Módulo | Respaldos y restauración |
| Caso de alto nivel | HLTC-RES-01 — Respaldo manual y automático |
| Historia de usuario | — |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | administrador |
| Precondiciones | — |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir Administración > Respaldos y crear un respaldo manual. | Aparece en "Puntos de restauración" con fecha/hora y tipo manual. |
| 2 | Revisar la carpeta Backend/respaldos/. | Existe el archivo JSON del respaldo. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-RES-002 · Confirmación escrita para restaurar

| Campo | Detalle |
|---|---|
| Módulo | Respaldos y restauración |
| Caso de alto nivel | HLTC-RES-02 — Restauración segura |
| Historia de usuario | — |
| Prioridad | Alta |
| Tipo | Negativa |
| Rol / usuario | administrador |
| Precondiciones | Existe al menos un respaldo. |
| Datos de prueba | Nombre del respaldo con un carácter de menos |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "Restaurar…" en un respaldo. | Se abre el diálogo "Restaurar a <fecha>" con el campo "Para confirmar, escriba el nombre del respaldo". |
| 2 | Escribir el nombre incompleto. | El botón de restaurar permanece deshabilitado. |
| 3 | Por API enviar { "confirmacion": "otro" }. | HTTP 400: "Confirme escribiendo el nombre del respaldo". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-RES-003 · Restaurar un respaldo y deshacer

| Campo | Detalle |
|---|---|
| Módulo | Respaldos y restauración |
| Caso de alto nivel | HLTC-RES-02 — Restauración segura |
| Historia de usuario | — |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | administrador |
| Precondiciones | Respaldo R1 creado; luego se registra una parcela nueva P-X. |
| Datos de prueba | Respaldo R1 |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Restaurar R1 escribiendo su nombre exacto. | La restauración termina con éxito. |
| 2 | Verificar como cliente sus parcelas. | P-X ya no existe (estado de R1). |
| 3 | Revisar los puntos de restauración. | Hay un respaldo "previo-…" creado justo antes de restaurar. |
| 4 | Restaurar el respaldo "previo-…". | P-X vuelve a existir. Auditoría registra "respaldo.restaurado" con el estado anterior. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-RES-004 · Respaldo automático y retención

| Campo | Detalle |
|---|---|
| Módulo | Respaldos y restauración |
| Caso de alto nivel | HLTC-RES-01 — Respaldo manual y automático |
| Historia de usuario | — |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | administrador |
| Precondiciones | .env con BACKUP_HORA a 2 minutos de la hora actual y BACKUP_RETENER=3. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Esperar a la hora configurada. | Se crea un respaldo automático en la lista. |
| 2 | Crear respaldos hasta superar 3 automáticos (cambiando la hora o reiniciando tras la hora). | Solo se conservan los 3 más recientes. |
| 3 | Apagar el backend antes de BACKUP_HORA y encenderlo después. | Al arrancar crea el respaldo pendiente del día. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-RES-005 · Respaldos solo con permiso "respaldos"

| Campo | Detalle |
|---|---|
| Módulo | Respaldos y restauración |
| Caso de alto nivel | HLTC-RES-01 — Respaldo manual y automático |
| Historia de usuario | — |
| Prioridad | Media |
| Tipo | Seguridad |
| Rol / usuario | monitoreo |
| Precondiciones | — |
| Datos de prueba | GET/POST /api/respaldos |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Llamar los endpoints con el token de monitoreo. | HTTP 403. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="par"></a>

## PAR · Registro de parcelas

### TC-PAR-001 · Registrar parcela marcando un punto en el mapa

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-01 — Registrar parcela por punto |
| Historia de usuario | HU-USR-01 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Sesión de cliente; modo bajo consumo desactivado. |
| Datos de prueba | Nombre "Chacra Tiquipaya", cultivo Papa, superficie 1.5, etapa Siembra, riego "Riego solo en algunos meses"; punto cerca de Tiquipaya |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ir a Mi finca > Mis parcelas e iniciar el registro. | Paso 1 "¿Dónde está su parcela?" con mapa y opciones "Marcar un punto" / "Dibujar el perímetro". |
| 2 | Elegir "Marcar un punto", tocar el mapa y pulsar "Continuar". | Se muestra un marcador y pasa al paso 2 "Datos de la parcela". |
| 3 | Completar los datos y continuar. | Paso 3 "Revise antes de guardar" con todos los datos y la zona (Tiquipaya). |
| 4 | Guardar. | Mensaje "Parcela registrada" con identificador PAR-xxxxx (5 dígitos) y botones "Ver la ficha" y "Comparar rotaciones". |
| 5 | Volver a "Mis parcelas". | La parcela aparece en la lista. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-PAR-002 · Registrar parcela escribiendo coordenadas

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-01 — Registrar parcela por punto |
| Historia de usuario | HU-USR-01 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | — |
| Datos de prueba | Lat -17.3895, Lon -66.1568 |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | En el paso 1 escribir latitud y longitud. | El marcador del mapa se mueve a esas coordenadas. |
| 2 | Completar el registro solo con el nombre. | Se guarda correctamente. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-PAR-003 · Usar la ubicación del GPS

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-01 — Registrar parcela por punto |
| Historia de usuario | HU-USR-01 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Teléfono con GPS, sitio en https o localhost, permiso de ubicación concedido. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "Usar mi ubicación (GPS)". | Muestra "Buscando señal GPS…" y luego coloca el punto en la ubicación actual. |
| 2 | Continuar y guardar. | La parcela queda registrada con esas coordenadas. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-PAR-004 · GPS sin conexión segura o denegado

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-01 — Registrar parcela por punto |
| Historia de usuario | HU-USR-01 |
| Prioridad | Media |
| Tipo | Negativa |
| Rol / usuario | cliente |
| Precondiciones | Acceder por http://<IP-LAN>:5173 desde un teléfono. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "Usar mi ubicación (GPS)". | Mensaje: "El GPS del navegador necesita https o localhost. Escriba las coordenadas o toque el mapa." |
| 2 | En localhost, denegar el permiso de ubicación del navegador. | Se muestra un mensaje de error y se puede continuar tocando el mapa. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-PAR-005 · Dibujar perímetro y superficie calculada

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-02 — Registrar parcela por perímetro |
| Historia de usuario | HU-USR-01 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | — |
| Datos de prueba | Cuatro esquinas de ~100 m × 100 m (≈ 1 ha) |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Elegir "Dibujar el perímetro" y tocar 4 esquinas en orden. | Se dibuja el polígono. |
| 2 | Pulsar "Deshacer el último punto". | Se quita el último vértice. |
| 3 | Volver a marcarlo y continuar. | En el paso 2 la superficie viene precargada con el área del perímetro (≈ 1 ha). |
| 4 | Pulsar "Borrar el dibujo" en un nuevo registro. | Se eliminan todos los vértices. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-PAR-006 · Perímetro con menos de 3 o más de 60 puntos

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-02 — Registrar parcela por perímetro |
| Historia de usuario | HU-USR-01 |
| Prioridad | Media |
| Tipo | Límite |
| Rol / usuario | cliente |
| Precondiciones | — |
| Datos de prueba | Perímetro de 2 puntos; de 3; de 60; de 61 (API) |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Marcar 2 puntos e intentar continuar. | No permite continuar o muestra error. |
| 2 | POST /api/parcelas con perímetro de 2 y de 61 puntos. | HTTP 400: "El perímetro debe tener entre 3 y 60 puntos". |
| 3 | POST con perímetro de 3 y de 60 puntos válidos. | Se aceptan (HTTP 201). |
| 4 | POST con un vértice [95, 10]. | HTTP 400: "El perímetro tiene un punto con coordenadas inválidas". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-PAR-007 · Perímetro demasiado pequeño

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-02 — Registrar parcela por perímetro |
| Historia de usuario | HU-USR-01 |
| Prioridad | Baja |
| Tipo | Límite |
| Rol / usuario | cliente |
| Precondiciones | — |
| Datos de prueba | Triángulo de ~5 m de lado |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Dibujar un perímetro muy pequeño y guardar. | Error: "El perímetro dibujado es demasiado pequeño (menos de 100 m²)". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-PAR-008 · Superficie escrita difiere del perímetro

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-02 — Registrar parcela por perímetro |
| Historia de usuario | HU-USR-01 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Perímetro de ≈ 1 ha. |
| Datos de prueba | Superficie escrita 3 ha |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Reemplazar la superficie por 3 y continuar al resumen. | Aviso: "La superficie que escribió (3 ha) difiere bastante de la del perímetro dibujado (… ha). Revise cuál es la correcta." |
| 2 | Guardar de todas formas. | La parcela se guarda (el aviso no bloquea). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-PAR-009 · Nombre obligatorio

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-03 — Validaciones del registro |
| Historia de usuario | HU-USR-01 |
| Prioridad | Alta |
| Tipo | Negativa |
| Rol / usuario | cliente |
| Precondiciones | — |
| Datos de prueba | Nombre vacío o solo espacios |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Intentar continuar o guardar sin nombre. | Error: "Póngale un nombre a la parcela". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-PAR-010 · Coordenadas inválidas

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-03 — Validaciones del registro |
| Historia de usuario | HU-USR-01 |
| Prioridad | Alta |
| Tipo | Límite |
| Rol / usuario | cliente |
| Precondiciones | — |
| Datos de prueba | (95, -200), (90, 180), (-90.0001, 0) |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Escribir lat 95 y lon -200 e intentar continuar. | Error: "Coordenadas inválidas: la latitud va de -90 a 90 y la longitud de -180 a 180". |
| 2 | Probar lat 90, lon 180 (límite). | Se acepta (con aviso de fuera de zona). |
| 3 | Probar lat -90.0001. | Error de coordenadas inválidas. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-PAR-011 · Límites de superficie

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-03 — Validaciones del registro |
| Historia de usuario | HU-USR-01 |
| Prioridad | Media |
| Tipo | Límite |
| Rol / usuario | cliente |
| Precondiciones | Registro por punto. |
| Datos de prueba | 0 · 0.01 · 5000 · 5000.01 · -1 |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Probar superficie 0 y -1. | Error: "La superficie debe ser mayor que 0 y de hasta 5000 hectáreas". |
| 2 | Probar 0.01 y 5000. | Se aceptan. |
| 3 | Probar 5000.01. | Error de superficie. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-PAR-012 · Campos opcionales "no disponible"

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-03 — Validaciones del registro |
| Historia de usuario | HU-USR-01 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | — |
| Datos de prueba | Solo nombre y punto |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Registrar sin superficie, cultivo, etapa ni riego. | Se guarda. |
| 2 | Abrir la ficha. | Los campos vacíos se muestran como "no disponible". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-PAR-013 · Ubicación fuera de las zonas de Cochabamba

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-03 — Validaciones del registro |
| Historia de usuario | HU-USR-01 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | — |
| Datos de prueba | Lat 40.4168, Lon -3.7038 |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Registrar con esas coordenadas y llegar al resumen. | Aviso: "La ubicación está fuera de las zonas de Cochabamba que conoce Poseidon. Compruebe las coordenadas." La zona es "Otra zona"; se puede guardar. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-PAR-014 · Corregir desde el resumen conserva los datos

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-03 — Validaciones del registro |
| Historia de usuario | HU-USR-01 |
| Prioridad | Media |
| Tipo | Usabilidad |
| Rol / usuario | cliente |
| Precondiciones | En el paso 3 con datos completos. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "Corregir datos", cambiar el nombre y volver al resumen. | Se mantienen los demás datos y el nombre nuevo. |
| 2 | Pulsar "Corregir ubicación", mover el punto y continuar. | Los datos del paso 2 siguen cargados y el resumen muestra la nueva zona. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-PAR-015 · Datos opcionales con valores fuera del catálogo (API)

| Campo | Detalle |
|---|---|
| Módulo | Registro de parcelas |
| Caso de alto nivel | HLTC-PAR-03 — Validaciones del registro |
| Historia de usuario | HU-USR-01 |
| Prioridad | Baja |
| Tipo | Negativa |
| Rol / usuario | cliente |
| Precondiciones | Token de cliente. |
| Datos de prueba | cultivo_actual "cafe", etapa "otra", riego "goteo" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | POST /api/parcelas con cada valor inválido. | HTTP 400: "Cultivo no válido", "Etapa del cultivo no válido", "Disponibilidad de riego no válido" respectivamente. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="fic"></a>

## FIC · Ficha de parcela

### TC-FIC-001 · Secciones de la ficha de parcela

| Campo | Detalle |
|---|---|
| Módulo | Ficha de parcela |
| Caso de alto nivel | HLTC-FIC-01 — Ficha y terreno (SRTM) |
| Historia de usuario | HU-USR-02 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Parcela registrada hace más de 5 minutos con conexión a internet. |
| Datos de prueba | Parcela "Chacra Tiquipaya" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir "Ver la ficha". | Se ven: título con código PAR, "Datos que dio el agricultor", "Pendiente y erosión" (NASA SRTM), "Historial de cosechas", "Verdor de la parcela (NDVI)", "Comparaciones de rotación", "Observaciones de campo" y "De dónde sale cada dato". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-FIC-002 · Pendiente, riesgo de erosión y cultivos de cobertura

| Campo | Detalle |
|---|---|
| Módulo | Ficha de parcela |
| Caso de alto nivel | HLTC-FIC-01 — Ficha y terreno (SRTM) |
| Historia de usuario | HU-USR-05 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Una parcela en terreno plano y otra en ladera, con elevación consultada. |
| Datos de prueba | Ubicaciones 8.3 (centro y ladera) |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir la ficha de la parcela plana. | Muestra la pendiente en % y riesgo "bajo" (< 5 %), sin cultivos sugeridos. |
| 2 | Abrir la ficha de la parcela en ladera. | Riesgo "medio" (5-15 %) o "alto" (≥ 15 %), explicación en lenguaje sencillo y hasta 5 "Cultivos que protegen la ladera" (raíz profunda o que cubren el suelo). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-FIC-003 · Elevación no disponible

| Campo | Detalle |
|---|---|
| Módulo | Ficha de parcela |
| Caso de alto nivel | HLTC-FIC-01 — Ficha y terreno (SRTM) |
| Historia de usuario | HU-USR-05 |
| Prioridad | Media |
| Tipo | Resiliencia |
| Rol / usuario | cliente |
| Precondiciones | Backend con ELEVACION_URL vacío (o sin internet) y parcela nueva. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir la ficha. | La sección de pendiente indica "La consulta de elevación está desactivada en el servidor." (o "Aún no se pudo consultar la elevación; se reintenta al abrir la parcela."). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-FIC-004 · Añadir campaña pasada

| Campo | Detalle |
|---|---|
| Módulo | Ficha de parcela |
| Caso de alto nivel | HLTC-FIC-02 — Historial de campañas |
| Historia de usuario | HU-USR-02 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Ficha propia abierta. |
| Datos de prueba | Año 2024, Papa, 120 qq/ha, nota "buena campaña" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "+ Añadir campaña pasada", completar y "Guardar campaña". | La campaña aparece en la tabla del historial. |
| 2 | Añadir otra campaña del año 2022. | Las campañas se ordenan del año más reciente al más antiguo. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-FIC-005 · Límites de año y rendimiento

| Campo | Detalle |
|---|---|
| Módulo | Ficha de parcela |
| Caso de alto nivel | HLTC-FIC-02 — Historial de campañas |
| Historia de usuario | HU-USR-02 |
| Prioridad | Media |
| Tipo | Límite |
| Rol / usuario | cliente |
| Precondiciones | Año actual = 2026. |
| Datos de prueba | Año 1989 · 1990 · 2027 · 2028; rendimiento 0 · 5000 · 5000.01 · vacío |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Guardar con año 1989 y con 2028. | Error "Año de la campaña no válido". |
| 2 | Guardar con año 1990 y con 2027 (año actual + 1). | Se aceptan. |
| 3 | Guardar con rendimiento 0 y 5000.01. | Error "Rendimiento no válido (quintales por hectárea)". |
| 4 | Guardar con rendimiento 5000 y con rendimiento vacío. | Se aceptan (vacío = sin dato). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-FIC-006 · Quitar campaña y permisos sobre el historial

| Campo | Detalle |
|---|---|
| Módulo | Ficha de parcela |
| Caso de alto nivel | HLTC-FIC-02 — Historial de campañas |
| Historia de usuario | HU-USR-02 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente, operativo |
| Precondiciones | Campaña registrada. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Como dueño, pulsar "Quitar" en una campaña. | La campaña desaparece. |
| 2 | Como técnico asignado, abrir la misma ficha. | Ve el historial pero sin botones "Quitar" ni "+ Añadir campaña pasada". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-FIC-007 · NDVI en segundo plano

| Campo | Detalle |
|---|---|
| Módulo | Ficha de parcela |
| Caso de alto nivel | HLTC-FIC-03 — NDVI de MODIS |
| Historia de usuario | HU-USR-02 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Parcela recién registrada; internet disponible. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir la ficha inmediatamente después de registrar. | La sección NDVI indica que la consulta está en curso o que aún no hay datos; la ficha no se bloquea. |
| 2 | Esperar (puede tardar minutos) sin recargar. | La ficha se actualiza sola con la gráfica NDVI por año, en época húmeda y seca. |
| 3 | Pulsar "Buscar datos más recientes". | Se encola la consulta sin error. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-FIC-008 · De dónde sale cada dato

| Campo | Detalle |
|---|---|
| Módulo | Ficha de parcela |
| Caso de alto nivel | HLTC-FIC-04 — Fuentes de datos y corrección |
| Historia de usuario | HU-OPT-01 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Ficha abierta. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Revisar la sección "De dónde sale cada dato". | Lista agricultor (ubicación, superficie…), NASA POWER, NASA SRTM, MODIS y GAMC con fecha y, si falta, su limitación (p. ej., "Capas del GAMC no configuradas: la zona es el municipio más cercano (aproximado)."). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-FIC-009 · Corregir datos declarados

| Campo | Detalle |
|---|---|
| Módulo | Ficha de parcela |
| Caso de alto nivel | HLTC-FIC-04 — Fuentes de datos y corrección |
| Historia de usuario | HU-USR-01 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Ficha propia abierta. |
| Datos de prueba | Nombre "Chacra Norte", superficie 2, cultivo Haba, etapa Floración, riego Sin riego |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "Corregir estos datos", cambiar los valores y "Guardar cambios". | La ficha muestra los nuevos valores. |
| 2 | Verificar que no hay opción para cambiar la ubicación. | La ubicación no es editable (para otro lugar se registra otra parcela). |
| 3 | Pulsar "Corregir estos datos" y luego "Cancelar". | No se guarda ningún cambio. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-FIC-010 · Acceso a la ficha de otro agricultor (IDOR)

| Campo | Detalle |
|---|---|
| Módulo | Ficha de parcela |
| Caso de alto nivel | HLTC-FIC-04 — Fuentes de datos y corrección |
| Historia de usuario | HU-OPT-01 |
| Prioridad | Alta |
| Tipo | Seguridad |
| Rol / usuario | cliente, operativo |
| Precondiciones | Parcela P2 de agricultor2; id conocido. |
| Datos de prueba | GET/PATCH /api/parcelas/<P2>; POST /api/parcelas/<P2>/ciclos |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Con el token de cliente@ llamar GET /api/parcelas/<P2>. | HTTP 404 "Parcela no encontrada". |
| 2 | Con el token de cliente@ llamar PATCH y POST ciclos sobre P2. | HTTP 404. |
| 3 | Con el token de un técnico no asignado a P2 llamar GET. | HTTP 404. |
| 4 | Con el token del administrador (ver_todas) llamar GET. | HTTP 200 con la ficha. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="rot"></a>

## ROT · Comparar rotaciones

### TC-ROT-001 · Comparar rotaciones de una parcela registrada

| Campo | Detalle |
|---|---|
| Módulo | Comparar rotaciones |
| Caso de alto nivel | HLTC-ROT-01 — Comparar tres estrategias |
| Historia de usuario | HU-USR-01 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Parcela registrada; conexión con NASA POWER. |
| Datos de prueba | Rotación Papa → Maíz; prioridades por defecto (agua 4, suelo 3, clima 2, ingreso 2, forraje 0) |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ir a Mi finca > Comparar rotaciones; elegir la parcela en "1 ¿Qué parcela?". | Se selecciona la parcela. |
| 2 | En "2 ¿Qué siembra hoy?" elegir Papa y Maíz; dejar prioridades; pulsar "Comparar rotaciones". | El botón muestra "Consultando datos…". |
| 3 | Revisar el resultado. | Tabla comparativa con 3 estrategias: "Rotación actual", "Ajuste: cambia un cultivo" y "Cambio mayor", cada una con puntaje 0-100. |
| 4 | Revisar las tarjetas de cada estrategia. | Cada una muestra por qué se sugiere, evidencia (riego mm, meses de suelo desnudo, familias), riesgos y "lo que el análisis no sabe". |
| 5 | Revisar el gráfico de clima. | Muestra lluvia, evapotranspiración y temperatura mínima por mes con fuente NASA POWER. |
| 6 | Ir a "Mis evaluaciones". | La evaluación aparece guardada con estado pendiente. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ROT-002 · Comparar desde un punto sin parcela registrada

| Campo | Detalle |
|---|---|
| Módulo | Comparar rotaciones |
| Caso de alto nivel | HLTC-ROT-01 — Comparar tres estrategias |
| Historia de usuario | HU-USR-01 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | — |
| Datos de prueba | Lat -17.3895, Lon -66.1568, nombre vacío; rotación Maíz → Haba |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Elegir la opción de ubicación por punto, escribir coordenadas sin nombre y comparar. | Se muestran las 3 estrategias. |
| 2 | Ir a Mis parcelas. | Se creó la parcela "Parcela sin nombre" en esas coordenadas. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ROT-003 · Reglas de la rotación en la interfaz

| Campo | Detalle |
|---|---|
| Módulo | Comparar rotaciones |
| Caso de alto nivel | HLTC-ROT-02 — Reglas de la rotación |
| Historia de usuario | HU-USR-01 |
| Prioridad | Alta |
| Tipo | Límite |
| Rol / usuario | cliente |
| Precondiciones | Comparador abierto. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Con 2 cultivos, observar los botones. | No aparece el botón "×" para quitar (mínimo 2). |
| 2 | Pulsar "+ Añadir cultivo" hasta tener 4. | Al llegar a 4 desaparece "+ Añadir cultivo" (máximo 4). |
| 3 | Abrir el desplegable del cultivo 2. | No ofrece los cultivos ya elegidos en otras posiciones (cultivos distintos). |
| 4 | Quitar un cultivo con "×". | Quedan 3 y vuelve a aparecer "+ Añadir cultivo". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ROT-004 · Reglas de la rotación en la API

| Campo | Detalle |
|---|---|
| Módulo | Comparar rotaciones |
| Caso de alto nivel | HLTC-ROT-02 — Reglas de la rotación |
| Historia de usuario | HU-USR-01 |
| Prioridad | Alta |
| Tipo | Negativa |
| Rol / usuario | cliente |
| Precondiciones | Token de cliente y parcela propia. |
| Datos de prueba | rotacion: ["papa"] · ["papa","maiz","haba","trigo","quinua"] · ["papa","papa"] · ["papa","cafe"] |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | POST /api/evaluar con 1 cultivo, con 5 y con repetidos. | HTTP 400: "La rotación debe tener de 2 a 4 cultivos distintos". |
| 2 | POST con un cultivo inexistente. | HTTP 400: "Cultivo desconocido: cafe". |
| 3 | POST con parcela_id de otro agricultor. | HTTP 404: "Parcela no encontrada". |
| 4 | POST sin parcela_id y con lat 95. | HTTP 400: "Coordenadas inválidas". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ROT-005 · Prioridades cambian el resultado

| Campo | Detalle |
|---|---|
| Módulo | Comparar rotaciones |
| Caso de alto nivel | HLTC-ROT-03 — Prioridades del agricultor |
| Historia de usuario | HU-USR-01 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Misma parcela y rotación Papa → Maíz. |
| Datos de prueba | Caso A: agua 5, resto 0 · Caso B: ingreso 5, resto 0 · Caso C: todo 0 |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Comparar con el caso A. | Las estrategias sugeridas priorizan menor riego (mm). |
| 2 | Comparar con el caso B. | El puntaje y/o las estrategias sugeridas cambian respecto del caso A (priorizan valor de mercado). |
| 3 | Comparar con el caso C. | Se calcula sin error (promedio simple de los criterios). |
| 4 | Verificar que cada deslizador va de 0 a 5 y muestra el valor elegido. | Correcto. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ROT-006 · Prioridades fuera de rango se acotan (API)

| Campo | Detalle |
|---|---|
| Módulo | Comparar rotaciones |
| Caso de alto nivel | HLTC-ROT-03 — Prioridades del agricultor |
| Historia de usuario | HU-USR-01 |
| Prioridad | Baja |
| Tipo | Límite |
| Rol / usuario | cliente |
| Precondiciones | Token de cliente. |
| Datos de prueba | prioridades: { agua: 9, suelo: -3, clima: "x" } |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | POST /api/evaluar con esas prioridades y revisar la evaluación guardada. | HTTP 200; las prioridades guardadas son agua 5, suelo 0, clima 0. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ROT-007 · Parcela en ladera

| Campo | Detalle |
|---|---|
| Módulo | Comparar rotaciones |
| Caso de alto nivel | HLTC-ROT-04 — Factores de contexto |
| Historia de usuario | HU-USR-05 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Parcela con riesgo de erosión medio o alto (TC-FIC-002). |
| Datos de prueba | Rotación Papa → Cebolla |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Comparar rotaciones para esa parcela. | Aviso: "Su parcela está en ladera (pendiente de X %): la comparación da más valor a las raíces profundas y al suelo cubierto." |
| 2 | Revisar riesgos y porqués. | Las estrategias mencionan la protección de la ladera; la actual advierte del suelo desnudo si es ≥ 4 meses. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ROT-008 · Plagas activas cercanas castigan la familia atacada

| Campo | Detalle |
|---|---|
| Módulo | Comparar rotaciones |
| Caso de alto nivel | HLTC-ROT-04 — Factores de contexto |
| Historia de usuario | HU-OPT-02 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | operativo + cliente |
| Precondiciones | Parcela del cliente en P. El técnico registra a < 5 km de P una incidencia ACTIVA de tipo plaga, severidad alta, cultivo Papa. |
| Datos de prueba | Agente "Gorgojo de los Andes"; rotación Papa → Maíz |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Como cliente, comparar Papa → Maíz. | La estrategia actual lista el riesgo "1 reporte(s) activo(s) de Gorgojo de los Andes a X km: ataca a las Solanáceas…". |
| 2 | Revisar las alternativas. | Alguna alternativa que evita Solanáceas explica: "Corta el ciclo de plagas reportadas por técnicos cerca de su parcela…". |
| 3 | Como técnico, marcar la incidencia como controlada y volver a comparar. | El riesgo por plaga ya no aparece. |
| 4 | Registrar una incidencia igual a > 5 km y comparar. | No influye en la comparación. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ROT-009 · Sin conexión con NASA POWER: clima de demostración

| Campo | Detalle |
|---|---|
| Módulo | Comparar rotaciones |
| Caso de alto nivel | HLTC-ROT-04 — Factores de contexto |
| Historia de usuario | HU-USR-01 |
| Prioridad | Alta |
| Tipo | Resiliencia |
| Rol / usuario | cliente |
| Precondiciones | Backend sin salida a internet (o POWER bloqueado en firewall). |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Comparar rotaciones. | Se muestran las estrategias y el aviso "Sin conexión con NASA POWER: se usa un clima de demostración para Cochabamba, no datos de NASA." |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ROT-010 · Marcar la estrategia que aplicará

| Campo | Detalle |
|---|---|
| Módulo | Comparar rotaciones |
| Caso de alto nivel | HLTC-ROT-05 — Adopción de una estrategia |
| Historia de usuario | HU-MON-03 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Comparación realizada. |
| Datos de prueba | Estrategia "Ajuste" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | En la tarjeta "Ajuste" pulsar "Voy a aplicar esta rotación". | La tarjeta muestra "Usted eligió aplicar esta rotación." y el botón cambia a "Quitar mi elección". |
| 2 | Pulsar "Voy a aplicar esta rotación" en "Cambio mayor". | La elección pasa a "Cambio mayor" (solo una a la vez). |
| 3 | Pulsar "Quitar mi elección". | Ninguna estrategia queda elegida. |
| 4 | PATCH /api/evaluaciones/:id/adopcion { "estrategia": "otra" }. | HTTP 400: "Estrategia no válida". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="eva"></a>

## EVA · Mis evaluaciones

### TC-EVA-001 · Listado de mis evaluaciones

| Campo | Detalle |
|---|---|
| Módulo | Mis evaluaciones |
| Caso de alto nivel | HLTC-EVA-01 — Historial de evaluaciones |
| Historia de usuario | HU-OPT-04 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Al menos 2 evaluaciones, una revisada por el técnico. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir Mi finca > Mis evaluaciones. | Lista las evaluaciones propias con fecha, parcela, rotación actual, mejor estrategia y estado (pendiente/revisada). |
| 2 | Abrir la evaluación revisada. | Muestra la nota técnica del técnico y su nombre. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-EVA-002 · Observaciones locales del técnico visibles para el agricultor

| Campo | Detalle |
|---|---|
| Módulo | Mis evaluaciones |
| Caso de alto nivel | HLTC-EVA-01 — Historial de evaluaciones |
| Historia de usuario | HU-OPT-04 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | El técnico registró una observación local en la estrategia "Ajuste" (TC-OPT-005). |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir esa evaluación. | En la tabla comparativa, bajo "Ajuste", aparece la observación local con disponibilidad de semilla, técnico y fecha. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-EVA-003 · Evaluación de otro agricultor (IDOR)

| Campo | Detalle |
|---|---|
| Módulo | Mis evaluaciones |
| Caso de alto nivel | HLTC-EVA-01 — Historial de evaluaciones |
| Historia de usuario | HU-OPT-04 |
| Prioridad | Alta |
| Tipo | Seguridad |
| Rol / usuario | cliente |
| Precondiciones | Evaluación E2 de agricultor2. |
| Datos de prueba | GET /api/evaluaciones/<E2> |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Llamar el endpoint con el token de cliente@. | HTTP 404 "Evaluación no encontrada". |
| 2 | Llamar GET /api/evaluaciones con el token de cliente@. | Solo devuelve evaluaciones propias. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="lig"></a>

## LIG · Modo de bajo consumo

### TC-LIG-001 · Activar el modo de bajo consumo

| Campo | Detalle |
|---|---|
| Módulo | Modo de bajo consumo |
| Caso de alto nivel | HLTC-LIG-01 — Modo de bajo consumo |
| Historia de usuario | HU-USR-06 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Parcela con evaluación. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "Modo bajo consumo" en la cabecera. | El botón cambia a "Modo bajo consumo: activado" (aria-pressed=true) y la tipografía pasa a la del sistema. |
| 2 | Revisar Mi finca. | Aparece la pestaña "Resumen rápido" con cada parcela, su última comparación y la tabla de 3 estrategias; no hay mapas ni tarjetas largas. |
| 3 | Recargar la página. | El modo sigue activado (preferencia guardada). |
| 4 | Desactivarlo. | Vuelven los mapas y las tarjetas. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-LIG-002 · Activación automática con ahorro de datos o 2G

| Campo | Detalle |
|---|---|
| Módulo | Modo de bajo consumo |
| Caso de alto nivel | HLTC-LIG-01 — Modo de bajo consumo |
| Historia de usuario | HU-USR-06 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | localStorage sin la clave "poseidon_ligero"; Chrome con "Ahorro de datos" o red emulada de tipo 2G. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir la aplicación e ingresar. | El modo de bajo consumo aparece activado sin que la persona lo elija. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-LIG-003 · Sin descargas pesadas en modo bajo consumo

| Campo | Detalle |
|---|---|
| Módulo | Modo de bajo consumo |
| Caso de alto nivel | HLTC-LIG-01 — Modo de bajo consumo |
| Historia de usuario | HU-USR-06 |
| Prioridad | Alta |
| Tipo | Rendimiento |
| Rol / usuario | cliente |
| Precondiciones | Modo activado; DevTools > Network con caché deshabilitada. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Recargar y navegar por Mi finca. | No se descargan Leaflet, mosaicos de mapa (tiles) ni tipografías web (Nunito). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-LIG-004 · Comparar y adoptar en modo bajo consumo

| Campo | Detalle |
|---|---|
| Módulo | Modo de bajo consumo |
| Caso de alto nivel | HLTC-LIG-01 — Modo de bajo consumo |
| Historia de usuario | HU-USR-06 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Modo activado. |
| Datos de prueba | Rotación Papa → Maíz |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Desde "Resumen rápido", ir a comparar una parcela. | Se abre el comparador con la parcela preseleccionada. |
| 2 | Comparar. | Solo se muestra la tabla comparativa (sin gráfico de clima ni tarjetas). |
| 3 | Adoptar una estrategia desde la tabla. | Queda marcada como adoptada. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-LIG-005 · Service worker guarda la aplicación

| Campo | Detalle |
|---|---|
| Módulo | Modo de bajo consumo |
| Caso de alto nivel | HLTC-LIG-01 — Modo de bajo consumo |
| Historia de usuario | HU-USR-06 |
| Prioridad | Media |
| Tipo | Rendimiento |
| Rol / usuario | cliente |
| Precondiciones | Compilación de producción (npm run build && npm run preview) en localhost. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir la aplicación y verificar DevTools > Application > Service Workers. | Hay un service worker activo (sw.js). |
| 2 | Activar "Offline" en DevTools y recargar. | La interfaz (cáscara de la aplicación) se carga desde la caché. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="opt"></a>

## OPT · Asistencia técnica

### TC-OPT-001 · El técnico ve solo sus parcelas asignadas

| Campo | Detalle |
|---|---|
| Módulo | Asistencia técnica |
| Caso de alto nivel | HLTC-OPT-01 — Parcelas asignadas del técnico |
| Historia de usuario | HU-OPT-01 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | operativo |
| Precondiciones | Rol operativo sin ver_todas; parcelas asignadas a operativo@ y a tecnico2@. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ingresar como operativo@ > Asistencia técnica > Mis parcelas. | Solo aparecen sus parcelas asignadas con su ficha agroclimática. |
| 2 | Abrir una parcela. | Muestra la ficha y el botón "Registrar una visita a esta parcela". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-OPT-002 · Parcela no asignada no es accesible

| Campo | Detalle |
|---|---|
| Módulo | Asistencia técnica |
| Caso de alto nivel | HLTC-OPT-01 — Parcelas asignadas del técnico |
| Historia de usuario | HU-OPT-01 |
| Prioridad | Alta |
| Tipo | Seguridad |
| Rol / usuario | operativo |
| Precondiciones | Parcela P asignada a tecnico2. |
| Datos de prueba | GET /api/parcelas/<P>; GET /api/parcelas?alcance=todas |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Con el token de operativo@ pedir la ficha de P. | HTTP 404. |
| 2 | Pedir GET /api/parcelas?alcance=todas. | Devuelve solo sus parcelas propias (sin ver_todas no se amplía el alcance). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-OPT-003 · Revisar una evaluación con nota técnica

| Campo | Detalle |
|---|---|
| Módulo | Asistencia técnica |
| Caso de alto nivel | HLTC-OPT-02 — Revisión con nota técnica |
| Historia de usuario | HU-OPT-01 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | operativo + cliente |
| Precondiciones | Evaluación pendiente de una parcela asignada. |
| Datos de prueba | Nota "Recomiendo probar haba en media parcela esta campaña." |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir la pestaña "Revisión (n)". | El contador n coincide con las evaluaciones pendientes. |
| 2 | Abrir la evaluación, escribir la nota en "Nota técnica para el agricultor" y guardar. | La evaluación pasa a "revisada" y el contador baja en 1. |
| 3 | Intentar guardar con la nota vacía. | Error "Escriba una nota técnica". |
| 4 | Como cliente, abrir la evaluación. | Ve la nota del técnico. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-OPT-004 · Filtrar evaluaciones por estado

| Campo | Detalle |
|---|---|
| Módulo | Asistencia técnica |
| Caso de alto nivel | HLTC-OPT-02 — Revisión con nota técnica |
| Historia de usuario | HU-OPT-01 |
| Prioridad | Baja |
| Tipo | Funcional |
| Rol / usuario | operativo |
| Precondiciones | Evaluaciones pendientes y revisadas. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Usar el selector "Estado de las evaluaciones". | La lista muestra solo las del estado elegido. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-OPT-005 · Observación local por estrategia

| Campo | Detalle |
|---|---|
| Módulo | Asistencia técnica |
| Caso de alto nivel | HLTC-OPT-03 — Validación local de estrategias |
| Historia de usuario | HU-OPT-04 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | operativo |
| Precondiciones | Evaluación de una parcela asignada abierta. |
| Datos de prueba | Estrategia Ajuste, semillas "Semilla escasa o cara", observación "Tarwi escaso en la feria local" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | En la tabla comparativa escribir la observación para "Ajuste" y guardar. | La observación aparece en la columna de esa estrategia. |
| 2 | Intentar guardar una observación de 4 caracteres. | Error "Escriba la observación local". |
| 3 | POST /api/evaluaciones/:id/validaciones con semillas "mucha". | HTTP 400 "Disponibilidad de semillas no válida". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-OPT-006 · Historial de validaciones por zona

| Campo | Detalle |
|---|---|
| Módulo | Asistencia técnica |
| Caso de alto nivel | HLTC-OPT-03 — Validación local de estrategias |
| Historia de usuario | HU-OPT-04 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | operativo |
| Precondiciones | Varias validaciones en zonas distintas, una con "No se consigue en la zona". |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir la pestaña "Validaciones". | Lista las validaciones con fecha, rotación, semillas, observación, parcela, agricultor y zona. |
| 2 | Usar el filtro "Zona o distrito". | Muestra el total por zona y cuántas sin semilla. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-OPT-007 · Registrar una visita técnica

| Campo | Detalle |
|---|---|
| Módulo | Asistencia técnica |
| Caso de alto nivel | HLTC-OPT-04 — Visitas técnicas |
| Historia de usuario | HU-OPT-03 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | operativo |
| Precondiciones | Parcela asignada. |
| Datos de prueba | Fecha hoy; observaciones "Se revisó el riego y se recomendó cobertura" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "Registrar una visita a esta parcela" y completar "Registrar visita". | La visita se guarda; el agricultor visitado es el dueño de la parcela. |
| 2 | Abrir la ficha de la parcela como cliente. | En "Visitas técnicas" aparece la visita con fecha, técnico y observaciones. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-OPT-008 · Validaciones de la visita

| Campo | Detalle |
|---|---|
| Módulo | Asistencia técnica |
| Caso de alto nivel | HLTC-OPT-04 — Visitas técnicas |
| Historia de usuario | HU-OPT-03 |
| Prioridad | Media |
| Tipo | Límite |
| Rol / usuario | operativo |
| Precondiciones | Hoy = 2026-11-14. |
| Datos de prueba | Fecha 2026-11-16 · 2026-02-30 · observación de 9 caracteres |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Registrar con fecha pasado mañana (2026-11-16). | Error "La fecha de la visita no puede ser futura". |
| 2 | Registrar con fecha "2026-02-30" vía API. | HTTP 400 "Fecha de la visita no válida". |
| 3 | Registrar con 9 caracteres de observación. | Error "Describa el asesoramiento en al menos 10 caracteres". |
| 4 | Registrar con 10 caracteres. | Se acepta. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-OPT-009 · Resumen de actividades por período

| Campo | Detalle |
|---|---|
| Módulo | Asistencia técnica |
| Caso de alto nivel | HLTC-OPT-04 — Visitas técnicas |
| Historia de usuario | HU-OPT-03 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | operativo |
| Precondiciones | Visitas en octubre y noviembre 2026. |
| Datos de prueba | Desde 2026-11-01 hasta 2026-11-30 |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir la pestaña "Visitas" y filtrar el período. | "Resumen de actividades de campo" muestra total, agricultores y parcelas distintas, y conteo por mes, zona y técnico, solo de noviembre. |
| 2 | GET /api/visitas?desde=2026-13-01. | HTTP 400 "Fechas no válidas (AAAA-MM-DD)". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-OPT-010 · Exportar visitas a CSV

| Campo | Detalle |
|---|---|
| Módulo | Asistencia técnica |
| Caso de alto nivel | HLTC-OPT-04 — Visitas técnicas |
| Historia de usuario | HU-OPT-03 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | operativo |
| Precondiciones | Período filtrado de TC-OPT-009. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "Exportar resumen (CSV para Excel)". | Descarga "visitas-2026-11-01-a-2026-11-30.csv". |
| 2 | Abrir el archivo en Excel. | Columnas: Fecha, Técnico, Agricultor visitado, Parcela, Zona o distrito, Observaciones de asesoramiento; tildes correctas; separador ";"; solo las visitas del período. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="mon"></a>

## MON · Monitoreo regional

### TC-MON-001 · Panorama regional

| Campo | Detalle |
|---|---|
| Módulo | Monitoreo regional |
| Caso de alto nivel | HLTC-MON-01 — Panorama regional con privacidad |
| Historia de usuario | HU-MON-01 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | monitoreo |
| Precondiciones | ≥ 3 agricultores con parcelas evaluadas en una misma zona. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ingresar como monitoreo > Panorama. | Muestra totales, "Mapa regional", "Alertas regionales" e "Indicadores agroclimáticos por zona" (riego medio, índice de agua, heladas, laderas, plagas activas). |
| 2 | Revisar "Qué significa cada indicador". | Cada indicador indica fuente, período, escala y tipo (observado, estimado, declarado o simulado). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-MON-002 · Zonas con menos de 3 productores no se publican

| Campo | Detalle |
|---|---|
| Módulo | Monitoreo regional |
| Caso de alto nivel | HLTC-MON-01 — Panorama regional con privacidad |
| Historia de usuario | HU-MON-01 |
| Prioridad | Alta |
| Tipo | Seguridad |
| Rol / usuario | monitoreo |
| Precondiciones | Zona A con 3 productores; zona B con 1; zona C con 1 (B+C < 3). |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Revisar la tabla por zona. | La zona A aparece con sus valores. |
| 2 | Buscar B y C. | No aparecen por separado: se juntan en "Zonas con pocos registros" y, como siguen siendo menos de 3, sus valores se muestran suprimidos ("Menos de 3 productores: no se publican valores"). |
| 3 | Agregar un tercer productor entre B y C y recargar. | El grupo "Zonas con pocos registros" pasa a mostrar valores. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-MON-003 · Detalle individual solo con ver_todas

| Campo | Detalle |
|---|---|
| Módulo | Monitoreo regional |
| Caso de alto nivel | HLTC-MON-01 — Panorama regional con privacidad |
| Historia de usuario | HU-MON-01 |
| Prioridad | Alta |
| Tipo | Seguridad |
| Rol / usuario | monitoreo, administrador |
| Precondiciones | Permisos por defecto; incidencias activas registradas. |
| Datos de prueba | GET /api/monitoreo |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Como monitoreo, revisar las pestañas. | No existe "Detalle por parcela". |
| 2 | Con el token de monitoreo llamar GET /api/monitoreo. | "detalle": false, "evaluaciones": [] y las coordenadas de incidencias aproximadas (~2 km). |
| 3 | Como administrador (ver_todas) abrir Monitoreo. | Aparece "Detalle por parcela" con "Mapa de parcelas evaluadas" y la tabla "Actividad"; las incidencias tienen coordenadas exactas. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-MON-004 · Capas del GAMC no configuradas

| Campo | Detalle |
|---|---|
| Módulo | Monitoreo regional |
| Caso de alto nivel | HLTC-MON-01 — Panorama regional con privacidad |
| Historia de usuario | HU-MON-01 |
| Prioridad | Baja |
| Tipo | Resiliencia |
| Rol / usuario | monitoreo |
| Precondiciones | GAMC_WMS_URL vacío; sin Database/distritos.geojson. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir el Panorama. | Se avisa que las capas del GAMC no están configuradas y el tablero funciona con normalidad (zonas por municipio más cercano). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-MON-005 · Simular escenario de agua

| Campo | Detalle |
|---|---|
| Módulo | Monitoreo regional |
| Caso de alto nivel | HLTC-MON-02 — Escenarios de agua |
| Historia de usuario | HU-MON-02 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | monitoreo |
| Precondiciones | — |
| Datos de prueba | Lluvia -30 %, temperatura +2 °C |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir "Escenarios de agua". | Controles "Cambio de lluvia en porcentaje" (-60 a +20) y "Aumento de temperatura en grados" (0 a +5) en 0. |
| 2 | Mover los controles a -30 % y +2 °C. | Al moverlos se recalcula "Riego adicional respecto de hoy", el "Mapa de calor por zona" y la tabla "Impacto por zona" con nivel (bajo/moderado/alto/crítico). |
| 3 | Verificar el aviso de fuente. | Indica que es una simulación, no una proyección climática. |
| 4 | Pulsar "Volver al clima actual". | Los controles vuelven a 0 y el riego adicional es 0 %. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-MON-006 · Valores de escenario fuera de rango (API)

| Campo | Detalle |
|---|---|
| Módulo | Monitoreo regional |
| Caso de alto nivel | HLTC-MON-02 — Escenarios de agua |
| Historia de usuario | HU-MON-02 |
| Prioridad | Baja |
| Tipo | Límite |
| Rol / usuario | monitoreo |
| Precondiciones | — |
| Datos de prueba | GET /api/monitoreo/escenario?lluvia=-100&temp=9 · ?lluvia=abc |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Llamar con lluvia -100 y temp 9. | La respuesta muestra "cambio": { lluviaPct: -60, tempC: 5 } (acotado a los límites). |
| 2 | Llamar con lluvia "abc". | Se toma 0 sin error. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-MON-007 · Adopción por zona

| Campo | Detalle |
|---|---|
| Módulo | Monitoreo regional |
| Caso de alto nivel | HLTC-MON-03 — Adopción regional |
| Historia de usuario | HU-MON-03 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente ×3 + monitoreo |
| Precondiciones | 3 agricultores en la zona A con evaluación; 2 marcan una estrategia recomendada. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Como monitoreo, abrir "Adopción". | "Adopción de rotaciones recomendadas por zona" muestra ≈ 67 % para la zona A, con ahorro de riego estimado y NDVI medio; "Adopción regional" refleja el total. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-MON-008 · Suelo desnudo por año y época

| Campo | Detalle |
|---|---|
| Módulo | Monitoreo regional |
| Caso de alto nivel | HLTC-MON-04 — Suelo desnudo |
| Historia de usuario | HU-MON-04 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | monitoreo |
| Precondiciones | Parcelas con NDVI guardado. |
| Datos de prueba | Época seca y húmeda; dos años |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir "Suelo desnudo" y elegir año y "Época del año". | "Áreas sin cobertura vegetal activa" muestra el % de parcelas con NDVI < 0,2 para ese período. |
| 2 | Cambiar la época. | Los valores se recalculan. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-MON-009 · Exportar zonas prioritarias (CSV)

| Campo | Detalle |
|---|---|
| Módulo | Monitoreo regional |
| Caso de alto nivel | HLTC-MON-04 — Suelo desnudo |
| Historia de usuario | HU-MON-04 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | monitoreo |
| Precondiciones | Período elegido. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "Exportar listado de zonas prioritarias (CSV)". | Descarga "distritos-suelo-desnudo-<año>-<época>.csv". |
| 2 | Abrir en Excel. | Columnas: Prioridad, Zona o distrito, % de parcelas con suelo desnudo (NDVI < 0.2), NDVI medio, Parcelas con dato, Superficie registrada (ha), Período. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-MON-010 · Alertas regionales

| Campo | Detalle |
|---|---|
| Módulo | Monitoreo regional |
| Caso de alto nivel | HLTC-MON-01 — Panorama regional con privacidad |
| Historia de usuario | HU-MON-01 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | monitoreo, administrador |
| Precondiciones | Incidencia activa de severidad alta; evaluación con déficit > 400 mm. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Como monitoreo, revisar "Alertas regionales". | Aparece la alerta de plaga "Severidad alta en <zona>…"; no aparecen alertas de agua/helada por parcela. |
| 2 | Como administrador, revisar. | Además aparecen "Déficit de agua alto…" y "<cultivo> expuesto a helada en…" por parcela. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="ale"></a>

## ALE · Alertas climáticas

### TC-ALE-001 · Guardar preferencias de alertas

| Campo | Detalle |
|---|---|
| Módulo | Alertas climáticas |
| Caso de alto nivel | HLTC-ALE-01 — Preferencias de alertas |
| Historia de usuario | HU-USR-03 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | — |
| Datos de prueba | Helada sí, sequía no, web sí, SMS no |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir Alertas; en "Qué alertas recibir" y "Cómo recibirlas" elegir los valores; "Guardar preferencias". | Se guardan sin error. |
| 2 | Recargar la página. | Se mantienen las preferencias guardadas. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ALE-002 · SMS exige teléfono válido

| Campo | Detalle |
|---|---|
| Módulo | Alertas climáticas |
| Caso de alto nivel | HLTC-ALE-01 — Preferencias de alertas |
| Historia de usuario | HU-USR-03 |
| Prioridad | Media |
| Tipo | Negativa |
| Rol / usuario | cliente |
| Precondiciones | — |
| Datos de prueba | Sin teléfono · "70000000" · "+59170000000" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Activar SMS sin teléfono y guardar. | Error "Para recibir SMS indique su número de teléfono". |
| 2 | Escribir "70000000". | Error "Escriba el teléfono con código de país, por ejemplo +59170000000". |
| 3 | Escribir "+59170000000". | Se guarda. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ALE-003 · Activar notificaciones en este dispositivo

| Campo | Detalle |
|---|---|
| Módulo | Alertas climáticas |
| Caso de alto nivel | HLTC-ALE-02 — Notificaciones del dispositivo |
| Historia de usuario | HU-USR-03 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Chrome en localhost; permiso de notificaciones sin decidir. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | En "Este dispositivo" pulsar activar. | El navegador pide permiso; al aceptar, el dispositivo queda registrado (contador de dispositivos +1). |
| 2 | Pulsar desactivar. | Se elimina la suscripción. |
| 3 | Repetir rechazando el permiso del navegador. | Mensaje "El navegador no dio permiso para notificaciones. Actívelo en la configuración del sitio."; no se registra. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ALE-004 · Notificaciones sin conexión segura

| Campo | Detalle |
|---|---|
| Módulo | Alertas climáticas |
| Caso de alto nivel | HLTC-ALE-02 — Notificaciones del dispositivo |
| Historia de usuario | HU-USR-03 |
| Prioridad | Baja |
| Tipo | Negativa |
| Rol / usuario | cliente |
| Precondiciones | Acceso por http://<IP-LAN>:5173. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir Alertas. | Aviso: "Las notificaciones web necesitan una conexión segura (https o localhost). Desde una dirección de la red local no se pueden activar." |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ALE-005 · Enviar alerta de prueba

| Campo | Detalle |
|---|---|
| Módulo | Alertas climáticas |
| Caso de alto nivel | HLTC-ALE-03 — Prueba, revisión y antiduplicado |
| Historia de usuario | HU-USR-03 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Web activado y dispositivo suscrito; SMS activado con teléfono; sin TWILIO_* en .env. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar el botón de alerta de prueba. | Llega una notificación "Alerta de prueba" al dispositivo. |
| 2 | Revisar la consola del backend. | El SMS aparece simulado en la consola. |
| 3 | Revisar "Alertas recibidas". | Aparece la alerta de prueba con sus canales. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ALE-006 · Revisar parcelas ahora con límite de 1 por minuto

| Campo | Detalle |
|---|---|
| Módulo | Alertas climáticas |
| Caso de alto nivel | HLTC-ALE-03 — Prueba, revisión y antiduplicado |
| Historia de usuario | HU-USR-03 |
| Prioridad | Media |
| Tipo | Límite |
| Rol / usuario | cliente |
| Precondiciones | Parcelas registradas. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | En "Vigilancia de sus parcelas" pulsar revisar. | Se ejecuta la revisión y muestra el resultado. |
| 2 | Pulsar de nuevo antes de 60 s. | Error 429 "Espere un minuto antes de volver a revisar". |
| 3 | Esperar 60 s y repetir. | Se ejecuta. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ALE-007 · Alerta de helada forzada sin duplicados

| Campo | Detalle |
|---|---|
| Módulo | Alertas climáticas |
| Caso de alto nivel | HLTC-ALE-03 — Prueba, revisión y antiduplicado |
| Historia de usuario | HU-USR-03 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | .env con ALERTA_HELADA_C=40 (toda mínima dispara la helada); backend reiniciado; internet disponible. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar revisar parcelas. | Se genera una alerta de helada y se entrega por los canales elegidos. |
| 2 | Esperar 1 min y revisar otra vez. | No se repite la alerta de la misma helada del mismo día. |
| 3 | Restaurar ALERTA_HELADA_C=0. | — |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-ALE-008 · Roles sin permiso de alertas

| Campo | Detalle |
|---|---|
| Módulo | Alertas climáticas |
| Caso de alto nivel | HLTC-ALE-01 — Preferencias de alertas |
| Historia de usuario | HU-USR-03 |
| Prioridad | Baja |
| Tipo | Seguridad |
| Rol / usuario | comprador, administrador |
| Precondiciones | Permisos por defecto. |
| Datos de prueba | GET /api/alertas |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ingresar como comprador y como administrador; llamar el endpoint. | No ven "Alertas" en el menú; la API responde 403. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="ven"></a>

## VEN · Mis ventas

### TC-VEN-001 · Publicar cosecha

| Campo | Detalle |
|---|---|
| Módulo | Mis ventas |
| Caso de alto nivel | HLTC-VEN-01 — Publicar y gestionar oferta |
| Historia de usuario | HU-CLI-02 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Parcela con evaluación (rotación Papa → Haba). |
| Datos de prueba | Cultivo Haba, 20 qq, disponible desde 2026-12, nota "Entrega en la comunidad" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir Mis ventas > Mi oferta; completar "Publicar cosecha". | El desplegable de cultivo solo ofrece los cultivos de la rotación de esa parcela. |
| 2 | Publicar. | La oferta aparece en la lista como activa. |
| 3 | Como comprador, abrir Oferta sostenible. | La oferta es visible. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-VEN-002 · Sin parcelas evaluadas no se puede ofertar

| Campo | Detalle |
|---|---|
| Módulo | Mis ventas |
| Caso de alto nivel | HLTC-VEN-01 — Publicar y gestionar oferta |
| Historia de usuario | HU-CLI-02 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | agricultor2 sin evaluaciones. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir Mis ventas. | Mensaje: "Para ofertar su cosecha, primero compare rotaciones en “Mi finca”…" |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-VEN-003 · Validaciones de la oferta

| Campo | Detalle |
|---|---|
| Módulo | Mis ventas |
| Caso de alto nivel | HLTC-VEN-01 — Publicar y gestionar oferta |
| Historia de usuario | HU-CLI-02 |
| Prioridad | Alta |
| Tipo | Límite |
| Rol / usuario | cliente |
| Precondiciones | Token de cliente; evaluación propia. |
| Datos de prueba | cantidad 0 · 0.01 · 10000000 · 10000000.01; unidad "lb"; mes "2026-13"; cultivo "quinua" fuera de la rotación; evaluacion_id ajena |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Publicar con cantidad 0 y con 10000000.01. | Error "Indique una cantidad válida". |
| 2 | Publicar con 0.01 y con 10000000. | Se aceptan. |
| 3 | Publicar con unidad "lb". | HTTP 400 "Unidad no válida". |
| 4 | Publicar con mes "2026-13". | HTTP 400 "Indique el mes desde el que estará disponible". |
| 5 | Publicar un cultivo fuera de la rotación. | HTTP 400 "El cultivo debe ser parte de la rotación de esa parcela". |
| 6 | Publicar con la evaluación de otro agricultor. | HTTP 404 "Parcela no encontrada". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-VEN-004 · Pausar y reactivar oferta

| Campo | Detalle |
|---|---|
| Módulo | Mis ventas |
| Caso de alto nivel | HLTC-VEN-01 — Publicar y gestionar oferta |
| Historia de usuario | HU-CLI-02 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente + comprador |
| Precondiciones | Oferta activa. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pausar la oferta. | Queda pausada. |
| 2 | Como comprador, buscarla. | No aparece. |
| 3 | Reactivarla. | Vuelve a aparecer para el comprador. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-VEN-005 · Máximo 30 ofertas activas

| Campo | Detalle |
|---|---|
| Módulo | Mis ventas |
| Caso de alto nivel | HLTC-VEN-01 — Publicar y gestionar oferta |
| Historia de usuario | HU-CLI-02 |
| Prioridad | Baja |
| Tipo | Límite |
| Rol / usuario | cliente |
| Precondiciones | 30 ofertas activas (crear por API). |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Publicar la oferta 31. | HTTP 400 "Tiene demasiadas ofertas activas; pause alguna antes de publicar otra". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-VEN-006 · Aceptar solicitud compartiendo teléfono

| Campo | Detalle |
|---|---|
| Módulo | Mis ventas |
| Caso de alto nivel | HLTC-VEN-02 — Responder solicitudes |
| Historia de usuario | HU-CLI-03 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente + comprador |
| Precondiciones | Solicitud pendiente del comprador (TC-COM-009). |
| Datos de prueba | Respuesta "Puedo entregar en la feria del sábado.", teléfono +59170000000 |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir "Solicitudes recibidas (n)". | La solicitud muestra comprador, cultivo, cantidad y mensaje; el contador n coincide. |
| 2 | Aceptarla con respuesta y teléfono. | Estado "aceptada"; se muestra el correo del comprador. |
| 3 | Como comprador, abrir "Mis solicitudes". | Estado aceptada; ve nombre completo del productor, su correo y el teléfono compartido. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-VEN-007 · Rechazar solicitud

| Campo | Detalle |
|---|---|
| Módulo | Mis ventas |
| Caso de alto nivel | HLTC-VEN-02 — Responder solicitudes |
| Historia de usuario | HU-CLI-03 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | cliente + comprador |
| Precondiciones | Otra solicitud pendiente. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Rechazar la solicitud. | Estado "rechazada"; no se muestran datos de contacto. |
| 2 | Como comprador, revisarla. | Estado rechazada; contacto no visible; nombre del productor abreviado. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-VEN-008 · Responder dos veces o con datos inválidos

| Campo | Detalle |
|---|---|
| Módulo | Mis ventas |
| Caso de alto nivel | HLTC-VEN-02 — Responder solicitudes |
| Historia de usuario | HU-CLI-03 |
| Prioridad | Media |
| Tipo | Negativa |
| Rol / usuario | cliente |
| Precondiciones | Solicitud ya aceptada; otra pendiente. |
| Datos de prueba | PATCH /api/solicitudes/:id/respuesta |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Responder otra vez la solicitud aceptada. | HTTP 409 "Esta solicitud ya fue respondida o retirada". |
| 2 | Aceptar la pendiente con teléfono "123". | HTTP 400 de formato de teléfono. |
| 3 | Enviar estado "quizas". | HTTP 400 "Respuesta no válida". |
| 4 | Responder una solicitud de otro productor. | HTTP 404 "Solicitud no encontrada". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-VEN-009 · Aviso web de nueva solicitud

| Campo | Detalle |
|---|---|
| Módulo | Mis ventas |
| Caso de alto nivel | HLTC-VEN-02 — Responder solicitudes |
| Historia de usuario | HU-CLI-03 |
| Prioridad | Baja |
| Tipo | Funcional |
| Rol / usuario | cliente + comprador |
| Precondiciones | Cliente con notificaciones web activadas en su dispositivo. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Como comprador, enviar una solicitud de compra. | El cliente recibe la notificación "Nueva solicitud de compra" con nombre, cultivo y cantidad. |
| 2 | Como cliente, aceptarla. | El comprador (si tiene notificaciones activas) recibe "Solicitud aceptada". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="com"></a>

## COM · Oferta sostenible (comprador)

### TC-COM-001 · Listado de oferta disponible

| Campo | Detalle |
|---|---|
| Módulo | Oferta sostenible (comprador) |
| Caso de alto nivel | HLTC-COM-01 — Explorar y filtrar oferta |
| Historia de usuario | HU-CLI-02 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | comprador |
| Precondiciones | ≥ 3 ofertas activas de distintas rotaciones. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir Oferta sostenible > Oferta disponible. | Cada oferta muestra cultivo, cantidad, unidad, mes, zona, rotación, prácticas, indicador de agua (0-100, nivel y riego mm, % que cubre la lluvia), verificada y sello si corresponde. |
| 2 | Revisar el orden. | Ordenadas por índice de agua de mayor a menor. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-COM-002 · Filtro por cultivo

| Campo | Detalle |
|---|---|
| Módulo | Oferta sostenible (comprador) |
| Caso de alto nivel | HLTC-COM-01 — Explorar y filtrar oferta |
| Historia de usuario | HU-CLI-02 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | comprador |
| Precondiciones | Ofertas de Haba y Papa. |
| Datos de prueba | Cultivo Haba |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | En "Filtrar oferta" > Cultivo elegir Haba. | Solo se muestran ofertas de Haba; el contador de cada cultivo coincide con la cantidad de ofertas. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-COM-003 · Filtro por prácticas (todas deben cumplirse)

| Campo | Detalle |
|---|---|
| Módulo | Oferta sostenible (comprador) |
| Caso de alto nivel | HLTC-COM-01 — Explorar y filtrar oferta |
| Historia de usuario | HU-CLI-02 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | comprador |
| Precondiciones | Una oferta con leguminosa y raíz profunda; otra solo con leguminosa. |
| Datos de prueba | Prácticas: leguminosa + raíz profunda |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Marcar solo "leguminosa". | Aparecen ambas ofertas. |
| 2 | Marcar también "raíz profunda". | Solo queda la oferta que cumple ambas. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-COM-004 · Filtro "Verificada"

| Campo | Detalle |
|---|---|
| Módulo | Oferta sostenible (comprador) |
| Caso de alto nivel | HLTC-COM-01 — Explorar y filtrar oferta |
| Historia de usuario | HU-CLI-02 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | comprador |
| Precondiciones | Una oferta cuya evaluación fue revisada por un técnico y otra no. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Activar "Verificada". | Solo aparece la oferta revisada. El término "Verificada" (glosario) aclara que no es una certificación orgánica ni oficial. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-COM-005 · Filtro de uso eficiente del agua

| Campo | Detalle |
|---|---|
| Módulo | Oferta sostenible (comprador) |
| Caso de alto nivel | HLTC-COM-01 — Explorar y filtrar oferta |
| Historia de usuario | HU-CLI-02 |
| Prioridad | Media |
| Tipo | Límite |
| Rol / usuario | comprador |
| Precondiciones | Ofertas con índice ≥ 70, entre 40 y 69 y < 40. |
| Datos de prueba | agua=alta · agua=media |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Elegir "alta". | Solo ofertas con índice ≥ 70. |
| 2 | Elegir "media". | Ofertas con índice ≥ 40 (media y alta). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-COM-006 · Filtro por zona y sello hídrico

| Campo | Detalle |
|---|---|
| Módulo | Oferta sostenible (comprador) |
| Caso de alto nivel | HLTC-COM-01 — Explorar y filtrar oferta |
| Historia de usuario | HU-CLI-04 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | comprador |
| Precondiciones | Ofertas en dos zonas; una con sello (≥ 15 % menos riego que papa → maíz). |
| Datos de prueba | Zona Tiquipaya; sello |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Elegir la zona Tiquipaya. | Solo ofertas de Tiquipaya. |
| 2 | Quitar la zona y activar el sello. | Solo ofertas con el sello "Gestión Hídrica Sostenible", que muestran su % de ahorro. |
| 3 | Combinar varios filtros y luego limpiarlos. | El contador de filtros activos se actualiza y al limpiar vuelve la lista completa. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-COM-007 · Privacidad del productor ante el comprador

| Campo | Detalle |
|---|---|
| Módulo | Oferta sostenible (comprador) |
| Caso de alto nivel | HLTC-COM-02 — Privacidad del productor |
| Historia de usuario | HU-CLI-02 |
| Prioridad | Alta |
| Tipo | Seguridad |
| Rol / usuario | comprador |
| Precondiciones | Oferta de "Agricultor Demo". |
| Datos de prueba | GET /api/ofertas |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Revisar la tarjeta de la oferta. | El productor aparece como "Agricultor D."; no hay correo ni teléfono. |
| 2 | Revisar la respuesta JSON. | No contiene email; lat/lon están redondeadas (~2 km) y no coinciden con la parcela exacta. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-COM-008 · Enviar solicitud de compra

| Campo | Detalle |
|---|---|
| Módulo | Oferta sostenible (comprador) |
| Caso de alto nivel | HLTC-COM-03 — Solicitudes de compra o contacto |
| Historia de usuario | HU-CLI-03 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | comprador |
| Precondiciones | Oferta activa. |
| Datos de prueba | Tipo compra, cantidad 10, mensaje "Somos la cooperativa de Tiquipaya, lo necesitamos en diciembre." |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "Contactar al productor", elegir compra, cantidad y mensaje; enviar. | Se envía y la tarjeta muestra "Ya envió una solicitud: espere la respuesta en “Mis solicitudes”." |
| 2 | Abrir "Mis solicitudes (n)". | La solicitud aparece pendiente; n incluye la nueva. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-COM-009 · Solicitud de solo contacto

| Campo | Detalle |
|---|---|
| Módulo | Oferta sostenible (comprador) |
| Caso de alto nivel | HLTC-COM-03 — Solicitudes de compra o contacto |
| Historia de usuario | HU-CLI-03 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | comprador |
| Precondiciones | Otra oferta activa. |
| Datos de prueba | Tipo contacto, sin cantidad |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Enviar una solicitud de contacto sin cantidad. | Se envía correctamente. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-COM-010 · Validaciones de la solicitud

| Campo | Detalle |
|---|---|
| Módulo | Oferta sostenible (comprador) |
| Caso de alto nivel | HLTC-COM-03 — Solicitudes de compra o contacto |
| Historia de usuario | HU-CLI-03 |
| Prioridad | Alta |
| Tipo | Negativa |
| Rol / usuario | comprador |
| Precondiciones | — |
| Datos de prueba | Mensaje de 9 caracteres; compra sin cantidad; tipo "regalo" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Enviar con mensaje de 9 caracteres. | Error "Escriba un mensaje de al menos 10 caracteres". |
| 2 | Enviar tipo compra sin cantidad. | Error "Indique la cantidad que quiere comprar". |
| 3 | Enviar tipo "regalo" por API. | HTTP 400 "Tipo de solicitud no válido". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-COM-011 · Una solicitud pendiente por oferta

| Campo | Detalle |
|---|---|
| Módulo | Oferta sostenible (comprador) |
| Caso de alto nivel | HLTC-COM-03 — Solicitudes de compra o contacto |
| Historia de usuario | HU-CLI-03 |
| Prioridad | Alta |
| Tipo | Negativa |
| Rol / usuario | comprador |
| Precondiciones | Solicitud pendiente en la oferta O. |
| Datos de prueba | POST /api/solicitudes sobre O |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Enviar otra solicitud sobre O por API. | HTTP 409 "Ya tiene una solicitud pendiente para esta oferta". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-COM-012 · Límite de 20 solicitudes por día

| Campo | Detalle |
|---|---|
| Módulo | Oferta sostenible (comprador) |
| Caso de alto nivel | HLTC-COM-03 — Solicitudes de compra o contacto |
| Historia de usuario | HU-CLI-03 |
| Prioridad | Media |
| Tipo | Límite |
| Rol / usuario | comprador |
| Precondiciones | comprador2 con 20 solicitudes en las últimas 24 h (crear por API sobre ≥ 20 ofertas o retirando y reenviando). |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Enviar la solicitud 21. | HTTP 429 "Puede enviar hasta 20 solicitudes por día". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-COM-013 · Retirar una solicitud pendiente

| Campo | Detalle |
|---|---|
| Módulo | Oferta sostenible (comprador) |
| Caso de alto nivel | HLTC-COM-03 — Solicitudes de compra o contacto |
| Historia de usuario | HU-CLI-03 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | comprador |
| Precondiciones | Una solicitud pendiente y una aceptada. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "Retirar solicitud" en la pendiente. | Estado "retirada"; el productor ya no puede responderla. |
| 2 | Intentar retirar la aceptada por API. | HTTP 409 "Solo se puede retirar una solicitud pendiente". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-COM-014 · Oferta pausada o propia

| Campo | Detalle |
|---|---|
| Módulo | Oferta sostenible (comprador) |
| Caso de alto nivel | HLTC-COM-03 — Solicitudes de compra o contacto |
| Historia de usuario | HU-CLI-03 |
| Prioridad | Media |
| Tipo | Negativa |
| Rol / usuario | comprador |
| Precondiciones | Oferta pausada por el productor. |
| Datos de prueba | POST /api/solicitudes con su oferta_id |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Enviar una solicitud a la oferta pausada. | HTTP 404 "La oferta ya no está disponible". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="cam"></a>

## CAM · Plagas y enfermedades en campo

### TC-CAM-001 · Registrar incidencia con GPS y fotos

| Campo | Detalle |
|---|---|
| Módulo | Plagas y enfermedades en campo |
| Caso de alto nivel | HLTC-CAM-01 — Registrar incidencia con GPS y fotos |
| Historia de usuario | HU-OPT-02 |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | operativo |
| Precondiciones | Teléfono con GPS en https/localhost; Drive no configurado. |
| Datos de prueba | Tipo plaga, agente "Gorgojo de los Andes", cultivo Papa, severidad alta, nota "30 % de plantas con galerías", 2 fotos JPEG |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir Plagas en campo > Marcar incidencia; en "1. ¿Dónde está?" pulsar "Usar mi ubicación (GPS)". | Muestra las coordenadas con "GPS, precisión ±N m". |
| 2 | En "2. ¿Qué encontró?" completar tipo, agente, cultivo, severidad y nota. | Campos aceptados. |
| 3 | En "3. Fotos" añadir 2 fotos y guardar. | Se guarda; la pestaña "Registradas (n)" incrementa n. |
| 4 | Abrir la incidencia en "Registradas". | Muestra los datos, estado activa y las 2 fotos. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-CAM-002 · Corregir ubicación tocando el mapa (capa satelital)

| Campo | Detalle |
|---|---|
| Módulo | Plagas y enfermedades en campo |
| Caso de alto nivel | HLTC-CAM-01 — Registrar incidencia con GPS y fotos |
| Historia de usuario | HU-OPT-02 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | operativo |
| Precondiciones | — |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Cambiar a la capa satelital y tocar otro punto del mapa. | La ubicación cambia y se indica "marcado a mano en el mapa". |
| 2 | Intentar guardar sin ubicación en un registro nuevo. | Error "Falta la ubicación: use el GPS o toque el mapa." |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-CAM-003 · Validaciones de la incidencia

| Campo | Detalle |
|---|---|
| Módulo | Plagas y enfermedades en campo |
| Caso de alto nivel | HLTC-CAM-01 — Registrar incidencia con GPS y fotos |
| Historia de usuario | HU-OPT-02 |
| Prioridad | Alta |
| Tipo | Negativa |
| Rol / usuario | operativo |
| Precondiciones | — |
| Datos de prueba | Agente "ab"; tipo "virus"; severidad "extrema"; cultivo "cafe"; precision_m 30001 |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Guardar con agente de 2 caracteres. | Error "Indique qué plaga, enfermedad o deficiencia observó". |
| 2 | Por API enviar tipo "virus" y severidad "extrema". | HTTP 400 "Tipo no válido" / "Severidad no válida". |
| 3 | Por API enviar cultivo "cafe". | HTTP 400 "Cultivo desconocido". |
| 4 | Por API enviar precision_m 30001. | HTTP 400 "Precisión GPS no válida". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-CAM-004 · Límites de fotos

| Campo | Detalle |
|---|---|
| Módulo | Plagas y enfermedades en campo |
| Caso de alto nivel | HLTC-CAM-01 — Registrar incidencia con GPS y fotos |
| Historia de usuario | HU-OPT-02 |
| Prioridad | Alta |
| Tipo | Límite |
| Rol / usuario | operativo |
| Precondiciones | Incidencia registrada. |
| Datos de prueba | 6 fotos; foto de > 8 MB (vía API sin reducir); archivo PDF |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Añadir 5 fotos. | El título muestra "3. Fotos 5 de 5" y desaparece la opción de añadir más. |
| 2 | Por API subir una sexta foto a la misma incidencia. | HTTP 400 "Cada incidencia admite hasta 5 fotos". |
| 3 | Enviar por API una imagen de más de 8 MB. | HTTP 413 "El archivo es demasiado grande". |
| 4 | Enviar un PDF con Content-Type application/pdf. | HTTP 400 "Envíe la foto como imagen JPEG, PNG o WebP". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-CAM-005 · Reducción de fotos y eliminación de EXIF

| Campo | Detalle |
|---|---|
| Módulo | Plagas y enfermedades en campo |
| Caso de alto nivel | HLTC-CAM-01 — Registrar incidencia con GPS y fotos |
| Historia de usuario | HU-OPT-02 |
| Prioridad | Media |
| Tipo | Seguridad |
| Rol / usuario | operativo |
| Precondiciones | Foto de 4000 px con EXIF de GPS. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Subir la foto desde la interfaz. | Se guarda. |
| 2 | Descargar la foto guardada (Backend/fotos/ o Drive) y revisar sus propiedades. | Es JPEG, su lado mayor es ≤ 1600 px y no tiene metadatos EXIF. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-CAM-006 · Almacén de fotos local o Google Drive

| Campo | Detalle |
|---|---|
| Módulo | Plagas y enfermedades en campo |
| Caso de alto nivel | HLTC-CAM-01 — Registrar incidencia con GPS y fotos |
| Historia de usuario | HU-OPT-02 |
| Prioridad | Media |
| Tipo | Integración |
| Rol / usuario | operativo, administrador |
| Precondiciones | Corrida A sin GOOGLE_DRIVE_*; corrida B con cuenta de servicio y unidad compartida. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Corrida A: abrir Plagas en campo. | Aviso: "Google Drive no está configurado: las fotos se guardan en el servidor de Poseidon…"; los archivos quedan en Backend/fotos/. |
| 2 | Corrida B: subir una foto. | En la unidad compartida aparece "incidencia-<id>-<AAAAMMDD>-<n>.jpg" con descripción (tipo, agente, coordenadas, técnico). |
| 3 | Corrida B: Administración > Sistema. | Indica que la conexión con Drive funciona. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-CAM-007 · Marcar incidencia controlada o activa

| Campo | Detalle |
|---|---|
| Módulo | Plagas y enfermedades en campo |
| Caso de alto nivel | HLTC-CAM-02 — Estado y consulta de incidencias |
| Historia de usuario | HU-OPT-02 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | operativo |
| Precondiciones | Incidencia activa. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | En "Registradas" cambiar el "Estado" a controlada. | Se guarda; deja de contar en la comparación (ver TC-ROT-008) y en plagas activas del monitoreo. |
| 2 | Volver a activa. | Se guarda. |
| 3 | PATCH con estado "resuelta". | HTTP 400 "Estado no válido". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-CAM-008 · Monitoreo consulta incidencias pero no registra

| Campo | Detalle |
|---|---|
| Módulo | Plagas y enfermedades en campo |
| Caso de alto nivel | HLTC-CAM-02 — Estado y consulta de incidencias |
| Historia de usuario | HU-OPT-02 |
| Prioridad | Media |
| Tipo | Seguridad |
| Rol / usuario | monitoreo |
| Precondiciones | Incidencias con fotos. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Como monitoreo, abrir el mapa del Panorama. | Ve las incidencias activas (posición aproximada). |
| 2 | GET /api/incidencias/:id/fotos/:foto con su token. | HTTP 200 con la imagen. |
| 3 | POST /api/incidencias con su token. | HTTP 403. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="glo"></a>

## GLO · Glosario y guía

### TC-GLO-001 · Cuadro emergente de un término

| Campo | Detalle |
|---|---|
| Módulo | Glosario y guía |
| Caso de alto nivel | HLTC-GLO-01 — Glosario y ayudas contextuales |
| Historia de usuario | HU-USR-04 |
| Prioridad | Media |
| Tipo | Usabilidad |
| Rol / usuario | cliente |
| Precondiciones | Comparación o ficha abierta. |
| Datos de prueba | Término "Verdor de la parcela (NDVI)" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Localizar un término con línea punteada y "?". | Tiene estilo distintivo. |
| 2 | Tocarlo. | Se abre un cuadro con explicación en lenguaje cotidiano, apoyo visual, ejemplo práctico, cómo lo usa Poseidon y la fuente. |
| 3 | Cerrarlo con la tecla Escape y, tras reabrirlo, tocando fuera del cuadro. | Se cierra en ambos casos. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-GLO-002 · Cuadro como hoja inferior en el teléfono

| Campo | Detalle |
|---|---|
| Módulo | Glosario y guía |
| Caso de alto nivel | HLTC-GLO-01 — Glosario y ayudas contextuales |
| Historia de usuario | HU-USR-04 |
| Prioridad | Baja |
| Tipo | Usabilidad |
| Rol / usuario | cliente |
| Precondiciones | Viewport 375 px. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Tocar un término. | El cuadro aparece como hoja inferior que no desborda la pantalla. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-GLO-003 · Vista Glosario: buscador y filtro

| Campo | Detalle |
|---|---|
| Módulo | Glosario y guía |
| Caso de alto nivel | HLTC-GLO-01 — Glosario y ayudas contextuales |
| Historia de usuario | HU-USR-04 |
| Prioridad | Media |
| Tipo | Funcional |
| Rol / usuario | Cualquiera |
| Precondiciones | — |
| Datos de prueba | Búsqueda "helada"; filtro por tema |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir Glosario. | Muestra "Guía rápida: cómo leer su comparación" y la lista de términos. |
| 2 | Buscar "helada". | Filtra los términos relacionados. |
| 3 | Usar "Filtrar por tema". | Muestra solo los términos del tema. |
| 4 | Buscar "SMAP". | Aparece marcado como "aún no se usa". |
| 5 | Buscar "xyz123". | No se muestra ningún término y la vista no da error. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-GLO-004 · Ir al glosario completo desde el cuadro

| Campo | Detalle |
|---|---|
| Módulo | Glosario y guía |
| Caso de alto nivel | HLTC-GLO-01 — Glosario y ayudas contextuales |
| Historia de usuario | HU-USR-04 |
| Prioridad | Baja |
| Tipo | Funcional |
| Rol / usuario | cliente |
| Precondiciones | Cuadro emergente abierto. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Pulsar "Ver en el glosario completo". | Cambia a la vista Glosario posicionada en ese término. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

<a id="nfr"></a>

## NFR · No funcionales

### TC-NFR-001 · Diseño responsive en teléfono

| Campo | Detalle |
|---|---|
| Módulo | No funcionales |
| Caso de alto nivel | HLTC-NFR-01 — Responsive y compatibilidad |
| Historia de usuario | HU-USR-06 |
| Prioridad | Alta |
| Tipo | Usabilidad |
| Rol / usuario | Todos |
| Precondiciones | DevTools device toolbar 375×812. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Recorrer todas las vistas de cada rol. | No hay scroll horizontal de página; las tablas se apilan o se desplazan dentro de su contenedor. |
| 2 | Revisar cabecera y menú. | Botones legibles y pulsables (≥ 40 px de alto aprox.). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-NFR-002 · Compatibilidad de navegadores

| Campo | Detalle |
|---|---|
| Módulo | No funcionales |
| Caso de alto nivel | HLTC-NFR-01 — Responsive y compatibilidad |
| Historia de usuario | — |
| Prioridad | Media |
| Tipo | Compatibilidad |
| Rol / usuario | cliente, operativo |
| Precondiciones | Chrome, Edge, Firefox (escritorio), Chrome Android, Safari iOS. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ejecutar en cada navegador: ingreso, registrar parcela, comparar, ficha, registrar incidencia. | Funcionan sin errores de consola ni de diseño. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-NFR-003 · Tiempo de carga en 3G

| Campo | Detalle |
|---|---|
| Módulo | No funcionales |
| Caso de alto nivel | HLTC-NFR-02 — Rendimiento en redes lentas |
| Historia de usuario | HU-USR-06 |
| Prioridad | Media |
| Tipo | Rendimiento |
| Rol / usuario | cliente |
| Precondiciones | npm run build && npm run preview; throttling personalizado 400 kbit/s, 400 ms y "3G" 1,6 Mbit/s, 150 ms; modo bajo consumo activo. |
| Datos de prueba | Referencia README: 3G lento 3,4 s / 0,9 s; 3G 1,1 s / 0,3 s |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Medir la primera carga (caché vacía) hasta ver el resumen. | Tiempo ≤ referencia + 20 %. |
| 2 | Medir la visita siguiente. | Tiempo ≤ referencia + 20 %. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-NFR-004 · Modo memoria sin MySQL

| Campo | Detalle |
|---|---|
| Módulo | No funcionales |
| Caso de alto nivel | HLTC-NFR-03 — Resiliencia ante servicios caídos |
| Historia de usuario | — |
| Prioridad | Alta |
| Tipo | Resiliencia |
| Rol / usuario | administrador |
| Precondiciones | MySQL detenido o credenciales vacías en .env. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Arrancar el backend. | La consola indica "datos: memoria"; la API responde. |
| 2 | Ingresar con los usuarios demo y ejecutar el smoke. | Todo funciona. |
| 3 | Reiniciar el backend. | Los datos creados se pierden (comportamiento esperado); Administración > Sistema muestra el modo memoria. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-NFR-005 · Texto con HTML/script se muestra como texto (XSS)

| Campo | Detalle |
|---|---|
| Módulo | No funcionales |
| Caso de alto nivel | HLTC-NFR-04 — Seguridad funcional |
| Historia de usuario | — |
| Prioridad | Alta |
| Tipo | Seguridad |
| Rol / usuario | cliente, comprador, operativo |
| Precondiciones | — |
| Datos de prueba | <script>alert(1)</script> y <img src=x onerror=alert(1)> |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Usar los datos en: nombre de parcela, nota de oferta, mensaje de solicitud, observación de visita y agente de incidencia. | Se guardan. |
| 2 | Ver esos datos en las pantallas de los demás roles. | Se muestran como texto literal; no se ejecuta ningún script ni aparece un alert. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-NFR-006 · Inyección de fórmulas en CSV

| Campo | Detalle |
|---|---|
| Módulo | No funcionales |
| Caso de alto nivel | HLTC-NFR-04 — Seguridad funcional |
| Historia de usuario | — |
| Prioridad | Media |
| Tipo | Seguridad |
| Rol / usuario | operativo |
| Precondiciones | — |
| Datos de prueba | Observación de visita "=HYPERLINK(\"http://x\",\"clic\")" |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Registrar la visita y exportar el CSV; abrirlo en Excel. | La celda empieza con apóstrofo y se muestra como texto, no como fórmula. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-NFR-007 · Cuerpo de petición demasiado grande

| Campo | Detalle |
|---|---|
| Módulo | No funcionales |
| Caso de alto nivel | HLTC-NFR-04 — Seguridad funcional |
| Historia de usuario | — |
| Prioridad | Baja |
| Tipo | Seguridad |
| Rol / usuario | cliente |
| Precondiciones | — |
| Datos de prueba | JSON de 60 KB en POST /api/parcelas |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Enviar la petición. | HTTP 413 "El archivo es demasiado grande"; el servidor sigue respondiendo. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-NFR-008 · Navegación con teclado y etiquetas

| Campo | Detalle |
|---|---|
| Módulo | No funcionales |
| Caso de alto nivel | HLTC-NFR-05 — Accesibilidad y pruebas automáticas |
| Historia de usuario | — |
| Prioridad | Media |
| Tipo | Accesibilidad |
| Rol / usuario | cliente |
| Precondiciones | Lighthouse disponible. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Recorrer ingreso, menú y comparador solo con Tab/Shift+Tab/Enter. | Todos los controles son alcanzables y el foco es visible. |
| 2 | Ejecutar Lighthouse > Accessibility en Mi finca. | Puntaje ≥ 90; los errores se reportan con el elemento afectado. |
| 3 | Revisar que los mensajes de error se anuncian. | Tienen role="alert". |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-NFR-009 · Suite de pruebas automáticas del backend

| Campo | Detalle |
|---|---|
| Módulo | No funcionales |
| Caso de alto nivel | HLTC-NFR-05 — Accesibilidad y pruebas automáticas |
| Historia de usuario | — |
| Prioridad | Alta |
| Tipo | Funcional |
| Rol / usuario | QA / Dev |
| Precondiciones | Dependencias instaladas. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ejecutar "cd Backend && npm test". | Todas las pruebas pasan (0 fallidas). |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |

### TC-NFR-010 · Servicios externos opcionales no configurados

| Campo | Detalle |
|---|---|
| Módulo | No funcionales |
| Caso de alto nivel | HLTC-NFR-03 — Resiliencia ante servicios caídos |
| Historia de usuario | — |
| Prioridad | Media |
| Tipo | Resiliencia |
| Rol / usuario | administrador, operativo |
| Precondiciones | Sin TWILIO_*, GOOGLE_DRIVE_*, GAMC_WMS_*. |
| Datos de prueba | — |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Revisar Administración > Sistema, Alertas, Plagas en campo y Monitoreo. | Cada vista avisa del modo simulado/local/no configurado y sigue funcionando sin errores 500. |

| Resultado obtenido | Estado | Ejecutado por | Fecha | Defecto |
|---|---|---|---|---|
| | No ejecutado | | | |
