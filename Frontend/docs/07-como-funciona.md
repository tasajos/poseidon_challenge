# Cómo funciona Poseidon

Esta parte explica **de dónde salen los datos** y **cómo calcula Poseidon** sus recomendaciones, en palabras sencillas.
Sirve para cualquier rol que quiera entender por qué el sistema dice lo que dice.

[← Volver al índice](README.md)

---

## 1. El recorrido de la información

1. **El agricultor registra su parcela** (dónde está, qué siembra, cuánto mide, si tiene riego).
2. Poseidon **consulta a la NASA** el clima típico, la pendiente del terreno y el verdor de la vegetación de ese lugar.
3. Con eso **compara tres rotaciones** y le pone una nota a cada una según lo que le importa al agricultor.
4. **El técnico de campo revisa** la comparación, agrega lo que el satélite no sabe (semilla, microclima, plagas) y
   deja una nota.
5. El agricultor **decide** qué rotación aplicar y puede **ofrecer su cosecha** a los compradores.
6. La alcaldía ve **resúmenes por zona** para planificar, sin datos personales.

## 2. De dónde salen los datos

| Dato | Fuente | Qué tan detallado es | Cada cuánto se actualiza |
|---|---|---|---|
| Clima típico (lluvia, temperatura mínima y máxima) | **NASA POWER**: promedio de muchos años | Cuadros de unos **50 km** de lado | Fijo (es un promedio) |
| Clima de los últimos días (para las alertas) | **NASA POWER**, datos diarios | Cuadros de unos 50 km | Llega con **2 a 4 días de retraso** |
| Pendiente y altura del terreno | **NASA SRTM**, modelo de relieve | Celdas de **30 m** | Fijo (es el relieve) |
| Verdor de la vegetación (NDVI) | **Satélite MODIS de la NASA** | Cuadros de **250 m** | Cada 16 días; Poseidon guarda dos épocas por año |
| Cultivo, superficie, etapa, riego | **El agricultor** | Su parcela | Cuando él lo cambia |
| Plagas y enfermedades | **Los técnicos de campo** | El punto exacto (GPS) | Cuando las registran |
| Límites distritales | **GAMC**, si está configurado | Oficial | Según el GAMC |

**Lo importante:** los datos de la NASA describen **una zona**, no su parcela exacta. Una parcela al fondo del valle y
otra en la ladera, dentro del mismo cuadro de 50 km, reciben el mismo clima, aunque en la ladera hiele menos. Por eso
el conocimiento del agricultor y del técnico sigue siendo indispensable.

Si Poseidon no puede conectarse con la NASA, usa un **clima de ejemplo de Cochabamba** y lo **avisa en amarillo**.
Nunca lo hace a escondidas.

## 3. Cómo se calcula el agua que necesita un cultivo

1. **Evapotranspiración**: el agua que el sol y el viento se llevan del suelo y de las plantas. Se calcula para cada
   mes con las temperaturas de la NASA (fórmula de Hargreaves, de la FAO).
2. Cada cultivo toma más o menos agua según su **coeficiente de cultivo (Kc)**. Por ejemplo, la papa toma un 90 % de
   la evapotranspiración.
3. Se supone que el cultivo aprovecha el **80 % de la lluvia**.
4. **Riego necesario** = lo que consume el cultivo − la lluvia que aprovecha, sumado mes a mes durante su ciclo.

Ejemplo: si en noviembre la papa consume 120 mm y la lluvia aprovechable es 40 mm, faltan 80 mm de riego ese mes.

## 4. Cómo se comparan las rotaciones

Poseidon toma la **rotación actual** del agricultor y busca, entre todas las combinaciones posibles del catálogo:
- **Ajuste**: la mejor rotación que cambia **un solo** cultivo.
- **Cambio mayor**: la mejor rotación que cambia **dos o más** cultivos.

Cada rotación recibe una nota de **0 a 100** en cinco temas:

