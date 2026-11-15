import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Estado, Mapa, Pestanas, Stat, fecha, useDatos } from '../componentes.jsx';
import { ListaMedidores } from '../graficas.jsx';
import { Termino } from '../Termino.jsx';

// Monitoreo regional. Sin el permiso "ver_todas" solo se ven agregados por zona o distrito (HU-MON-01).
const EPOCA = { seca: 'Época seca (jul-sep), fuera de temporada', humeda: 'Época húmeda (ene-mar), cultivos en pie' };
const TIPO = { observado: 'Observado', estimado: 'Estimado', declarado: 'Declarado', simulado: 'Simulado' };
// Rampa ordinal de un solo tono (validada): más oscuro = más estrés o más suelo desnudo.
const RAMPA = ['#dc9ab1', '#c2668a', '#9c3a60', '#661630'];
const n = (v, sufijo = '') => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('es-BO')}${sufijo}`);

export default function Monitoreo() {
  const [vista, setVista] = useState('panorama');
  const [periodo, setPeriodo] = useState({ anio: '', epoca: 'seca' });
  const { datos: d, error } = useDatos(() => api.monitoreoPeriodo(periodo), [periodo.anio, periodo.epoca]);
  if (error) return <p className="error">{error}</p>;
  if (!d) return <p className="cargando">Cargando…</p>;

  return (
    <>
      <div className="stats">
        <Stat etiqueta="Productores" valor={d.totales.clientes} tono="azul" />
        <Stat etiqueta="Parcelas registradas" valor={d.totales.parcelas} tono="amarillo" />
        <Stat etiqueta="Adopción de rotaciones" valor={d.totales.adopcion_pct === null ? '—' : `${d.totales.adopcion_pct} %`} tono="naranja" detalle="productores que eligieron una estrategia recomendada" />
        <Stat etiqueta="Plagas activas" valor={d.totales.incidencias} tono="vino" />
      </div>
      <Pestanas valor={vista} onCambiar={setVista} opciones={[
        ['panorama', 'Panorama'], ['escenarios', 'Escenarios de agua'], ['adopcion', 'Adopción'], ['suelo', 'Suelo desnudo'],
        ...(d.detalle ? [['detalle', 'Detalle por parcela']] : []),
      ]} />
      {vista === 'panorama' && <Panorama d={d} />}
      {vista === 'escenarios' && <Escenarios centros={d.capas.centros} />}
      {vista === 'adopcion' && <Adopcion d={d} />}
      {vista === 'suelo' && <SueloDesnudo d={d} periodo={periodo} setPeriodo={setPeriodo} />}
      {vista === 'detalle' && d.detalle && <DetalleParcelas d={d} />}
    </>
  );
}

const publicadas = (d) => d.zonas.filter((z) => !z.suprimido);
const centroDe = (d, zona) => d.capas.centros.find((c) => c.nombre === zona);

function AvisoPrivacidad({ d }) {
  return (
    <p className="suave">
      Los valores son promedios por zona. Las zonas con menos de {d.minimo_productores} productores se juntan en un grupo y, si aun así son pocos,
      no se publican: ningún dato permite identificar una parcela o a un agricultor.
    </p>
  );
}

// ---------- HU-MON-01 ----------
function Panorama({ d }) {
  const [fallaWms, setFallaWms] = useState(false);
  const { gamc } = d.capas;
  const zonas = publicadas(d);
  const puntos = [
    ...zonas.map((z) => ({ z, c: centroDe(d, z.zona) })).filter((x) => x.c).map(({ z, c }) => ({
      id: `z-${z.zona}`, lat: c.lat, lon: c.lon, radio: 13, texto: `${z.zona}: ${z.productores} productores, riego medio ${n(z.riego_medio_mm, ' mm')}`,
    })),
    ...d.incidencias.map((i) => ({ id: `i${i.id}`, lat: i.lat, lon: i.lon, color: '#F28C28', radio: 6, texto: `${i.agente} (${i.tipo}, severidad ${i.severidad})` })),
  ];
  return (
    <>
      {!gamc.configurado && !d.capas.distritos_oficiales && (
        <p className="aviso" role="status">
          La capa de límites distritales del GAMC no está configurada: las zonas son el municipio más cercano a cada parcela (aproximado). El resto del tablero funciona con normalidad.
        </p>
      )}
      {gamc.configurado && fallaWms && (
        <p className="aviso" role="status">El servicio de mapas del GAMC no respondió: se muestra el mapa sin los límites distritales. Los indicadores siguen disponibles.</p>
      )}
      <div className="dos-columnas ancha">
        <div className="caja">
          <h2>Mapa regional</h2>
          <Mapa alto={380} puntos={puntos} wms={gamc.configurado ? { url: gamc.url, capas: gamc.capas, atribucion: gamc.atribucion } : undefined}
            geojson={d.capas.distritos || undefined} onErrorWms={() => setFallaWms(true)} />
          <p className="leyenda">
            <i className="marca-azul" /> zona con indicadores publicados <i className="marca-naranja" /> plaga o enfermedad activa (ubicación aproximada)
          </p>
        </div>
        <div className="caja">
          <h2>Alertas regionales</h2>
          {!d.alertas.length && <p className="suave">Sin alertas por ahora.</p>}
          <ul className="alertas">
            {d.alertas.map((a, i) => <li key={i} className={a.tipo}><b>{a.parcela}</b><span>{a.texto}</span></li>)}
          </ul>
        </div>
      </div>

      <div className="caja">
        <h2>Indicadores agroclimáticos por zona</h2>
        <AvisoPrivacidad d={d} />
        <div className="tabla-scroll">
          <table className="tabla apilable">
            <thead>
              <tr><th>Zona o distrito</th><th className="num">Productores</th><th className="num">Parcelas</th><th className="num">Superficie (ha)</th>
                <th className="num">Riego medio (mm)</th><th className="num">Índice de agua</th><th className="num">Con riesgo de helada</th>
                <th className="num">En ladera</th><th className="num">Plagas activas</th></tr>
            </thead>
            <tbody>
              {d.zonas.map((z) => (z.suprimido ? (
                <tr key={z.zona} className="inactivo"><td data-t="Zona o distrito"><b>{z.zona}</b></td><td colSpan={8} data-t="">{z.motivo}</td></tr>
              ) : (
                <tr key={z.zona}>
                  <td data-t="Zona o distrito"><b>{z.zona}</b>{z.agrupa && <small className="agrupa"> ({z.agrupa.join(', ')})</small>}</td>
                  <td data-t="Productores" className="num">{z.productores}</td>
                  <td data-t="Parcelas" className="num">{z.parcelas}</td>
                  <td data-t="Superficie (ha)" className="num">{n(z.superficie_ha)}</td>
                  <td data-t="Riego medio (mm)" className="num">{n(z.riego_medio_mm)}</td>
                  <td data-t="Índice de agua" className="num">{n(z.agua_indice)}</td>
                  <td data-t="Con riesgo de helada" className="num">{n(z.helada_pct, ' %')}</td>
                  <td data-t="En ladera" className="num">{n(z.erosion_pct, ' %')}</td>
                  <td data-t="Plagas activas" className="num">{z.incidencias_activas}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
        {!d.zonas.length && <p className="suave">Todavía no hay parcelas registradas.</p>}
      </div>

      <div className="caja">
        <h2>Qué significa cada indicador</h2>
        <div className="tabla-scroll">
          <table className="tabla apilable">
            <thead><tr><th>Indicador</th><th>Fuente</th><th>Período</th><th>Escala de análisis</th><th>Tipo de dato</th></tr></thead>
            <tbody>
              {d.fuentes.map((f) => (
                <tr key={f.indicador}>
                  <td data-t="Indicador"><b>{f.indicador}</b></td><td data-t="Fuente">{f.fuente}</td><td data-t="Período">{f.periodo}</td>
                  <td data-t="Escala de análisis">{f.escala}</td><td data-t="Tipo de dato"><span className={`etiqueta tipo-${f.tipo}`}>{TIPO[f.tipo]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ---------- HU-MON-02 ----------
const NIVEL = { bajo: 'Bajo', moderado: 'Moderado', alto: 'Alto', critico: 'Crítico' };
const COLOR_NIVEL = { bajo: RAMPA[0], moderado: RAMPA[1], alto: RAMPA[2], critico: RAMPA[3] };

function Escenarios() {
  const [cambio, setCambio] = useState({ lluvia: 0, temp: 0 });
  const [r, setR] = useState(null);
  const [estado, setEstado] = useState({ cargando: true, error: '' });
  const turno = useRef(0);
  // Los mapas se recalculan mientras se mueven los controles (con una pausa corta para no saturar).
  useEffect(() => {
    const mio = ++turno.current;
    setEstado((s) => ({ ...s, cargando: true }));
    const t = setTimeout(() => {
      api.escenario(cambio.lluvia, cambio.temp)
        .then((datos) => { if (mio === turno.current) { setR(datos); setEstado({ cargando: false, error: '' }); } })
        .catch((e) => { if (mio === turno.current) setEstado({ cargando: false, error: e.message }); });
    }, r ? 180 : 0);
    return () => clearTimeout(t);
  }, [cambio.lluvia, cambio.temp]); // eslint-disable-line react-hooks/exhaustive-deps

  const lim = r?.limites || { lluvia: [-60, 20], temperatura: [0, 5] };
  const sinNasa = r?.zonas.filter((z) => z.fuente !== 'nasa-power').length || 0;
  const criticas = r?.zonas.filter((z) => ['alto', 'critico'].includes(z.nivel)).length || 0;
  const cuadros = r ? new Set(r.zonas.map((z) => z.base.lluvia_mm)).size : 0;
  return (
    <div className="dos-columnas">
      <div className="caja">
        <h2>Escenario</h2>
        <p className="etiqueta tipo-simulado">Escenario simulado, no una proyección</p>
        <label className="control-escenario">
          <span>Lluvia de la campaña <b>{cambio.lluvia > 0 ? '+' : ''}{cambio.lluvia} %</b></span>
          <input type="range" min={lim.lluvia[0]} max={lim.lluvia[1]} step="5" value={cambio.lluvia}
            onChange={(e) => setCambio({ ...cambio, lluvia: Number(e.target.value) })} aria-label="Cambio de lluvia en porcentaje" />
          <small>{lim.lluvia[0]} % (sequía fuerte) a +{lim.lluvia[1]} %</small>
        </label>
        <label className="control-escenario">
          <span>Temperatura <b>+{cambio.temp.toLocaleString('es-BO')} °C</b></span>
          <input type="range" min={lim.temperatura[0]} max={lim.temperatura[1]} step="0.5" value={cambio.temp}
            onChange={(e) => setCambio({ ...cambio, temp: Number(e.target.value) })} aria-label="Aumento de temperatura en grados" />
          <small>Clima actual a +{lim.temperatura[1]} °C</small>
        </label>
        <button type="button" className="secundario ancho" disabled={!cambio.lluvia && !cambio.temp} onClick={() => setCambio({ lluvia: 0, temp: 0 })}>Volver al clima actual</button>
        {r && (
          <>
            <h3>Riego adicional respecto de hoy</h3>
            <ul className="leyenda-niveles">
              {[...r.niveles].reverse().map((x) => <li key={x.clave}><i style={{ background: COLOR_NIVEL[x.clave] }} /><b>{NIVEL[x.clave]}</b> {x.texto}</li>)}
            </ul>
            <p className="suave">{r.fuente.metodo}. Base: {r.fuente.base}. {r.fuente.aviso}</p>
            {sinNasa > 0 && <p className="aviso">Sin conexión con NASA POWER para {sinNasa} zona(s): ahí se usa un clima de demostración.</p>}
          </>
        )}
        {estado.error && <p className="error" role="alert">{estado.error}</p>}
      </div>

      <section className={estado.cargando && r ? 'recalculando' : ''}>
        {!r && !estado.error && <p className="cargando">Consultando el clima de cada zona en NASA POWER…</p>}
        {r && (
          <>
            <div className="caja">
              <h2>Mapa de calor por zona</h2>
              <p role="status" className="resultado-filtros">
                {criticas ? `${criticas} de ${r.zonas.length} zonas necesitarían al menos 20 % más de riego que hoy` : `Ninguna de las ${r.zonas.length} zonas necesitaría 20 % más de riego que hoy`} con este escenario.
              </p>
              <Mapa alto={340} puntos={r.zonas.map((z) => ({
                id: z.nombre, lat: z.lat, lon: z.lon, radio: 16, color: COLOR_NIVEL[z.nivel],
                texto: `${z.nombre}: ${z.riego_extra_pct > 0 ? '+' : ''}${z.riego_extra_pct} % de riego (${NIVEL[z.nivel].toLowerCase()})`,
              }))} />
            </div>
            <div className="caja">
              <h2>Impacto por zona</h2>
              <div className="tabla-scroll">
                <table className="tabla apilable">
                  <thead><tr><th>Zona</th><th>Nivel</th><th className="num">La lluvia cubre (escenario)</th><th className="num">La lluvia cubre (hoy)</th><th className="num">Riego necesario (mm)</th><th className="num">Riego adicional</th></tr></thead>
                  <tbody>
                    {[...r.zonas].sort((a, b) => a.escenario.cobertura_pct - b.escenario.cobertura_pct).map((z) => (
                      <tr key={z.nombre}>
                        <td data-t="Zona"><b>{z.nombre}</b></td>
                        <td data-t="Nivel"><span className="nivel"><i style={{ background: COLOR_NIVEL[z.nivel] }} />{NIVEL[z.nivel]}</span></td>
                        <td data-t="La lluvia cubre (escenario)" className="num">{z.escenario.cobertura_pct} %</td>
                        <td data-t="La lluvia cubre (hoy)" className="num">{z.base.cobertura_pct} %</td>
                        <td data-t="Riego necesario (mm)" className="num">{n(z.escenario.deficit_mm)}</td>
                        <td data-t="Riego adicional" className="num">{z.riego_extra_mm > 0 ? `+${n(z.riego_extra_mm)} mm${z.riego_extra_pct !== null ? ` (+${z.riego_extra_pct} %)` : ''}` : z.riego_extra_mm < 0 ? `${n(z.riego_extra_mm)} mm` : 'Sin cambio'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {cuadros < r.zonas.length && <p className="aviso">Las {r.zonas.length} zonas caen en solo {cuadros} cuadros de NASA POWER (unos 50 km cada uno): las zonas del mismo cuadro muestran valores iguales. No distingue diferencias dentro de un cuadro.</p>}
              <p className="suave">Escala: {r.fuente.escala}. “La lluvia cubre” es la parte de la necesidad de agua de un cultivo de referencia que pone la lluvia en la campaña de octubre a marzo.</p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ---------- HU-MON-03 ----------
function Adopcion({ d }) {
  const zonas = publicadas(d).filter((z) => z.productores_con_evaluacion > 0);
  const ep = d.periodo_ndvi;
  return (
    <>
      <div className="dos-columnas ancha">
        <div className="caja">
          <h2>Adopción de rotaciones recomendadas por zona</h2>
          <p className="suave">Porcentaje de productores con evaluación que marcaron que aplicarán el ajuste o el cambio mayor que les recomendó Poseidon. Dato declarado por los agricultores.</p>
          <ListaMedidores vacio="Aún no hay zonas con datos suficientes para publicar."
            filas={zonas.map((z) => ({ nombre: z.zona, valor: z.adopcion_pct, cifra: `${z.adopcion_pct} %`, detalle: `${z.productores_con_evaluacion} productores con evaluación` }))} />
        </div>
        <div className="caja">
          <h2>Adopción regional</h2>
          <p className="cifra-heroe">{d.totales.adopcion_pct === null ? '—' : `${d.totales.adopcion_pct} %`}</p>
          <p className="suave">de los productores con evaluación en las zonas publicadas.</p>
          <AvisoPrivacidad d={d} />
        </div>
      </div>
      <div className="caja">
        <h2>Indicadores de impacto ambiental</h2>
        <div className="tabla-scroll">
          <table className="tabla apilable">
            <thead><tr><th>Zona o distrito</th><th className="num">Adopción</th><th className="num">Riego que ahorra quien adoptó (mm por campaña)</th>
              <th className="num"><Termino id="ndvi">NDVI</Termino> medio{ep.anio ? ` (${ep.epoca === 'seca' ? 'época seca' : 'época húmeda'} ${ep.anio})` : ''}</th><th className="num">Parcelas con NDVI</th></tr></thead>
            <tbody>
              {zonas.map((z) => (
                <tr key={z.zona}>
                  <td data-t="Zona o distrito"><b>{z.zona}</b></td>
                  <td data-t="Adopción" className="num">{z.adopcion_pct} %</td>
                  <td data-t="Riego que ahorra quien adoptó" className="num">{z.ahorro_agua_mm === null ? 'Sin adopciones' : n(z.ahorro_agua_mm)}</td>
                  <td data-t="NDVI medio" className="num">{z.ndvi_medio === null ? 'Sin dato' : n(z.ndvi_medio)}</td>
                  <td data-t="Parcelas con NDVI" className="num">{z.parcelas_con_ndvi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!zonas.length && <p className="suave">Aún no hay zonas con datos suficientes para publicar.</p>}
        <p className="suave">El ahorro de riego es una estimación con el clima típico de NASA POWER (estrategia elegida frente a la rotación anterior). El NDVI es el observado por MODIS en las parcelas registradas (píxel de 250 m), no el de toda la zona.</p>
      </div>
    </>
  );
}

// ---------- HU-MON-04 ----------
const tramo = (pct) => (pct >= 75 ? 3 : pct >= 50 ? 2 : pct >= 25 ? 1 : 0);
const TRAMOS = ['Menos de 25 %', '25 a 49 %', '50 a 74 %', '75 % o más'];

function SueloDesnudo({ d, periodo, setPeriodo }) {
  const [estado, setEstado] = useState({ ok: '', error: '' });
  const ep = d.periodo_ndvi;
  const zonas = publicadas(d).filter((z) => z.suelo_desnudo_pct !== null && z.parcelas_con_ndvi > 0)
    .sort((a, b) => b.suelo_desnudo_pct - a.suelo_desnudo_pct);
  const exportar = () => api.exportarSueloDesnudo({ anio: ep.anio ?? '', epoca: ep.epoca })
    .then((nombre) => setEstado({ ok: `Se descargó ${nombre}.`, error: '' })).catch((e) => setEstado({ ok: '', error: e.message }));
  return (
    <>
      <div className="caja filtros-periodo">
        <div className="fila">
          <label className="campo">Año
            <select value={ep.anio ?? ''} onChange={(e) => setPeriodo({ ...periodo, anio: e.target.value })} disabled={!ep.anios_disponibles.length}>
              {!ep.anios_disponibles.length && <option value="">Sin datos</option>}
              {ep.anios_disponibles.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <div className="campo crece">Época del año
            <div className="chips" role="group" aria-label="Época del año">
              {Object.entries(EPOCA).map(([k, t]) => (
                <button key={k} type="button" aria-pressed={ep.epoca === k} className={ep.epoca === k ? 'activa' : ''} onClick={() => setPeriodo({ anio: '', epoca: k })}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {!ep.anios_disponibles.length && (
        <p className="vacio">Aún no hay NDVI guardado para esta época. Se consulta a MODIS (NASA) en segundo plano cuando se registra una parcela y tarda unos minutos.</p>
      )}
      {ep.anios_disponibles.length > 0 && (
        <div className="dos-columnas ancha">
          <div className="caja">
            <h2>Áreas sin cobertura vegetal activa</h2>
            <Mapa alto={360} puntos={zonas.map((z) => ({ z, c: centroDe(d, z.zona) })).filter((x) => x.c).map(({ z, c }) => ({
              id: z.zona, lat: c.lat, lon: c.lon, radio: 16, color: RAMPA[tramo(z.suelo_desnudo_pct)],
              texto: `${z.zona}: ${z.suelo_desnudo_pct} % de las parcelas con suelo desnudo`,
            }))} />
            <ul className="leyenda-niveles en-linea">
              {TRAMOS.map((t, i) => <li key={t}><i style={{ background: RAMPA[i] }} />{t}</li>)}
            </ul>
            <p className="suave">Porcentaje de parcelas con <Termino id="ndvi">NDVI</Termino> menor que {d.umbral_suelo_desnudo.toLocaleString('es-BO')} en la época elegida.</p>
          </div>
          <div className="caja">
            <h2>Zonas prioritarias para cobertura vegetal</h2>
            <ListaMedidores vacio="Ninguna zona publicada tiene NDVI en este período."
              filas={zonas.map((z) => ({ nombre: z.zona, valor: z.suelo_desnudo_pct, cifra: `${z.suelo_desnudo_pct} %`, detalle: `NDVI medio ${n(z.ndvi_medio)} · ${z.parcelas_con_ndvi} parcelas con dato` }))} />
            <button type="button" className="principal" disabled={!zonas.length} onClick={exportar}>Exportar listado de zonas prioritarias (CSV)</button>
            {estado.ok && <p className="exito" role="status">{estado.ok}</p>}
            {estado.error && <p className="error" role="alert">{estado.error}</p>}
            <p className="suave">Muestra: parcelas registradas en Poseidon, un píxel MODIS de 250 m por parcela. No es un barrido de todo el distrito.</p>
            <AvisoPrivacidad d={d} />
          </div>
        </div>
      )}
    </>
  );
}

// ---------- Detalle por parcela (solo con el permiso "ver_todas") ----------
function DetalleParcelas({ d }) {
  const conAlerta = new Set(d.alertas.map((a) => a.id));
  const nasa = d.fuentes_clima['nasa-power'] || 0;
  return (
    <>
      <p className="aviso">Esta vista muestra datos individuales de los agricultores. La ve porque su rol tiene el permiso “ver todas las parcelas”.</p>
      <div className="caja">
        <h2>Mapa de parcelas evaluadas</h2>
        <Mapa alto={340} puntos={d.evaluaciones.map((e) => ({ id: e.id, lat: e.lat, lon: e.lon, alerta: conAlerta.has(e.id), texto: `${e.parcela} · ${e.cliente}` }))} />
        <p className="leyenda"><i className="marca-azul" /> sin alertas <i className="marca-vino" /> con alertas · {nasa} de {d.totales.evaluaciones} evaluaciones con datos de NASA</p>
      </div>
      <div className="caja">
        <h2>Actividad</h2>
        {!d.evaluaciones.length && <p className="suave">Todavía no hay evaluaciones.</p>}
        {d.evaluaciones.length > 0 && (
          <div className="tabla-scroll">
            <table className="tabla apilable">
              <thead><tr><th>Parcela</th><th>Agricultor</th><th>Rotación actual</th><th>Riego (mm)</th><th>Mejor opción</th><th>Estado</th><th>Fecha</th></tr></thead>
              <tbody>
                {d.evaluaciones.map((e) => (
                  <tr key={e.id}>
                    <td data-t="Parcela"><b>{e.parcela}</b></td><td data-t="Agricultor">{e.cliente}</td>
                    <td data-t="Rotación actual">{e.resumen.actual.nombres.join(' → ')}</td>
                    <td data-t="Riego (mm)" className="num">{e.resumen.deficit_agua_mm}</td>
                    <td data-t="Mejor opción">{e.resumen.mejor.nombres.join(' → ')} ({e.resumen.mejor.puntaje})</td>
                    <td data-t="Estado"><Estado estado={e.estado} /></td><td data-t="Fecha">{fecha(e.creado_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
