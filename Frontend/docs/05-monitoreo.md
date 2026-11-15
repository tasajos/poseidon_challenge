# Manual de monitoreo regional

Para personas con el rol **`monitoreo`** (analista o gestor regional de la alcaldía o la gobernación). Los técnicos
de campo y los administradores también ven esta sección. Si todavía no sabe entrar a Poseidon, lea primero
[Primeros pasos](01-primeros-pasos.md).

[← Volver al índice](README.md)

---

## Lo que puede hacer en Poseidon

1. **Ver el panorama agroclimático por zona**: un mapa y una tabla con indicadores por municipio o distrito.
2. **Simular escenarios** de menos lluvia y más calor y ver qué zonas necesitarían más riego.
3. **Seguir la adopción** de las rotaciones recomendadas y su impacto en el agua y la vegetación.
4. **Detectar el suelo desnudo** fuera de temporada y exportar la lista de zonas prioritarias para entregar semilla
   de cobertura.

En el menú verá: **Monitoreo**, **Alertas** y **Glosario**. Al entrar se abre *Monitoreo regional*.

---

## Antes de empezar: qué datos ve y por qué

**Usted ve solo resúmenes por zona, nunca datos de un agricultor o una parcela en particular.**
- Cada zona muestra **promedios** de las parcelas registradas en ella.
- Si una zona tiene **menos de 3 productores**, se junta con otras en el grupo **"Zonas con pocos registros"**. Si
  aun así son menos de 3, sus valores **no se publican** y la fila dice *"Menos de 3 productores: no se publican
  valores"*. Así nadie puede deducir de quién es una parcela.
- Las plagas aparecen en el mapa con una **ubicación aproximada** (dentro de unos 2 km).

La pestaña **Detalle por parcela** (con nombres de agricultores) aparece solo para quienes tienen el permiso
*"ver las parcelas y evaluaciones individuales de todos"*, normalmente el administrador.

**Qué es una "zona":**
- Si el administrador cargó los **límites distritales oficiales**, la zona es el **distrito** que contiene la parcela.
- Si no, la zona es el **municipio cuyo centro está más cerca** de la parcela (Cercado, Sacaba, Quillacollo,
  Tiquipaya, Colcapirhua, Vinto, Sipe Sipe, Tarata, Cliza, Punata, Arani o Colomi). Es una aproximación, no un
  límite oficial. En ese caso, en el *Panorama* aparece un aviso amarillo que lo dice.

**Los indicadores salen de las parcelas registradas en Poseidon**, no de un barrido de todo el territorio. Una zona
con pocas parcelas registradas representa a pocos productores.

### Los recuadros de arriba
- **Productores**: cuántos agricultores tienen parcelas registradas.
- **Parcelas registradas**.
- **Adopción de rotaciones**: porcentaje de productores con una comparación que marcaron que aplicarán una de las
  rotaciones recomendadas.
- **Plagas activas**: incidencias de plagas o enfermedades activas del último año.

---

## 1. Panorama

Pestaña **Panorama**.

### Mapa regional
- Los **círculos azules** son las zonas con indicadores publicados. Pase el ratón (o toque) sobre uno para ver cuántos
  productores tiene y su riego medio.
- Los **puntos naranja** son plagas o enfermedades activas, en ubicación aproximada.
- Si se configuró el servicio de mapas del **GAMC**, se dibujan los límites distritales. Si ese servicio no responde,
  aparece un aviso y **el resto del tablero sigue funcionando**.

### Alertas regionales
Plagas o enfermedades de **severidad alta** reportadas por los técnicos, con su zona.

### Indicadores agroclimáticos por zona
Una fila por zona:

| Columna | Qué significa |
|---|---|
| **Productores / Parcelas / Superficie (ha)** | Cuántos hay registrados en la zona |
| **Riego medio (mm)** | Agua de riego que necesitan, en promedio, las rotaciones actuales de la zona en una campaña. 1 mm = 1 litro por m² |
| **Índice de agua** | De 0 a 100: más alto significa que la lluvia cubre más de lo que necesitan los cultivos |
| **Con riesgo de helada** | % de parcelas evaluadas con algún cultivo en meses de helada |
| **En ladera** | % de parcelas con pendiente de 5 % o más (riesgo de erosión medio o alto) |
| **Plagas activas** | Incidencias activas en la zona |

Un guion (**—**) significa que no hay dato suficiente.

### Qué significa cada indicador
Al final del Panorama hay una tabla con la **fuente**, el **período**, la **escala de análisis** y el **tipo de dato**
de cada indicador:
- **Observado**: medido (por un satélite o un técnico).
- **Estimado**: calculado con un modelo a partir de datos observados.
- **Declarado**: informado por los agricultores.
- **Simulado**: un escenario hipotético (solo en *Escenarios de agua*).

Consúltela antes de usar un número en un informe.

---

## 2. Escenarios de agua

Pestaña **Escenarios de agua**. Sirve para anticipar qué zonas tendrían problemas de abastecimiento si llueve menos
o hace más calor.

