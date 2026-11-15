# Manual del técnico de campo

Para personas con el rol **`operativo`** (técnico de campo o extensionista). Si todavía no sabe entrar a Poseidon,
lea primero [Primeros pasos](01-primeros-pasos.md).

[← Volver al índice](README.md)

---

## Lo que puede hacer en Poseidon

1. **Ver las parcelas que tiene asignadas**, con su ficha agroclimática, para preparar cada visita.
2. **Revisar las comparaciones** que hacen los agricultores y dejarles una nota técnica.
3. **Validar cada estrategia** con observaciones locales: dónde conseguir semilla, qué cuidados tomar en la zona.
4. **Registrar sus visitas** de asesoramiento y exportar un resumen para los informes.
5. **Marcar plagas y enfermedades** en el mapa desde el campo, con GPS y fotos.

En el menú verá: **Asistencia técnica**, **Monitoreo**, **Alertas**, **Plagas en campo** y **Glosario**.

**Importante sobre la privacidad:** usted ve **solo las parcelas que tiene asignadas**. No puede abrir las de otros
técnicos. Cada parcela nueva se asigna sola al técnico con menos carga; el administrador puede cambiar la asignación.

---

## 1. Sus parcelas asignadas

1. En el menú, toque **Asistencia técnica**.
2. Toque la pestaña **Mis parcelas**.

A la izquierda está la lista: cada parcela con su nombre, su identificador (`PAR-00012`), el **agricultor**, la zona,
el cultivo y la etapa. Si la parcela está en ladera aparece la etiqueta **Riesgo de erosión medio** o **Alerta:
riesgo de erosión alto**.

Si la lista está vacía, aparece *"Aún no tiene parcelas asignadas"*: pida al administrador que le asigne parcelas.

### Preparar una visita con la ficha
Toque una parcela. A la derecha se abre su **ficha**, la misma que ve el agricultor. Las partes más útiles antes de
ir al campo:

- **Datos que dio el agricultor**: cultivo, etapa, superficie y riego. Lo que el agricultor no sabía aparece como
  **No disponible**: aproveche la visita para preguntarlo.
- **Pendiente y erosión**: la inclinación del terreno según el relieve de la NASA y los cultivos sugeridos para proteger la ladera.
- **Historial de cosechas** y **Verdor de la parcela (NDVI)**: qué sembró antes, cuánto rindió y cómo cambió la
  vegetación con los años.
- **Comparaciones de rotación**: las opciones que vio el agricultor y cuál eligió.
- **Observaciones de campo**: visitas anteriores (de usted o de otros técnicos), plagas reportadas a menos de 5 km
  y observaciones sobre las estrategias.
- **De dónde sale cada dato**: separa lo que dio el **agricultor**, lo que viene de la **NASA** y lo que viene del
  **GAMC**, con fecha. Si una fuente **falta** (por ejemplo, sin conexión con la NASA o sin capas del GAMC),
  aparece en rojo con la explicación. **Puede continuar con su observación de campo igual.**

Desde la ficha, el botón verde oscuro **Registrar una visita a esta parcela** lo lleva al formulario de visitas con la
parcela ya elegida.

---

## 2. Revisar las comparaciones de los agricultores

Cada vez que un agricultor compara rotaciones en una de sus parcelas, la comparación queda **pendiente** de su revisión.

1. En **Asistencia técnica**, toque la pestaña **Revisión**. El número entre paréntesis indica cuántas faltan.
2. Elija **Por revisar** o **Revisadas** con los botones de arriba.
3. Toque una evaluación de la lista. A la derecha se abre el detalle con la **tabla comparativa** de las tres
   estrategias, las tarjetas con las explicaciones y, al final, el formulario de la nota.

### Escribir la observación local de cada estrategia
La tabla comparativa tiene una fila llamada **Observación del técnico local**. Allí se escribe lo que el satélite no
sabe: si hay semilla en la zona, dónde comprarla, cuidados por el microclima.

1. En la columna de la estrategia, pulse **Escribir observación**.
2. En **Semilla en la zona**, elija:
   - *Hay semilla en la zona*
   - *Semilla escasa o cara*
   - *No se consigue en la zona*
   - *Sin dato*, si no lo sabe
3. En **Observación local**, escriba en pocas palabras lo práctico. Ejemplo: *"La semilla de tarwi se consigue en
   la feria de Punata los domingos. Sembrar después de las primeras lluvias."*
4. Pulse **Guardar**.

La observación aparece al instante en la tabla y en la tarjeta de esa estrategia, y **el agricultor la ve** en su
evaluación. Si la situación cambia, pulse **Actualizar observación**: se guarda una nueva y la anterior queda en el historial.

### Dejar la nota técnica y cerrar la revisión
Al final del detalle está **Nota técnica para el agricultor**.
1. Escriba qué opción recomienda y qué debe verificar en campo. Ejemplo: *"Recomiendo probar haba en media parcela
   esta campaña. Revisar el drenaje del borde norte."*
2. Pulse **Marcar como revisada**.

La evaluación pasa a **Revisadas** y el agricultor ve su nota. En la oferta del agricultor, la rotación aparece como
**Verificada** ante los compradores.

---

## 3. Registrar visitas de asesoramiento

1. En **Asistencia técnica**, toque la pestaña **Visitas**.
2. En **Registrar visita**, complete:
   - **Parcela visitada**: solo aparecen sus parcelas asignadas. Debajo se muestra el **agricultor visitado**, que es
     el dueño de la parcela.
   - **Fecha**: el día de la visita. No puede ser una fecha futura.
   - **Observaciones de asesoramiento**: qué se revisó, qué se recomendó y qué queda pendiente (mínimo 10 letras).
