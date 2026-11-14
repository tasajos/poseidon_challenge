// Motor de comparación de rotaciones. Recibe el clima mensual (clima.js) y el catálogo de cultivos.
// Es un modelo simple y explicable: apoya la decisión, no reemplaza al agricultor ni al técnico local.

export const CRITERIOS = ['agua', 'clima', 'suelo', 'ingreso', 'forraje'];
const LLUVIA_EFECTIVA = 0.8; // fracción de la lluvia que aprovecha el cultivo (supuesto)

export const VACIOS = [
  'No incluye análisis de suelo de la parcela (textura, materia orgánica, pendiente).',
  'El clima viene de una grilla de unos 50 km (NASA POWER); el microclima de la parcela puede diferir.',
  'El valor de mercado es referencial, no un precio actual.',
  'Fechas de siembra y coeficientes de cultivo son valores típicos, no medidos en la parcela.',
];

// Índices de mes (0-11) que ocupa el cultivo desde la siembra.
export function calendario(c) {
  const n = Math.min(12, Math.ceil(c.ciclo_dias / 30));
  return Array.from({ length: n }, (_, k) => (c.mes_siembra - 1 + k) % 12);
}

export function evaluarCultivo(c, clima) {
  let demanda = 0, deficit = 0, helada = 0;
  const mesesHelada = [];
  const meses = calendario(c);
  for (const m of meses) {
    const etc = c.kc * clima[m].et0_mm; // demanda de agua del cultivo en el mes
    demanda += etc;
    deficit += Math.max(0, etc - LLUVIA_EFECTIVA * clima[m].lluvia_mm);
    const peso = clima[m].helada === 'alta' ? 1 : clima[m].helada === 'media' ? 0.5 : 0;
    const exposicion = (peso * (2 - c.tolerancia_helada)) / 2;
    if (exposicion > 0) { helada += exposicion; mesesHelada.push(clima[m].mes); }
  }
  return {
    codigo: c.codigo, nombre: c.nombre, familia: c.familia,
    siembra: clima[meses[0]].mes, cosecha: clima[meses[meses.length - 1]].mes,
    meses_ocupados: meses.length,
    demanda_mm: Math.round(demanda), deficit_mm: Math.round(deficit),
    exposicion_helada: helada, meses_helada: mesesHelada,
  };
}

const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const limitar = (x) => Math.max(0, Math.min(100, Math.round(x)));

export function evaluarRotacion(cultivos, clima, prioridades = {}) {
  const n = cultivos.length;
  const detalle = cultivos.map((c) => evaluarCultivo(c, clima));
  const deficit = media(detalle.map((d) => d.deficit_mm));
  const helada = media(detalle.map((d) => d.exposicion_helada));
  const desnudos = media(detalle.map((d) => 12 - d.meses_ocupados));
  const familias = [...new Set(cultivos.map((c) => c.familia))];
  // ¿Se siembra la misma familia dos campañas seguidas? (la rotación es cíclica)
  const repite = cultivos.some((c, i) => c.familia === cultivos[(i + 1) % n].familia);
  const fraccion = (campo) => cultivos.filter((c) => c[campo]).length / n;
  const diversidad = (familias.length / n) * (repite ? 0.5 : 1);

  const puntajes = {
    agua: limitar(100 * (1 - deficit / 800)),
    clima: limitar(100 * (1 - helada / 3)),
    suelo: limitar(100 * (0.35 * fraccion('fija_nitrogeno') + 0.35 * diversidad
      + 0.15 * fraccion('raiz_profunda') + 0.15 * (1 - desnudos / 12))),
    ingreso: limitar((100 * (media(cultivos.map((c) => c.valor_mercado)) - 1)) / 2),
    forraje: limitar(100 * fraccion('forraje')),
  };
  const pesos = CRITERIOS.map((k) => Math.max(0, Number(prioridades[k]) || 0));
  const suma = pesos.reduce((a, b) => a + b, 0);
  const total = suma === 0
    ? media(CRITERIOS.map((k) => puntajes[k]))
    : CRITERIOS.reduce((acc, k, i) => acc + puntajes[k] * pesos[i], 0) / suma;

  return {
    cultivos: cultivos.map((c) => c.codigo),
    nombres: cultivos.map((c) => c.nombre),
    puntaje: Math.round(total),
    puntajes,
    evidencia: {
      deficit_agua_mm: Math.round(deficit),
      demanda_agua_mm: Math.round(media(detalle.map((d) => d.demanda_mm))),
      meses_suelo_desnudo: Math.round(desnudos * 10) / 10,
      familias, repite_familia: repite,
    },
    detalle,
    _crudo: { deficit, helada, desnudos },
  };
}

// Todas las secuencias de n cultivos distintos, sin duplicar rotaciones cíclicamente iguales.
function candidatas(catalogo, n) {
  const vistas = new Set(), salida = [];
  const armar = (sec) => {
    if (sec.length === n) {
      const clave = canonica(sec.map((c) => c.codigo));
      if (!vistas.has(clave)) { vistas.add(clave); salida.push(sec); }
      return;
    }
    for (const c of catalogo) if (!sec.includes(c)) armar([...sec, c]);
  };
  armar([]);
  return salida;
}

