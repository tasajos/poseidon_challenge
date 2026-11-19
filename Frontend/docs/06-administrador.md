# Manual del administrador

Para personas con el rol **`administrador`**. Si todavía no sabe entrar a Poseidon, lea primero
[Primeros pasos](01-primeros-pasos.md).

[← Volver al índice](README.md)

---

## Lo que puede hacer en Poseidon

1. **Registrar y habilitar cuentas** para agricultores, técnicos, compradores y gestores, y aprobar las cuentas con privilegios.
2. **Decidir qué puede hacer cada rol** (permisos).
3. **Asignar las parcelas** a los técnicos de campo.
4. **Revisar la auditoría**: quién hizo qué y cuándo.
5. **Crear respaldos y restaurar** la base de datos a un punto anterior.
6. **Ver el estado del sistema**: base de datos, alertas, SMS y almacenamiento de fotos.
7. **Ver los datos de la NASA en vivo** de cualquier parcela registrada, con mapas de lluvia, viento y temperatura.

En el menú verá: **NASA en vivo**, **Asistencia técnica**, **Monitoreo**, **Administración** y **Glosario**. Al entrar se abre
*Administración*, con estas pestañas: **Usuarios**, **Roles y permisos**, **Parcelas y técnicos**, **Auditoría**,
**Respaldos**, **Sistema** y **Cultivos**.

Los recuadros de arriba cuentan cuántas cuentas **activas** hay de cada rol.

---

## 1. Registrar una cuenta nueva

En **Administración → Usuarios**, el formulario **Registrar usuario** está a la derecha (en el teléfono, abajo).
Los campos marcados con **(obligatorio)** son necesarios para guardar.

| Campo | Qué escribir |
|---|---|
| **Nombre** (obligatorio) | Nombre y apellido de la persona |
| **Correo** (obligatorio) | Su correo. **Es el identificador de la cuenta: no puede repetirse.** Con él ingresará |
| **Teléfono** (opcional) | Con código de país, por ejemplo `+591 70000000` |
| **Rol** (obligatorio) | Ver la tabla de roles más abajo |
| **Contraseña inicial** (obligatorio) | Mínimo 8 caracteres. Entréguesela a la persona en privado |

Pulse **Registrar usuario**.

**Qué pasa según el rol:**
- **Agricultor (cliente)** y **Comprador**: la cuenta queda **habilitada** al instante. El mensaje verde dice
  *"Cuenta de … registrada y habilitada."*
- **Técnico operativo**, **Gestor de monitoreo** y **Administrador**: tienen acceso a datos de otras personas, por eso
  la cuenta queda **pendiente de aprobación** (lo avisa un recuadro amarillo antes de guardar). La persona no puede
  entrar hasta que se apruebe.

**Si algo está mal**, aparece un mensaje rojo debajo del botón y **el campo con el problema se marca en rojo**. Por
ejemplo:
- *"Ya existe una cuenta con ese correo"*: ese correo ya está registrado. Búsquelo en la tabla *Usuarios*.
- *"Escriba un correo válido…"*, *"La contraseña debe tener al menos 8 caracteres"*, *"Escriba el teléfono con código
  de país…"*.

Cada registro queda anotado en la **Auditoría**, **sin la contraseña**.

### Roles disponibles

| Rol (como aparece en el formulario) | Para quién | Necesita aprobación |
|---|---|---|
| Agricultor (cliente) | Agricultores y sembradores | No |
| Comprador (cooperativa o mercado) | Cooperativas, mercados, compradores | No |
| Técnico operativo | Técnicos de campo, extensionistas | **Sí** |
| Gestor de monitoreo | Analistas de la alcaldía o la gobernación | **Sí** |
| Administrador | Encargados del sistema | **Sí** |

---

## 2. Aprobar o rechazar cuentas pendientes

Cuando hay cuentas esperando, en **Administración → Usuarios** aparece arriba el recuadro **Cuentas pendientes de
aprobación**, con el número de pendientes.

1. Revise el nombre, el correo, el rol y quién la registró.
2. Pulse **Aprobar** si corresponde: la persona ya puede entrar.
3. Pulse **Rechazar** si no corresponde: la cuenta queda inactiva y no puede entrar.

**Doble control:** si hay **otro administrador activo**, usted **no puede aprobar las cuentas que usted mismo
registró**: debe aprobarlas el otro. Si usted es el único administrador, sí puede, y la auditoría lo deja señalado.

---

## 3. Cambiar el rol o desactivar una cuenta

En la tabla **Usuarios**:
- **Rol**: elija el nuevo rol en la lista desplegable de la fila. Si sube a alguien a un rol con privilegios (técnico,
  gestor o administrador), **la cuenta vuelve a quedar pendiente** hasta que se apruebe.