3. Pulse **Guardar visita**. Aparece *"Visita registrada."*

La visita queda en la ficha de la parcela: **el agricultor también la ve**.

### Resumen y exportación para informes
A la derecha está **Resumen de actividades de campo**:
1. Elija el período con **Desde** y **Hasta** (déjelos vacíos para ver todo).
2. Verá cuántas **visitas**, **agricultores** y **parcelas** atendió, y las visitas por mes.
3. Pulse **Exportar resumen (CSV para Excel)**. Se descarga un archivo con fecha, técnico, agricultor, parcela, zona y
   observaciones. Ábralo con Excel o con Hojas de cálculo de Google.

---

## 4. Historial de validaciones por zona

1. En **Asistencia técnica**, toque la pestaña **Validaciones**.
2. Arriba aparece un botón por **zona** (por ejemplo *Tiquipaya 3*). Toque una para ver solo sus observaciones, o
   **Todas**.
3. Si en alguna zona reportó que **no se consigue semilla**, aparece un aviso amarillo que la nombra. Sirve para
   planificar la entrega de semilla.

---

## 5. Plagas y enfermedades en campo

Use esta sección **en el teléfono, estando en la parcela**. Lo que marque:
- **Alerta al sistema**: aparece en el mapa de monitoreo y, si es grave, en las alertas regionales.
- **Mejora las recomendaciones**: las comparaciones de rotación de parcelas a menos de 5 km evitan sembrar la familia
  de cultivos atacada. Por ejemplo, con gorgojo de los Andes cerca, Poseidon desaconseja repetir papa.

En el menú, toque **Plagas en campo**. Tiene dos pestañas: **Marcar incidencia** y **Registradas**.

> **Aviso sobre las fotos:** si arriba aparece *"Google Drive no está configurado"*, las fotos se guardan igual,
> pero en el servidor de Poseidon y no en la unidad compartida del equipo. Avise al administrador.

### Marcar una incidencia nueva

**1. ¿Dónde está?**
- Pulse **Usar mi ubicación (GPS)**. Cuando el navegador pregunte, responda **Permitir**. El mapa se acerca a donde
  está y muestra un círculo con la precisión, por ejemplo *"GPS, precisión ±7 m"*.
- Para corregir el punto exacto, **toque el mapa** donde está la plaga. Debajo dirá *"marcado a mano en el mapa"*.
- Botón de capas (arriba a la derecha del mapa): elija **Satélite** para ver los surcos y ubicarse mejor.

**2. ¿Qué encontró?**
- Elija el tipo: **Plaga**, **Enfermedad** o **Deficiencia** (falta de un nutriente).
- **Nombre**: empiece a escribir y elija de las sugerencias (por ejemplo *Gorgojo de los Andes*, *Tizón tardío*,
  *Falta de nitrógeno*), o escriba otro nombre.
- **Cultivo afectado**: **elíjalo siempre que pueda**. Sin cultivo, la incidencia no puede orientar las rotaciones de la zona.
- **Severidad**: **Baja**, **Media** o **Alta**. Las de severidad alta aparecen como alerta en el tablero regional.
- **Nota breve** (opcional): por ejemplo *"30 % de plantas con galerías, borde norte"*.

**3. Fotos** (hasta 5)
- Pulse **+ Tomar o elegir foto**. El teléfono abre la cámara (o la galería). Puede elegir varias.
- Para quitar una foto antes de guardar, pulse la **×** roja sobre la miniatura.
- Poseidon **achica las fotos antes de subirlas** para gastar menos datos.

Pulse **Registrar incidencia**. Verá *"Subiendo foto 1 de 2…"* y luego el mensaje verde *"Incidencia registrada con
2 de 2 fotos"*. Si alguna foto no subió (por mala señal), el mensaje lo dice: agréguela después desde *Registradas*.

### Ver y actualizar las incidencias registradas
En la pestaña **Registradas**:
- El **mapa** muestra todas las incidencias. El color indica la severidad: amarillo baja, naranja media, vino alta.
  Toque un punto para ver su detalle en la lista.
- Los botones **Activas**, **Controladas** y **Todas** filtran la lista.
- Cada incidencia muestra el tipo, el nombre, el cultivo, quién la registró, las coordenadas y las fotos. Toque una
  foto para verla grande. Si se guardó en Google Drive, el enlace **Drive** la abre allí.
- **+ Foto**: agrega fotos a una incidencia ya registrada.
- **Marcar como controlada**: cuando la plaga ya está controlada. **Deja de influir en las recomendaciones.** Si
  reaparece, pulse **Reactivar**.

---

## 6. Monitoreo

Como técnico también ve la sección **Monitoreo**, con los resúmenes por zona. Está explicada en el
[Manual de monitoreo regional](05-monitoreo.md).

---

## Preguntas frecuentes del técnico

**No veo una parcela que sé que existe.** No está asignada a usted. Pida al administrador que se la asigne en
*Administración → Parcelas y técnicos*.

**El GPS dice "No dio permiso de ubicación".** Debe permitir la ubicación en el navegador: toque el candado junto a
la dirección → *Permisos* → *Ubicación* → *Permitir*, y recargue la página.

**El GPS no encuentra señal.** Salga a cielo abierto y espere. Si no funciona, marque el punto tocando el mapa.

Para otros problemas, vea [Problemas frecuentes](08-problemas-frecuentes.md).

[← Volver al índice](README.md)