export function canonica(codigos) {
  const giros = codigos.map((_, i) => [...codigos.slice(i), ...codigos.slice(0, i)].join('>'));
  return giros.sort()[0];
}

function explicar(alt, actual, cultivos, cultivosActuales) {
  const porque = [], riesgos = [];
  const dAgua = actual.evidencia.deficit_agua_mm - alt.evidencia.deficit_agua_mm;
  if (dAgua > 20) porque.push(`Pide unos ${dAgua} mm menos de riego por campaña que la rotación actual.`);
  if (dAgua < -20) riesgos.push(`Pide unos ${-dAgua} mm más de riego por campaña que la rotación actual.`);
  const nuevos = cultivos.filter((c) => !cultivosActuales.includes(c));
  const fijadores = nuevos.filter((c) => c.fija_nitrogeno).map((c) => c.nombre);
  if (fijadores.length) porque.push(`Incorpora ${fijadores.join(' y ')}: leguminosa que fija nitrógeno y mejora el suelo.`);
  if (actual.evidencia.repite_familia && !alt.evidencia.repite_familia) {
    porque.push('Alterna familias de cultivos, lo que ayuda a cortar ciclos de plagas y enfermedades.');
  }
  if (actual._crudo.helada - alt._crudo.helada > 0.2) porque.push('Menor exposición de los cultivos a los meses con riesgo de helada.');
  if (alt._crudo.helada - actual._crudo.helada > 0.2) riesgos.push('Mayor exposición a los meses con riesgo de helada que la rotación actual.');
  const profundos = nuevos.filter((c) => c.raiz_profunda).map((c) => c.nombre);
  if (profundos.length) porque.push(`${profundos.join(' y ')}: raíz profunda que mejora la infiltración.`);
  if (alt.puntajes.forraje > actual.puntajes.forraje) porque.push('Añade forraje para el ganado.');
  if (alt.puntajes.ingreso > actual.puntajes.ingreso) porque.push('Mayor valor de mercado referencial.');
  if (actual._crudo.desnudos - alt._crudo.desnudos >= 1) porque.push('El suelo queda menos meses desnudo.');
  if (!porque.length) porque.push('Puntaje parecido al de la rotación actual según sus prioridades.');
  return { porque, riesgos };
}

function riesgosPropios(ev, cultivos) {
  const r = [];
  cultivos.forEach((c, i) => {
    const d = ev.detalle[i];
    if (c.tolerancia_helada === 0 && d.meses_helada.length) {
      r.push(`${c.nombre} es sensible a heladas y crece en ${d.meses_helada.join(', ')}.`);
    }
    if (c.valor_mercado === 1) r.push(`${c.nombre}: mercado limitado, confirmar compradores antes de sembrar.`);
    if (c.ciclo_dias >= 365) r.push(`${c.nombre} es perenne: ocupa la parcela más de una campaña.`);
  });
  if (ev.evidencia.deficit_agua_mm > 400) r.push('Déficit de agua alto: depende de que haya riego disponible.');
  r.push('Validar con un técnico agrícola local antes de cambiar la rotación.');
  return r;
}

const limpiar = ({ _crudo, ...resto }) => resto;

// Devuelve 3 estrategias: la actual, un ajuste (cambia un cultivo) y un cambio mayor.
export function compararRotaciones(codigosActuales, catalogo, clima, prioridades = {}) {
  const porCodigo = new Map(catalogo.map((c) => [c.codigo, c]));
  const actuales = codigosActuales.map((k) => {
    if (!porCodigo.has(k)) throw new Error(`Cultivo desconocido: ${k}`);
    return porCodigo.get(k);
  });
  const n = actuales.length;
  const evActual = evaluarRotacion(actuales, clima, prioridades);
  const claveActual = canonica(codigosActuales);

  const opciones = candidatas(catalogo, n)
    .filter((sec) => canonica(sec.map((c) => c.codigo)) !== claveActual)
    .map((sec) => ({
      sec,
      ev: evaluarRotacion(sec, clima, prioridades),
      comunes: sec.filter((c) => actuales.includes(c)).length,
    }))
    .sort((a, b) => b.ev.puntaje - a.ev.puntaje || a.ev._crudo.deficit - b.ev._crudo.deficit);

  const ajuste = opciones.find((o) => o.comunes >= n - 1);
  const cambio = opciones.find((o) => o.comunes < n - 1);

  const armar = (tipo, titulo, o) => {
    const { porque, riesgos } = explicar(o.ev, evActual, o.sec, actuales);
    return {
      tipo, titulo, ...limpiar(o.ev), porque,
      riesgos: [...riesgos, ...riesgosPropios(o.ev, o.sec)], vacios: VACIOS,
    };
  };
  return [
    {
      tipo: 'actual', titulo: 'Rotación actual', ...limpiar(evActual),
      porque: ['Es su rotación de hoy: sirve de referencia para comparar las otras dos.'],
      riesgos: riesgosPropios(evActual, actuales), vacios: VACIOS,
    },
    ...(ajuste ? [armar('ajuste', 'Ajuste: cambia un cultivo', ajuste)] : []),
    ...(cambio ? [armar('cambio', 'Cambio mayor', cambio)] : []),
  ];
}