- **Estado**: *Activa*, *Pendiente de aprobación* o *Inactiva*.
- **Acceso**: pulse **Desactivar** para que la persona no pueda entrar más (aunque tenga la sesión abierta, pierde el
  acceso en su siguiente acción). **Activar** la habilita de nuevo.

No puede cambiar su propio rol ni desactivarse a sí mismo.

---

## 4. Roles y permisos

En **Administración → Roles y permisos** hay una tabla: una **fila por permiso** y una **columna por rol**. Una casilla
marcada significa que ese rol tiene ese permiso.

- Marque o desmarque una casilla y el cambio **se guarda al instante**. Un mensaje verde lo confirma, por ejemplo
  *"Gestor de monitoreo: ya no puede ver el tablero…"*.
- El cambio rige **de inmediato**, incluso para personas que ya tienen la sesión abierta: la sección desaparece de su
  menú y el servidor rechaza sus datos.
- La casilla **"Gestionar usuarios…"** del administrador está fija y no se puede quitar, para que el sistema nunca
  quede sin nadie que lo administre.

| Permiso | Qué permite | Lo tienen por defecto |
|---|---|---|
| Registrar sus parcelas, comparar rotaciones… | Sección *Mi finca* | Agricultor |
| Ver las parcelas y evaluaciones individuales de todos | Ver datos de **cualquier** agricultor. Sin él, el técnico ve solo sus parcelas asignadas y el analista solo resúmenes | Administrador |
| Revisar las evaluaciones de sus parcelas asignadas… | Sección *Asistencia técnica* (revisión y nota técnica) | Técnico, Administrador |
| Ver el tablero de monitoreo y los reportes regionales | Sección *Monitoreo* | Técnico, Monitoreo, Administrador |
| Recibir alertas climáticas críticas en su teléfono | Sección *Alertas* | Agricultor, Técnico, Monitoreo |
| Gestionar usuarios, roles y permisos; ver la auditoría | Pestañas de usuarios, permisos y auditoría | Administrador (fijo) |
| Crear y restaurar respaldos | Pestaña *Respaldos* | Administrador |
| Publicar su oferta de cosecha y responder solicitudes | Sección *Mis ventas* | Agricultor |
| Ver la oferta sostenible y enviar solicitudes | Sección *Oferta sostenible* | Comprador |
| Registrar plagas y enfermedades en el mapa, con fotos | Sección *Plagas en campo* | Técnico |
| Registrar visitas técnicas y validar las estrategias | Pestañas *Visitas* y *Validaciones*, y la observación local | Técnico |
| Asignar parcelas a los técnicos de campo | Pestaña *Parcelas y técnicos* | Administrador |

> **Cuidado con "Ver las parcelas y evaluaciones individuales de todos".** Da acceso a datos privados de todos los
> agricultores. Otórguelo solo a quien de verdad lo necesite.

---

## 5. Asignar parcelas a los técnicos

Cada técnico ve **solo las parcelas que tiene asignadas**. Cuando un agricultor registra una parcela, Poseidon la asigna
sola al **técnico activo con menos parcelas**. Usted puede cambiarlo:

1. Vaya a **Administración → Parcelas y técnicos**.
2. En la fila de la parcela, en **Técnico asignado**, elija otro técnico o **Sin asignar**.
3. El cambio se guarda al instante y queda en la auditoría.

Haga esto cuando un técnico se va, cambia de zona o tiene demasiadas parcelas. Las parcelas registradas antes de que
existiera la asignación aparecen como *Sin asignar*.

---

## 6. Auditoría

**Administración → Auditoría** muestra los últimos 300 eventos: **cuándo**, **quién**, **qué hizo** y el **detalle**.

Se registran: cuentas registradas, aprobadas y rechazadas; cambios de rol; cuentas activadas y desactivadas; cambios de
permisos (qué se otorgó y qué se retiró); asignaciones de parcelas; restauraciones de respaldos.

**Nunca se guardan contraseñas ni credenciales.**

---

## 7. Respaldos y restauración

### Respaldos automáticos
Poseidon guarda **un respaldo cada día** a la hora configurada (03:00 por defecto) y conserva los más recientes. Si el
servidor estaba apagado a esa hora, lo hace al encenderse. En **Administración → Respaldos**, el recuadro **Respaldo
automático** muestra la frecuencia, el próximo, el último y cuántos se conservan. Si el último falló, aparece en rojo.

### Crear un respaldo ahora
Pulse **Crear respaldo ahora**. Hágalo **antes de cualquier cambio importante** (por ejemplo, antes de un cambio
masivo de permisos o de una actualización del sistema).

### Restaurar a un punto anterior
**Restaurar reemplaza los datos actuales** (usuarios, permisos, parcelas, evaluaciones, alertas, ofertas, visitas…)
por los del respaldo. **Todo lo hecho después de esa fecha se pierde.**

1. En **Puntos de restauración**, busque el respaldo por su fecha. Cada uno indica su tipo (*Automático*, *Manual* o
   *Antes de restaurar*), cuántos usuarios, parcelas y evaluaciones contiene, y su tamaño.
