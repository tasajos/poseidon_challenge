// Glosario científico en lenguaje cotidiano (HU-USR-04).
// Cada término: qué es en pocas palabras, una explicación, un ejemplo práctico, cómo lo usa Poseidon,
// de dónde sale el dato y un apoyo visual (escala, balanza o ícono). Los ejemplos usan valores
// aproximados del valle de Cochabamba; no son mediciones de una parcela concreta.

export const CATEGORIAS = {
  agua: 'Agua',
  temperatura: 'Temperatura y heladas',
  suelo: 'Suelo y cultivos',
  datos: 'Satélites y datos',
};

export const TERMINOS = [
  {
    id: 'evapotranspiracion',
    nombre: 'Evapotranspiración',
    sigla: 'ET₀',
    categoria: 'agua',
    icono: 'sol',
    corto: 'El agua que el sol y el viento se llevan del suelo y de las plantas.',
    explicacion: 'Las plantas “sudan” por sus hojas y el suelo húmedo se seca con el calor. La suma de las dos pérdidas es la evapotranspiración. '
      + 'Se mide en milímetros, igual que la lluvia, para poder compararlas: si se va más agua de la que cae, el cultivo necesita riego. '
      + 'Sube con días calurosos, soleados, secos y con viento.',
    ejemplo: 'En agosto, en el valle, casi no llueve (unos 5 mm) pero el sol y el viento se llevan unos 130 mm. '
      + 'Esa diferencia es la razón por la que una siembra temprana sin riego sufre.',
    usoPoseidon: 'La calculamos para cada mes con la fórmula de Hargreaves, a partir de las temperaturas máxima y mínima de NASA POWER. '
      + 'Aparece en la fila “Evapotranspiración” de la tabla de clima.',
    fuente: 'Calculada con datos de NASA POWER',
    visual: {
      tipo: 'balanza',
      titulo: 'Agosto en el valle (aproximado)',
      unidad: 'mm',
      barras: [
        { etiqueta: 'Lluvia que cae', valor: 5, tono: 'azul' },
        { etiqueta: 'Agua que se va', valor: 130, tono: 'naranja' },
      ],
      conclusion: 'Se va mucho más de lo que cae: hay que regar.',
    },
  },
  {
    id: 'lluvia',
    nombre: 'Lluvia (precipitación)',
    categoria: 'agua',
    icono: 'gota',
    corto: 'Cuánta agua cae del cielo, medida en milímetros.',
    explicacion: 'Un milímetro de lluvia es un litro de agua sobre cada metro cuadrado de terreno. '
      + 'No toda llega a la raíz: una parte corre por la superficie o se evapora enseguida.',
    ejemplo: 'Un mes con 60 mm de lluvia dejó 60 litros en cada metro cuadrado: unos tres baldes de 20 litros. '
      + 'En una parcela de media hectárea (5 000 m²) son 300 000 litros.',
    usoPoseidon: 'Usamos la lluvia promedio de cada mes. Suponemos que el cultivo aprovecha el 80 % de lo que cae.',
    fuente: 'NASA POWER (lluvia corregida, PRECTOTCORR)',
  },
  {
    id: 'riego',
    nombre: 'Riego necesario (balance hídrico)',
    categoria: 'agua',
    icono: 'gota',
    corto: 'El agua que le falta al cultivo después de contar la lluvia.',
    explicacion: 'Es una cuenta de entradas y salidas, como un monedero: entra la lluvia que la planta aprovecha y sale el agua que el cultivo consume. '
      + 'Si sale más de lo que entra, la diferencia hay que ponerla con riego. Si entra más, no hace falta regar ese mes.',
    ejemplo: 'Si en noviembre la papa consume 120 mm y la lluvia aprovechable es 40 mm, faltan 80 mm. '
      + 'En una hectárea eso son unos 800 000 litros de riego ese mes.',
    usoPoseidon: 'Sumamos lo que falta mes a mes durante el ciclo de cada cultivo. Es el dato “Riego necesario” de cada estrategia: '
      + 'cuanto menor, más barata y segura es la rotación cuando el agua escasea.',
    fuente: 'Calculado con datos de NASA POWER',
    visual: {
      tipo: 'balanza',
      titulo: 'Papa en noviembre (ejemplo)',
      unidad: 'mm',
      barras: [
        { etiqueta: 'Consume el cultivo', valor: 120, tono: 'naranja' },
        { etiqueta: 'Aporta la lluvia', valor: 40, tono: 'azul' },
        { etiqueta: 'Falta: riego', valor: 80, tono: 'vino' },
      ],
      conclusion: '120 − 40 = 80 mm que debe poner con riego.',
    },
  },
  {
    id: 'kc',
    nombre: 'Coeficiente de cultivo',
    sigla: 'Kc',
    categoria: 'agua',
    icono: 'hoja',
    corto: 'Cuánta agua toma un cultivo comparado con un pasto corto y bien regado.',
    explicacion: 'La evapotranspiración se calcula para un pasto “de referencia”. Cada cultivo toma algo más o algo menos: '
      + 'el Kc es ese factor. Un Kc de 1 toma lo mismo que el pasto; 0,5, la mitad. Cambia con la edad de la planta: '
      + 'es bajo recién sembrado y alto en floración.',
    ejemplo: 'Si un mes la evapotranspiración es 100 mm y la papa tiene Kc 0,9, la papa usa unos 90 mm ese mes.',
    usoPoseidon: 'Usamos un Kc promedio de toda la campaña para cada cultivo del catálogo (entre 0,80 y 0,95). '
      + 'Son valores típicos, no medidos en su parcela.',
    fuente: 'Referencias de la FAO (manual 56)',
    visual: {
      tipo: 'escala',
      min: 0, max: 1.2, decimales: 1,
      colores: ['#fdebd6', '#f28c28', '#1e4e8c'],
      marcas: [
        { valor: 0.4, etiqueta: 'Recién sembrado' },
        { valor: 0.8, etiqueta: 'Quinua y tarwi (Poseidon)' },
        { valor: 1.15, etiqueta: 'Cultivo en plena floración' },
      ],
    },
  },
  {
    id: 'mes-seco',
    nombre: 'Mes seco',
    categoria: 'agua',
    icono: 'sol',
    corto: 'Un mes en el que llueve menos de un tercio del agua que se evapora.',
    explicacion: 'No significa que no llueva nada, sino que la lluvia no alcanza ni para reponer una pequeña parte de lo que se pierde. '
      + 'En esos meses casi todo cultivo depende del riego.',
    ejemplo: 'Si en septiembre se evaporan 140 mm y llueven 15 mm, la lluvia cubre apenas el 11 %: es un mes seco.',
    usoPoseidon: 'Marcamos en naranja las celdas de lluvia de los meses secos en la tabla de clima.',
    fuente: 'Calculado con datos de NASA POWER',
    visual: {
      tipo: 'balanza',
      titulo: 'Septiembre (ejemplo)',
      unidad: 'mm',
      barras: [
        { etiqueta: 'Se evapora', valor: 140, tono: 'naranja' },
        { etiqueta: 'Un tercio de eso', valor: 47, tono: 'amarillo' },
        { etiqueta: 'Llueve', valor: 15, tono: 'azul' },
      ],
      conclusion: 'La lluvia no llega ni al tercio: mes seco.',
    },
  },
  {
    id: 'sequia',
    nombre: 'Sequía severa',
    categoria: 'agua',
    icono: 'gota',
    corto: 'Cuando en el último mes llovió mucho menos de lo normal para esa época.',
    explicacion: 'Se compara la lluvia de los últimos 30 días con lo que suele llover en esas mismas fechas. '
      + 'En época seca no se avisa, porque ahí lo normal es que no llueva.',
    ejemplo: 'En noviembre lo normal son unos 60 mm al mes. Si en los últimos 30 días cayeron solo 9 mm (15 %), '
      + 'Poseidon avisa: conviene priorizar el riego de lo que está en floración y revisar las reservas.',
    usoPoseidon: 'La alerta salta cuando la lluvia de 30 días es menor al 30 % de lo normal (el administrador puede ajustar el umbral).',
    fuente: 'Datos diarios y climatología de NASA POWER',
    visual: {
      tipo: 'balanza',
      titulo: 'Últimos 30 días (ejemplo)',
      unidad: 'mm',
      barras: [
        { etiqueta: 'Lo normal', valor: 60, tono: 'azul' },
        { etiqueta: 'Umbral (30 %)', valor: 18, tono: 'amarillo' },
        { etiqueta: 'Lo que llovió', valor: 9, tono: 'vino' },
      ],
      conclusion: 'Llovió menos que el umbral: alerta de sequía.',
    },
  },
  {
    id: 'temperatura-minima',
    nombre: 'Temperatura mínima y riesgo de helada',
    categoria: 'temperatura',
    icono: 'termometro',
    corto: 'La temperatura más baja del día, casi siempre justo antes del amanecer.',
    explicacion: 'En la tabla de clima mostramos la mínima promedio de cada mes. Un promedio de 3 °C no quiere decir que nunca hiele: '
      + 'quiere decir que varias noches de ese mes bajan bastante más. Por eso un promedio bajo ya es una señal de riesgo.',
    ejemplo: 'Si junio tiene una mínima promedio de 1 °C, lo más probable es que muchas madrugadas estén bajo cero: '
      + 'no conviene tener papa o maíz en el campo en ese mes.',
    usoPoseidon: 'Con mínima promedio de 2 °C o menos el riesgo de helada es “probable”; entre 2 y 5 °C, “posible”. '
      + 'Lo cruzamos con los meses que ocupa cada cultivo y su tolerancia al frío.',
    fuente: 'NASA POWER (T2M_MIN)',
    visual: {
      tipo: 'escala',
      min: -6, max: 12, decimales: 0, unidad: '°C',
      colores: ['#153a6b', '#1e4e8c', '#eaf1fa', '#fef4d6', '#fac748'],
      marcas: [
        { valor: 0, etiqueta: 'El agua se congela' },
        { valor: 2, etiqueta: 'Helada probable (promedio)' },
        { valor: 5, etiqueta: 'Helada posible (promedio)' },
      ],
    },
  },
  {
    id: 'helada',
    nombre: 'Alerta de helada',
    categoria: 'temperatura',
    icono: 'termometro',
    corto: 'Aviso cuando una noche reciente bajó a 0 °C o menos donde está su parcela.',
    explicacion: 'Cuando el aire baja de 0 °C, el agua dentro de las hojas se congela y rompe los tejidos: '
      + 'la hoja se pone negra y se seca. Una helada suele repetirse las noches siguientes si el cielo sigue despejado.',
    ejemplo: 'NASA POWER registró −2 °C el martes. Poseidon le avisa para que esas noches haga un riego ligero al atardecer '
      + '(el suelo húmedo guarda calor) o cubra las plantas más delicadas.',
    usoPoseidon: 'Revisamos los últimos 3 días publicados. Los datos llegan con 2 a 4 días de retraso: '
      + 'el aviso dice lo que ya pasó, que suele repetirse; no es un pronóstico.',
    fuente: 'Datos diarios de NASA POWER',
    visual: {
      tipo: 'escala',
      min: -6, max: 12, decimales: 0, unidad: '°C',
      colores: ['#153a6b', '#1e4e8c', '#eaf1fa', '#fef4d6', '#fac748'],
      marcas: [
        { valor: -2, etiqueta: 'Mínima del ejemplo' },
        { valor: 0, etiqueta: 'Umbral de alerta' },
      ],
    },
  },
  {
    id: 'climatologia',
    nombre: 'Clima típico (climatología)',
    categoria: 'datos',
    icono: 'calendario',
    corto: 'El promedio de muchos años: lo que suele pasar, no lo que pasará este año.',
    explicacion: 'Es como la memoria de los abuelos convertida en números: cuánto llueve y cuánto frío hace normalmente en cada mes. '
      + 'Un año puede salir más seco o más lluvioso que el promedio.',
    ejemplo: 'Si la climatología dice que en enero llueven 110 mm, un enero con 60 mm fue un mes seco para lo normal, '
      + 'aunque haya llovido varios días.',
    usoPoseidon: 'Con la climatología calculamos la tabla “Clima típico del lugar” y comparamos las rotaciones. '
      + 'También la usamos como “lo normal” en la alerta de sequía.',
    fuente: 'NASA POWER (climatología mensual)',
  },
  {
    id: 'nasa-power',
    nombre: 'NASA POWER',
    categoria: 'datos',
    icono: 'satelite',
    corto: 'Servicio gratuito de la NASA con datos de clima de cualquier punto del planeta.',
    explicacion: 'Junta mediciones de satélites con modelos del tiempo para estimar temperatura, lluvia, radiación del sol y viento. '
      + 'Cada dato representa un cuadro de unos 50 km de lado, así que no ve el microclima de su quebrada o ladera.',
    ejemplo: 'Una parcela al fondo del valle y otra en la ladera, dentro del mismo cuadro, reciben los mismos datos de POWER, '
      + 'aunque en la ladera hiele menos. Su experiencia del lugar sigue siendo importante.',
    usoPoseidon: 'Es nuestra fuente de clima. Los datos diarios se publican con 2 a 4 días de retraso. '
      + 'Si no hay conexión con NASA, Poseidon usa un clima de demostración y lo avisa.',
    fuente: 'power.larc.nasa.gov',
  },
  {
    id: 'ndvi',
    nombre: 'NDVI (índice de verdor)',
    sigla: 'NDVI',
    categoria: 'datos',
    icono: 'satelite',
    corto: 'Un número de −1 a 1 que dice qué tan verde y vigorosa está la vegetación, visto desde un satélite.',
    explicacion: 'Las hojas sanas reflejan mucha luz infrarroja (que nuestros ojos no ven) y absorben la luz roja. '
      + 'El satélite mide las dos y las compara: mientras más alto el número, más hojas verdes y activas hay. '
      + 'El suelo desnudo da cerca de 0,1; el agua y las nubes, menos de 0.',
    ejemplo: 'Una chacra de papa en floración puede marcar 0,7. Si una esquina baja a 0,3 mientras el resto sigue en 0,7, '
      + 'conviene ir a mirar esa esquina: puede faltar agua, haber plaga o encharcamiento.',
    usoPoseidon: 'En la ficha de cada parcela guardamos el NDVI de dos épocas por año: la húmeda (enero a marzo, con cultivos en pie) y la seca '
      + '(julio a septiembre). Por debajo de 0,2 en la época seca contamos el suelo como desnudo. El dato viene de MODIS, con cuadros de 250 m '
      + 'que suelen abarcar más que la parcela: es un indicio, no una medición de su terreno.',
    fuente: 'NASA MODIS (MOD13Q1, 250 m cada 16 días)',
    visual: {
      tipo: 'escala',
      min: -1, max: 1, decimales: 1,
      colores: ['#5b6478', '#c9a77c', '#e9dfa0', '#8cc56a', '#1f7a3a'],
      marcas: [
        { valor: -0.3, etiqueta: 'Agua, nubes' },
        { valor: 0.1, etiqueta: 'Suelo desnudo' },
        { valor: 0.3, etiqueta: 'Pasto ralo o cultivo con estrés' },
        { valor: 0.7, etiqueta: 'Cultivo sano y tupido' },
      ],
    },
  },
  {
    id: 'humedad-suelo',
    nombre: 'Humedad del suelo (SMAP)',
    sigla: 'SMAP',
    categoria: 'datos',
    icono: 'satelite',
    noUsado: true,
    corto: 'Cuánta agua hay en los primeros centímetros de tierra, medida desde el espacio.',
    explicacion: 'El satélite SMAP de la NASA “escucha” las microondas que emite la tierra: la tierra húmeda emite distinto que la seca. '
      + 'Mide solo la capa de arriba (unos 5 cm) y en cuadros de varios kilómetros.',
    ejemplo: 'Si después de semanas sin lluvia la humedad del suelo de su zona sigue bajando, es señal de que el agua para las raíces se acaba '
      + 'antes de que las plantas se marchiten.',
    usoPoseidon: 'Poseidon todavía no usa este dato; hoy estima el agua solo con lluvia y evapotranspiración.',
    fuente: 'Satélite SMAP de la NASA',
    visual: {
      tipo: 'escala',
      min: 0, max: 50, decimales: 0, unidad: '%',
      colores: ['#c9a77c', '#eaf1fa', '#1e4e8c'],
      marcas: [
        { valor: 8, etiqueta: 'Tierra seca' },
        { valor: 25, etiqueta: 'Húmeda, buena para la raíz' },
        { valor: 45, etiqueta: 'Encharcada' },
      ],
    },
  },
  {
    id: 'suelo-desnudo',
    nombre: 'Suelo desnudo',
    categoria: 'suelo',
    icono: 'suelo',
    corto: 'Los meses del año en que la parcela queda sin ningún cultivo.',
    explicacion: 'La tierra sin plantas se seca, el viento se la lleva y la primera lluvia fuerte la lava. '
      + 'Además pierde vida: las raíces alimentan a los bichitos y hongos que hacen fértil el suelo.',
    ejemplo: 'Una rotación de papa y maíz que deja la tierra pelada de mayo a septiembre tiene 5 meses de suelo desnudo. '
      + 'Sembrar avena o haba en ese tiempo la protege y da forraje.',
    usoPoseidon: 'Es el dato “Suelo desnudo” de cada estrategia. Menos meses mejoran el puntaje de suelo.',
    fuente: 'Calculado con el calendario de cada cultivo',
  },
  {
    id: 'leguminosa',
    nombre: 'Leguminosas y nitrógeno',
    categoria: 'suelo',
    icono: 'hoja',
    corto: 'Cultivos como haba, tarwi o alfalfa que abonan la tierra solos.',
    explicacion: 'En sus raíces viven unas bacterias que toman el nitrógeno del aire y lo dejan en el suelo, '
      + 'como un abono natural. El cultivo que viene después lo aprovecha.',
    ejemplo: 'Sembrar haba antes de la papa deja nitrógeno en la tierra: la papa siguiente necesita menos urea.',
    usoPoseidon: 'Incluir leguminosas sube el puntaje de suelo de una rotación.',
    fuente: 'Agronomía general',
  },
  {
    id: 'familia',
    nombre: 'Familias de cultivos',
    categoria: 'suelo',
    icono: 'hoja',
    corto: 'Grupos de plantas parientes que comparten plagas, enfermedades y gustos de suelo.',
    explicacion: 'Papa, tomate y locoto son solanáceas; maíz, trigo y avena son gramíneas. Si se siembra la misma familia una campaña tras otra, '
      + 'las plagas que la atacan se quedan en el suelo y se multiplican.',
    ejemplo: 'Papa seguida de papa favorece al gorgojo de los Andes. Papa → haba → maíz cambia de familia cada campaña y corta ese ciclo.',
    usoPoseidon: 'Repetir la misma familia dos campañas seguidas baja el puntaje de suelo.',
    fuente: 'Agronomía general',
  },
  {
    id: 'puntaje',
    nombre: 'Puntaje de la estrategia',
    categoria: 'suelo',
    icono: 'calendario',
    corto: 'Una nota de 0 a 100 que resume qué tan bien encaja la rotación con lo que a usted le importa.',
    explicacion: 'Cada rotación recibe una nota en agua, heladas, suelo, ingreso y forraje. Luego se promedian dando más peso a lo que usted marcó como más importante. '
      + 'Sirve para comparar las tres opciones entre sí, no es una garantía de cosecha.',
    ejemplo: 'Si usted puso “Ahorrar agua” en 5 y “Ingreso” en 1, una rotación que gasta poca agua gana puntaje aunque venda un poco menos.',
    usoPoseidon: 'Es el número grande de cada tarjeta. Mueva las prioridades y vuelva a comparar para ver cómo cambia.',
    fuente: 'Modelo de Poseidon',
  },
  {
    id: 'indice-agua',
    nombre: 'Uso eficiente del agua',
    categoria: 'agua',
    icono: 'gota',
    corto: 'Una nota de 0 a 100 que dice qué tan poco riego necesita la rotación de la que sale la cosecha.',
    explicacion: 'Se calcula con el riego que pide la rotación del productor en su lugar, según el clima de NASA POWER. '
      + '100 quiere decir que casi toda el agua la pone la lluvia; cerca de 0, que depende mucho del riego. '
      + 'Alto es 70 o más, medio de 40 a 69 y bajo menos de 40.',
    ejemplo: 'Dos ofertas de haba: una de una rotación con índice 78 (la lluvia cubre casi todo) y otra con 35 (necesita mucho riego). '
      + 'La primera usó bastante menos agua de río o de pozo para producir lo mismo.',
    usoPoseidon: 'Ordena la oferta sostenible y sirve de filtro para cooperativas y mercados. No mide el agua realmente aplicada: es una estimación.',
    fuente: 'Calculado con datos de NASA POWER',
    visual: {
      tipo: 'escala',
      min: 0, max: 100, decimales: 0,
      colores: ['#f6e4ea', '#fdebd6', '#eaf1fa', '#1e4e8c'],
      marcas: [
        { valor: 35, etiqueta: 'Bajo: depende mucho del riego' },
        { valor: 55, etiqueta: 'Medio' },
        { valor: 80, etiqueta: 'Alto: la lluvia cubre casi todo' },
      ],
    },
  },
  {
    id: 'practicas-rotacion',
    nombre: 'Prácticas de rotación',
    categoria: 'suelo',
    icono: 'hoja',
    corto: 'Lo que la rotación del productor hace por el suelo: abonar, cortar plagas, cubrir y airear la tierra.',
    explicacion: 'Poseidon las calcula con los cultivos que el productor registró, no con lo que dice: si incluye una leguminosa, '
      + 'si cambia de familia cada campaña, si deja el suelo cubierto casi todo el año (6 meses o menos desnudo) '
      + 'y si tiene cultivos de raíz profunda que ayudan a que el agua entre en la tierra.',
    ejemplo: 'Papa → haba → maíz cumple tres: tiene leguminosa (haba), alterna familias y el maíz tiene raíz profunda. '
      + 'Papa → papa no cumple ninguna.',
    usoPoseidon: 'Cada oferta muestra qué prácticas cumple su rotación y el comprador puede filtrar por ellas.',
    fuente: 'Calculado con el catálogo de cultivos de Poseidon',
  },
  {
    id: 'verificada',
    nombre: 'Rotación verificada',
    categoria: 'suelo',
    icono: 'calendario',
    corto: 'Un técnico de Poseidon revisó la rotación de la parcela de la que sale la cosecha.',
    explicacion: 'Cuando el agricultor compara rotaciones, un técnico de campo revisa la evaluación y deja una nota. '
      + 'Desde ese momento sus ofertas aparecen como verificadas. No es una certificación orgánica ni oficial.',
    ejemplo: 'Una cooperativa que quiere vender “papa de rotación con leguminosa” puede filtrar solo las ofertas verificadas por un técnico.',
    usoPoseidon: 'Es un filtro de la oferta sostenible. Las ofertas sin verificar también se muestran, con su aviso.',
    fuente: 'Revisión técnica en Poseidon',
  },
  {
    id: 'presion-plagas',
    nombre: 'Plagas reportadas cerca',
    categoria: 'suelo',
    icono: 'hoja',
    corto: 'Plagas y enfermedades que los técnicos marcaron en el mapa a menos de 5 km de su parcela.',
    explicacion: 'Los técnicos de campo registran con GPS y fotos dónde vieron una plaga o enfermedad y en qué cultivo. '
      + 'Cada plaga ataca a una familia de cultivos: si su rotación siembra esa familia, la plaga tiene comida y se multiplica. '
      + 'Cuenta más si el reporte es grave, está más cerca y es de este último año.',
    ejemplo: 'Si hay gorgojo de los Andes a 2 km, una rotación sin papa (ni otra solanácea) por una o dos campañas corta su ciclo, '
      + 'porque el gorgojo no encuentra dónde poner sus huevos.',
    usoPoseidon: 'Las rotaciones que siembran la familia atacada bajan de puntaje (más aún si la repiten dos campañas seguidas) '
      + 'y la explicación lo dice. Cuando el técnico marca la incidencia como controlada, deja de contar.',
    fuente: 'Incidencias registradas por técnicos de Poseidon',
  },
  {
    id: 'pendiente',
    nombre: 'Pendiente y riesgo de erosión',
    categoria: 'suelo',
    icono: 'suelo',
    corto: 'Cuánto se inclina el terreno: en una pendiente de 10 %, el suelo baja 10 metros por cada 100 que avanza.',
    explicacion: 'En un terreno inclinado el agua de lluvia no se queda: corre ladera abajo y se lleva la tierra fina y el abono. '
      + 'Cuanto más inclinado y más desnudo está el suelo, más se pierde. Las raíces profundas y las plantas que cubren el suelo lo sujetan. '
      + 'Menos de 5 % es riesgo bajo; de 5 a 15 %, medio; más de 15 %, alto.',
    ejemplo: 'En una ladera con 20 % de pendiente, dejar la tierra pelada entre mayo y octubre significa que el primer aguacero de noviembre '
      + 'se lleva la capa más fértil. Sembrar alfalfa, tarwi o avena de cobertura, en surcos que sigan el contorno, la protege.',
    usoPoseidon: 'Al registrar la parcela calculamos su pendiente y mostramos la alerta de erosión con cultivos de cobertura sugeridos. '
      + 'En ladera, la comparación de rotaciones da más puntaje a las raíces profundas y castiga los meses de suelo desnudo.',
    fuente: 'NASA SRTM (modelo de elevación de 30 m)',
    visual: {
      tipo: 'escala',
      min: 0, max: 30, decimales: 0, unidad: '%',
      colores: ['#eaf1fa', '#fef4d6', '#fac748', '#f28c28', '#7a1f3d'],
      marcas: [
        { valor: 2, etiqueta: 'Casi plano: riesgo bajo' },
        { valor: 10, etiqueta: 'Ladera moderada: riesgo medio' },
        { valor: 20, etiqueta: 'Ladera fuerte: riesgo alto' },
      ],
    },
  },
  {
    id: 'sello-hidrico',
    nombre: 'Sello de Gestión Hídrica Sostenible',
    categoria: 'agua',
    icono: 'gota',
    corto: 'Distingue las cosechas de rotaciones que necesitan al menos 15 % menos riego que la rotación tradicional.',
    explicacion: 'Comparamos el riego que pide la rotación del productor con el que pediría la rotación tradicional del valle (papa → maíz) '
      + 'en el mismo lugar y con el mismo clima. Si necesita al menos 15 % menos, la oferta lleva el sello y muestra el porcentaje de ahorro.',
    ejemplo: 'Si papa → maíz necesita 700 mm de riego por campaña y la rotación del productor, con cebada y avena sembradas en la época de lluvias, necesita 520 mm, '
      + 'ahorra un 26 % y recibe el sello.',
    usoPoseidon: 'Aparece en el catálogo de oferta y sirve de filtro para los compradores. Es una estimación con el clima típico de NASA POWER: '
      + 'todavía no usa la humedad del suelo de SMAP ni la evapotranspiración medida por ECOSTRESS, y no mide el agua realmente aplicada.',
    fuente: 'Calculado con datos de NASA POWER',
    visual: {
      tipo: 'balanza',
      titulo: 'Riego por campaña (ejemplo)',
      unidad: 'mm',
      barras: [
        { etiqueta: 'Papa → maíz', valor: 700, tono: 'naranja' },
        { etiqueta: 'Rotación del productor', valor: 520, tono: 'azul' },
      ],
      conclusion: 'Ahorra 180 mm: un 26 % menos de riego.',
    },
  },
];

const POR_ID = Object.fromEntries(TERMINOS.map((t) => [t.id, t]));
export const termino = (id) => POR_ID[id];

// Búsqueda sin distinguir mayúsculas ni tildes.
const plano = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function buscarTerminos(texto, categoria) {
  const q = plano(texto.trim());
  return TERMINOS.filter((t) => (!categoria || t.categoria === categoria)
    && (!q || plano(`${t.nombre} ${t.sigla || ''} ${t.corto} ${t.explicacion}`).includes(q)));
}
