# Problemas frecuentes

Qué hacer cuando algo no sale como se espera. Busque el síntoma que tiene.

[← Volver al índice](README.md)

---

## No puedo entrar

| Lo que ve | Qué hacer |
|---|---|
| *Correo o contraseña incorrectos* | Revise que el correo esté bien escrito, sin espacios. La contraseña distingue mayúsculas y minúsculas. Si sigue igual, su cuenta pudo ser desactivada: consulte al administrador |
| *Su cuenta está pendiente de aprobación* | Las cuentas de técnico, monitoreo y administrador deben ser aprobadas. Avise al administrador |
| *Demasiados intentos. Espere unos minutos.* | Espere 15 minutos e intente de nuevo |
| Olvidé mi contraseña | Poseidon todavía no tiene recuperación automática. Pida ayuda al administrador |
| La página me saca y me pide ingresar de nuevo | La sesión dura hasta cerrar la pestaña (o 12 horas si marcó *Recordar sesión*). Vuelva a ingresar |
| Aparece una página de Microsoft: *"Está a punto de conectarse a un túnel de desarrollador"* | Es normal cuando Poseidon se comparte por un túnel. Pulse **Continuar** |

## La página se ve en blanco o no termina de cargar

1. Recargue la página: **Ctrl + F5** en la computadora, o deslice hacia abajo en el teléfono.
2. Revise su conexión a internet.
3. Si su señal es débil, active **Modo bajo consumo** (botón de la barra verde de arriba).
4. Si sigue en blanco, avise al administrador: puede que el servidor esté apagado.

## No veo una sección o un botón que otro usuario sí ve

Cada rol ve solo lo que le corresponde. Mire su rol en la etiqueta junto a su nombre y consulte el manual de ese rol.
Si cree que necesita otra sección, pídala al administrador. Si el administrador le quita un permiso, la sección
desaparece en cuanto vuelve a la pestaña.

## El mapa

| Lo que ve | Qué hacer |
|---|---|
| *"Mapa oculto en modo de bajo consumo"* | Es normal en ese modo. Desactive **Modo bajo consumo** para ver el mapa |
| El mapa sale gris o en blanco | Espere unos segundos: los mapas tardan con señal débil. Si no aparece, recargue |
| Cuadros con el texto *"Access blocked"* | El servicio de mapas rechazó la petición. Recargue la página. Si sigue, avise al administrador |
| No encuentro mi parcela | Use **Buscar su zona** para acercar el mapa, luego el botón **+** |

## El GPS

| Lo que ve | Qué hacer |
|---|---|
| *"No dio permiso de ubicación"* | Toque el candado junto a la dirección de la página → **Permisos** → **Ubicación** → **Permitir**. Luego recargue |
| *"No se pudo obtener la ubicación"* | Salga a cielo abierto y espere un momento. Si no funciona, marque el punto tocando el mapa |
| *"El GPS del navegador necesita una conexión segura"* | La dirección debe empezar con `https://`. Pida al administrador la dirección correcta, o marque el punto en el mapa |

## Las alertas y notificaciones no llegan

1. En **Alertas**, revise que estén encendidos **Helada** y/o **Sequía severa**, y **Notificación web** o **SMS**.
   Pulse **Guardar preferencias**.
2. En el recuadro **Este dispositivo** debe decir *"Recibe notificaciones"*. Si no, pulse **Activar notificaciones aquí**
   y responda **Permitir**.
3. Si antes respondió **Bloquear**, toque el candado junto a la dirección → **Notificaciones** → **Permitir**.
4. En iPhone, Poseidon debe estar agregado a la pantalla de inicio y abierto desde ese ícono.
5. Pulse **Enviar alerta de prueba**.
6. Si eligió SMS y en *Sistema* dice que los SMS se simulan, los mensajes no salen de verdad: avise al administrador.

Recuerde: **las alertas solo avisan de condiciones ya medidas**. Si no hubo helada ni sequía, no llega nada.

## Las fotos (técnicos)

| Lo que ve | Qué hacer |
|---|---|
| *"Fotos sin subir…"* | La señal se cortó. En **Registradas**, pulse **+ Foto** en esa incidencia para agregarla de nuevo |
| *"formato no compatible"* | En iPhone: *Ajustes → Cámara → Formatos → Más compatible*. Luego tome la foto de nuevo |
| *"Google Drive no está configurado"* | Las fotos se guardan igual en el servidor. Avise al administrador |
| *"Cada incidencia admite hasta 5 fotos"* | Elija las 5 más claras |

## El verdor (NDVI) no aparece

La primera consulta a la NASA tarda **varios minutos**. Mientras dice *"Consultando el satélite MODIS…"*, puede seguir
usando Poseidon: la ficha se actualiza sola. Si dice *"No se pudo consultar MODIS ahora"*, el servicio de la NASA no
respondió: pulse **Consultar NDVI ahora** más tarde.

## Un número me parece raro

- Revise si hay un **aviso amarillo** de *"clima de demostración"*: significa que no hubo conexión con la NASA y se
  usó un clima de ejemplo. Repita la comparación más tarde.
- Toque el **?** junto al número para leer qué significa.
- Recuerde que los datos de satélite describen una zona, no su parcela exacta ([Cómo funciona](07-como-funciona.md)).
- Consúltelo con su técnico de campo.

## Me equivoqué

| Error | Cómo corregirlo |
|---|---|
| Datos de la parcela (cultivo, superficie, etapa, riego) | Ficha de la parcela → **Corregir estos datos** |
| Ubicación de la parcela | No se puede cambiar: registre la parcela de nuevo |
| Una campaña pasada mal anotada | Ficha → Historial de cosechas → **Quitar** en esa fila |
| Elegí la rotación equivocada | Pulse **Quitar mi elección** y elija la correcta |
| Una solicitud de compra enviada por error | **Mis solicitudes** → **Retirar solicitud** (solo si sigue pendiente) |
| Respondí mal una solicitud (agricultor) | La respuesta no se puede cambiar. Escriba al comprador si lo aceptó |
| Marqué una plaga como controlada por error | **Plagas en campo → Registradas → Reactivar** |
| Un cambio grave en los datos (administrador) | **Administración → Respaldos → Restaurar…** |

---

¿No encontró su problema? Anote qué estaba haciendo, qué mensaje apareció y su rol, y escríbale al administrador de
Poseidon.

[← Volver al índice](README.md)