2. Pulse **Restaurar…** en ese respaldo.
3. Aparece un recuadro rojo **Restaurar a (fecha)**. Lea la advertencia.
4. Para confirmar, **escriba exactamente el nombre del respaldo** que se muestra (por ejemplo
   `manual-20261114-153000.json`). El botón se habilita solo cuando el nombre coincide.
5. Pulse **Restaurar base de datos**.

**Siempre se puede deshacer:** antes de restaurar, Poseidon guarda el estado actual como un respaldo de tipo
**Antes de restaurar**. Si se equivocó, restaure ese respaldo.

No se puede restaurar un respaldo que no tenga ningún administrador activo, para no dejar el sistema sin acceso.

> Los respaldos incluyen hashes de contraseñas. La carpeta de respaldos del servidor debe copiarse a otro disco y
> protegerse.

---

## 8. Estado del sistema

**Administración → Sistema** resume:
- **Base de datos**: *MySQL conectado*, o *Modo memoria* (los datos se pierden al reiniciar el servidor: restaure un
  respaldo para recuperarlos).
- **Respaldos**: frecuencia y último respaldo.
- **Alertas climáticas**: cada cuántas horas se revisan las parcelas y el resultado de la última revisión.
- **Umbrales**: helada (mínima de 0 °C o menos) y sequía (lluvia de 30 días bajo el 30 % de lo normal).
- **SMS**: si están configurados o se simulan.
- **Fotos de campo**: si se guardan en la unidad compartida de **Google Drive** y si la conexión funciona.

Si algo dice *"no configurado"*, la persona encargada del servidor debe completar el archivo `Backend/.env` (ver el
`README.md` del proyecto).

---

## 9. Cultivos

**Administración → Cultivos** muestra el catálogo de cultivos que usa Poseidon: familia, ciclo, mes de siembra,
coeficiente de agua (Kc), tolerancia a la helada y valor de mercado. Son **valores de referencia aproximados** que
deben validarse con un agrónomo local.

---

## 10. Las otras secciones

- **Asistencia técnica**: con el permiso de ver todas las parcelas, en *Revisión* verá las evaluaciones de **todos**
  los agricultores y podrá dejar notas técnicas. Ver el [Manual del técnico](03-tecnico.md).
- **Monitoreo**: además de los resúmenes, ve la pestaña **Detalle por parcela**, con los datos individuales. Ver el
  [Manual de monitoreo](05-monitoreo.md).

- **NASA en vivo**: la misma vista del agricultor (ver la sección 7 del [Manual del agricultor](02-agricultor.md)),
  pero en **Parcela** puede elegir la de **cualquier agricultor** (aparece "nombre de la parcela — agricultor").
  Pulse **Consultar ahora a la NASA** para pedir los datos en ese momento. La consola muestra solo las consultas
  que hizo usted. Si todavía ningún agricultor registró una parcela, la página lo avisa y muestra igual el mapa.

- **Mapa**: grande, con botones arriba para cambiar lo que muestra. Todas las capas son gratuitas y vienen de la
  NASA (servicio GIBS):
  - **Calles**: el mapa de siempre.
  - **Satélite**: la foto del satélite de ayer; se ven las nubes y el terreno.
  - **Lluvia**: dónde llovió el último día publicado (misión GPM), con su escala de colores debajo.
  - **Temperatura del suelo**: qué tan caliente estuvo la superficie de día (MODIS). Donde había nubes no hay color.
  - **Viento (mensual)** y **Temperatura del aire (mensual)**: promedios del último mes publicado (modelo MERRA-2,
    con 2 a 3 meses de retraso). La NASA no ofrece mapas gratuitos de viento al momento.

  Al elegir una capa de la NASA el mapa se aleja, porque sus cuadros miden kilómetros. **Abrir en NASA Worldview**
  abre el visor oficial de la NASA en otra pestaña, centrado en la parcela, con más capas y fechas.

---

## Tareas frecuentes del administrador

| Necesito… | Dónde |
|---|---|
| Dar acceso a un agricultor nuevo | *Usuarios* → Registrar usuario → Rol *Agricultor (cliente)* |
| Dar acceso a un técnico nuevo | *Usuarios* → Registrar usuario → Rol *Técnico operativo* → que otro administrador lo apruebe |
| Que alguien no entre más | *Usuarios* → **Desactivar** en su fila |
| Un técnico se fue | Desactívelo y reasigne sus parcelas en *Parcelas y técnicos* |
| Alguien olvidó su contraseña | Poseidon todavía no tiene recuperación de contraseña: registre una cuenta nueva con otro correo, o pida al encargado del servidor que la restablezca |
| Saber quién cambió un permiso | *Auditoría* |
| Volver atrás después de un error grave | *Respaldos* → Restaurar… |

[← Volver al índice](README.md)