| Tema | Mejor nota cuando… |
|---|---|
| **Agua** | Necesita poco riego |
| **Heladas** | Sus cultivos no están en el campo en los meses de helada, o los resisten |
| **Suelo** | Incluye leguminosas (abonan), alterna familias de cultivos, tiene raíces profundas y deja poco tiempo el suelo desnudo |
| **Ingreso** | Sus cultivos tienen mejor valor de mercado (referencial) |
| **Forraje** | Produce alimento para el ganado |

El **puntaje** final es el promedio de esos cinco temas, **pesado según lo que el agricultor marcó como importante**
(las barras de 0 a 5). Si marca *Ahorrar agua* en 5 e *Ingreso* en 1, el agua pesa cinco veces más.

### Lo que cambia la recomendación
- **Plagas reportadas cerca.** Si un técnico registró una plaga o enfermedad **activa** a menos de **5 km**, en el
  último año, las rotaciones que siembran la **familia atacada** bajan de puntaje, más aún si la repiten dos campañas
  seguidas. Cuenta más si es grave y está cerca. Cuando el técnico la marca como **controlada**, deja de contar.
- **Terreno en ladera.** Con pendiente de 5 % o más, la nota de suelo premia las **raíces profundas** y castiga los
  **meses de suelo desnudo**, porque ahí la lluvia arrastra la tierra.

Todo lo que influye aparece explicado en la tarjeta de cada rotación (**Por qué**, **Evidencia**, **Riesgos a revisar**).

## 5. Cómo funcionan las alertas

Cada **6 horas**, Poseidon revisa las parcelas de quienes activaron las alertas:
- **Helada**: alguna de las últimas 3 noches publicadas por la NASA bajó a **0 °C o menos**.
- **Sequía severa**: en los últimos 30 días llovió menos del **30 %** de lo normal para esas fechas. No se avisa en la
  época seca, cuando lo normal es que no llueva.

Una misma helada se avisa una sola vez por día, y una sequía una vez por semana. Como los datos llegan con 2 a 4 días
de retraso, **la alerta describe lo que ya pasó** (y que suele repetirse), **no es un pronóstico**.

## 6. Cómo se calculan los indicadores de la oferta

- **Prácticas de rotación**: se calculan con los cultivos de la rotación registrada. El productor no las declara.
- **Verificada**: un técnico revisó la comparación de esa parcela. No es una certificación oficial ni orgánica.
- **Uso eficiente del agua** (0 a 100): la nota de *Agua* de la rotación.
- **Sello de Gestión Hídrica Sostenible**: la rotación necesita al menos **15 % menos de riego** que la rotación
  tradicional del valle (**papa → maíz**) en el mismo lugar y con el mismo clima. Es una estimación con NASA POWER.
  **Todavía no usa** la humedad del suelo del satélite SMAP ni la evapotranspiración medida por ECOSTRESS.

## 7. Cómo se protege la privacidad

| Quién | Qué ve |
|---|---|
| El agricultor | Todo lo suyo |
| El técnico de campo | Solo las parcelas que tiene asignadas |
| El comprador | Las ofertas publicadas: zona y ubicación aproximada (unos 2 km), nombre abreviado. Contacto **solo si el productor acepta** |
| El analista de monitoreo | Solo promedios por zona. Las zonas con menos de 3 productores no se publican |
| El administrador | Todo, porque gestiona el sistema. Sus acciones quedan en la auditoría |

Las contraseñas se guardan cifradas y nunca aparecen en la auditoría ni en ninguna pantalla.

## 8. Lo que Poseidon todavía no sabe

- El tipo de suelo de cada parcela (textura, materia orgánica).
- El microclima exacto de una quebrada o ladera.
- El precio actual de los productos (el valor de mercado es referencial).
- El agua que el agricultor aplica realmente.
- Si la rotación elegida se aplicó de verdad en el campo (la adopción es declarada).

Por eso cada comparación tiene una sección **Lo que este análisis no sabe**, y por eso existe la revisión del técnico.

[← Volver al índice](README.md)