> Es un **escenario simulado, no una proyección climática**. Responde a la pregunta *"¿qué pasaría si…?"*, no
> *"¿qué va a pasar?"*.

### Cómo usarlo
1. Mueva la barra **Lluvia de la campaña**: de **−60 %** (sequía fuerte) a **+20 %**. El número de la derecha muestra
   el valor elegido.
2. Mueva la barra **Temperatura**: de **+0 °C** (clima actual) a **+5 °C**.
3. El mapa y la tabla **se recalculan solos** al mover las barras. Mientras calcula, se ven un poco más claros.
4. Para volver al clima actual, pulse **Volver al clima actual**.

### Cómo leer el resultado
Arriba del mapa, una frase resume el escenario, por ejemplo *"5 de 12 zonas necesitarían al menos 20 % más de riego
que hoy con este escenario"*.

El **color** de cada zona indica cuánto **riego adicional** haría falta respecto de hoy. Más oscuro es peor:

| Nivel | Riego adicional | Qué significa |
|---|---|---|
| **Bajo** | menos de 5 % | Como hoy o mejor |
| **Moderado** | 5 a 19 % | Conviene ahorrar agua y priorizar |
| **Alto** | 20 a 39 % | Hace falta un plan de contingencia |
| **Crítico** | 40 % o más | El abastecimiento actual no alcanza |

La tabla **Impacto por zona** está ordenada de la zona más afectada a la menos afectada:
- **La lluvia cubre (escenario)** y **La lluvia cubre (hoy)**: qué parte del agua que necesita un cultivo pone la lluvia.
- **Riego necesario (mm)**: con el escenario elegido.
- **Riego adicional**: cuánto más que hoy, en mm y en %.

**Limitación importante:** el clima de la NASA viene en **cuadros de unos 50 km**. Varias zonas caen en el mismo cuadro
y por eso muestran **valores iguales**. Un aviso amarillo indica en cuántos cuadros caen las zonas. El escenario no
distingue diferencias dentro de un mismo cuadro.

---

## 3. Adopción

Pestaña **Adopción**. Muestra cuántos agricultores decidieron aplicar las rotaciones recomendadas y qué impacto tiene.

- **Adopción de rotaciones recomendadas por zona**: una barra por zona con el porcentaje de productores que marcaron
  que aplicarán el ajuste o el cambio mayor. Debajo del nombre dice sobre cuántos productores se calcula.
- **Adopción regional**: el porcentaje del conjunto de las zonas publicadas.
- **Indicadores de impacto ambiental**, por zona:
  - **Riego que ahorra quien adoptó**: cuántos mm de riego por campaña ahorra, en promedio, la rotación elegida frente
    a la anterior (estimado).
  - **NDVI medio**: el verdor de la vegetación observado por el satélite MODIS en las parcelas de la zona (de 0 a 1).

> La adopción es **declarada** por los agricultores en Poseidon: no se verifica en campo.

---

## 4. Suelo desnudo

Pestaña **Suelo desnudo**. Sirve para focalizar campañas de entrega de semilla de cobertura.

Una parcela tiene **suelo desnudo** cuando su **NDVI es menor que 0,2**: casi no hay vegetación activa.

### Elegir el período
- **Año**: los años con datos disponibles.
- **Época del año**:
  - **Época seca (jul-sep), fuera de temporada**: la más útil para detectar tierra pelada entre campañas.
  - **Época húmeda (ene-mar), cultivos en pie**: para comparar.

Si aún no hay datos, verá *"Aún no hay NDVI guardado para esta época"*. Los datos se piden a la NASA cuando los
agricultores registran sus parcelas y tardan unos minutos en llegar.

### Leer el resultado
- **Mapa**: cada zona coloreada según el porcentaje de parcelas con suelo desnudo (de *Menos de 25 %* a *75 % o más*;
  más oscuro es más suelo desnudo).
- **Zonas prioritarias para cobertura vegetal**: las zonas ordenadas de más a menos suelo desnudo, con su NDVI medio y
  cuántas parcelas tienen dato.

### Exportar la lista para la intervención municipal
Pulse **Exportar listado de zonas prioritarias (CSV)**. Se descarga un archivo con la prioridad, la zona, el % de
suelo desnudo, el NDVI medio, las parcelas con dato, la superficie registrada y el período. Ábralo con Excel o con
Hojas de cálculo de Google.

> El satélite ve un cuadro de 250 m por parcela registrada. **No es un barrido de todo el distrito.**

---

## Preguntas frecuentes de monitoreo

**Una zona dice "no se publican valores".** Tiene menos de 3 productores registrados. Es una protección de privacidad,
no un error.

**Todas las zonas tienen el mismo valor en los escenarios.** Caen en el mismo cuadro de clima de la NASA (unos 50 km).
Vea el aviso amarillo bajo la tabla.

**¿Puedo ver qué agricultores adoptaron?** No con el rol de monitoreo: solo ve agregados por zona. Si su trabajo lo
requiere, el administrador puede darle el permiso de ver parcelas individuales.

Para otros problemas, vea [Problemas frecuentes](08-problemas-frecuentes.md).

[← Volver al índice](README.md)
