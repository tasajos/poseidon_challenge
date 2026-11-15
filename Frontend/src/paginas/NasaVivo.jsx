// NASA en vivo (agricultor): consulta en el momento a NASA POWER, SRTM y MODIS para una de sus parcelas,
// muestra los datos en un tablero y un mapa, y una consola con cada consulta que hizo el servidor.
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Mapa, Stat, fecha, fechaHora, puede, useLigero } from '../componentes.jsx';
import { Termino } from '../Termino.jsx';
import { GraficaTemperaturaDiaria, GraficaLluviaDiaria } from '../graficas.jsx';

const num = (v, dec = 1) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('es-BO', { minimumFractionDigits: dec, maximumFractionDigits: dec }));
const diaCorto = (f) => (f ? new Date(`${f}T12:00:00Z`).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '');
const RIESGO = { bajo: 'Riesgo de erosión bajo', medio: 'Riesgo de erosión medio', alto: 'Riesgo de erosión alto' };

export default function NasaVivo({ usuario, irA }) {
  const [parcelaId, setParcelaId] = useState(null);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [consultando, setConsultando] = useState(false);

  async function cargar(fresco = false, id = parcelaId) {
    setConsultando(true);
    try {
      const d = await api.nasaEnVivo(id, fresco);
      setDatos(d);
      setError('');
      if (d.parcela && d.parcela.id !== id) setParcelaId(d.parcela.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setConsultando(false);
    }
  }
  useEffect(() => { cargar(false, null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const elegir = (id) => { setParcelaId(id); cargar(false, id); };

  // Cuando la consola recibe un NDVI nuevo de MODIS, el tablero se actualiza solo (sin volver a consultar a la NASA).
  const recargarNdvi = useRef(null);
  const alNuevoEvento = (ev) => {
    if (ev.fuente !== 'MODIS' || ev.tipo !== 'descarga') return;
    clearTimeout(recargarNdvi.current);
    recargarNdvi.current = setTimeout(() => cargar(false), 1500);
  };

  if (error && !datos) return <p className="error">{error}</p>;
  if (!datos) return <p className="cargando">Consultando a la NASA…</p>;
  if (!datos.parcelas.length) {
    const puedeRegistrar = puede(usuario, 'evaluar');
    return (
      <div className="caja nasa-sin-parcela">
        <h2>Primero debe crear su parcela</h2>
        <p>Los datos de la NASA (clima, relieve y verdor) se piden para el lugar exacto de su parcela. Todavía no tiene
          ninguna registrada, por eso aquí no hay datos que mostrar.</p>
        {puedeRegistrar ? (
          <>
            <p>Créela en <b>Mi finca</b>: marque su terreno en el mapa y póngale un nombre. Al volver aquí verá sus datos.</p>
            <button type="button" className="principal" onClick={() => irA?.('finca')}>Crear mi parcela</button>
          </>
        ) : (
          <p className="aviso">Su cuenta no tiene permiso para registrar parcelas. Pida al administrador de Poseidon que se lo habilite.</p>
        )}
      </div>
    );
  }
  const { power, terreno, ndvi } = datos;
  return (
    <div className="nasa-vivo">
      <div className="caja nasa-barra">
        {datos.parcelas.length > 1 ? (
          <label className="campo nasa-parcela">Parcela
            <select value={parcelaId ?? ''} onChange={(e) => elegir(Number(e.target.value))} disabled={consultando}>
              {datos.parcelas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
        ) : <p className="nasa-parcela"><span className="suave">Parcela</span><b>{datos.parcela.nombre}</b></p>}
        <button type="button" className="principal" onClick={() => cargar(true)} disabled={consultando}>
          {consultando ? 'Consultando a la NASA…' : 'Consultar ahora a la NASA'}
        </button>
        <p className="suave nasa-hora">
          {power.consultado_en ? <>Datos de clima recibidos el {fechaHora(power.consultado_en)}{power.ms ? ` (la NASA respondió en ${num(power.ms / 1000)} s)` : ''}.</> : null}
        </p>
      </div>
      {datos.aviso && <p className="aviso">{datos.aviso}</p>}
      {error && <p className="error">{error}</p>}

      <Indicadores power={power} terreno={terreno} ndvi={ndvi} />

      <div className="nasa-rejilla">
        <div className="caja">
          <h2>Temperatura de cada día</h2>
          {power.error ? <p className="aviso">NASA POWER no respondió: {power.error}. Pruebe de nuevo en unos minutos.</p> : (
            <>
              <p className="suave">Últimos {power.dias.length} días publicados por <Termino id="nasa-power">NASA POWER</Termino> para el lugar de su parcela.</p>
              <GraficaTemperaturaDiaria dias={power.dias} />
              <h2>Lluvia de cada día</h2>
              <GraficaLluviaDiaria dias={power.dias} />
            </>
          )}
        </div>
        <div className="nasa-lateral">
          <div className="caja">
            <h2>Mapa de sus parcelas</h2>
            <p className="suave">Toque un punto para ver los datos de esa parcela.</p>
            <Mapa alto={260} zoom={12} centro={[datos.parcela.lat, datos.parcela.lon]}
              perimetro={datos.parcelas.find((p) => p.id === datos.parcela.id)?.perimetro || undefined}
              puntos={datos.parcelas.map((p) => ({
                id: p.id, lat: p.lat, lon: p.lon, fijo: p.id === datos.parcela.id,
                color: p.id === datos.parcela.id ? '#cf6f14' : '#1f6b3a', radio: p.id === datos.parcela.id ? 11 : 8,
                texto: p.id === datos.parcela.id && power.resumen
                  ? `${p.nombre}: mín ${num(power.resumen.tmin.valor)} °C · ${terreno.elevacion_m ? `${num(terreno.elevacion_m, 0)} m` : ''}`
                  : p.nombre,
              }))}
              onPunto={(id) => id !== datos.parcela.id && elegir(id)} />
            <p className="suave nasa-coord">Punto consultado: {num(datos.parcela.lat, 4)}, {num(datos.parcela.lon, 4)}</p>
          </div>
          <Consola alNuevoEvento={alNuevoEvento} />
        </div>
      </div>

      <details className="caja nasa-fuentes">
        <summary>¿Qué tan "en vivo" son estos datos?</summary>
        <ul>
          <li><b>NASA POWER</b> (clima): se consulta al pulsar el botón, pero la NASA publica cada día con 2 a 4 días de retraso; la radiación solar y la humedad del suelo pueden tardar algunos días más. Describe un cuadro de unos 50 km, no solo su parcela.</li>
          <li><b>SRTM</b> (relieve): elevación y pendiente medidas por la NASA en el año 2000, en celdas de 30 m. El relieve casi no cambia, por eso se guarda la primera vez.</li>
          <li><b>MODIS</b> (vegetación, <Termino id="ndvi">NDVI</Termino>): un dato cada 16 días en cuadros de 250 m. La primera vez tarda unos minutos; la consola muestra cada año que llega.</li>
        </ul>
      </details>
    </div>
  );
}

function Indicadores({ power, terreno, ndvi }) {
  const r = power.resumen;
  const unidadRad = power.unidades?.ALLSKY_SFC_SW_DWN === 'MJ/m^2/day' ? 'MJ/m² por día' : power.unidades?.ALLSKY_SFC_SW_DWN || '';
  const ndviEstado = ndvi.estado?.estado;
  return (
    <div className="stats nasa-stats">
      {r && (
        <>
          <Stat etiqueta="Mínima del último día" valor={`${num(r.tmin.valor)} °C`} tono={r.tmin.valor <= 0 ? 'vino' : 'azul'}
            detalle={`${diaCorto(r.ultimo_dia)} · publicado hace ${r.retraso_dias} días · la más baja del mes: ${num(r.minima_del_periodo)} °C`} />
          <Stat etiqueta="Máxima del último día" valor={`${num(r.tmax.valor)} °C`} tono="naranja" detalle={diaCorto(r.ultimo_dia)} />
          <Stat etiqueta={`Lluvia en ${r.dias} días`} valor={`${num(r.lluvia_mm, 0)} mm`}
            detalle={r.lluvia_pct === null ? `${r.dias_con_lluvia} días con lluvia` : `${r.lluvia_pct} % de lo normal (${num(r.lluvia_normal_mm, 0)} mm) · ${r.dias_con_lluvia} días con lluvia`} />
          <Stat etiqueta={`Heladas en ${r.dias} días`} valor={r.heladas} tono={r.heladas ? 'vino' : 'azul'}
            detalle={r.heladas ? 'Días con mínima de 0 °C o menos' : 'Ningún día bajó de 0 °C'} />
          {r.humedad && <Stat etiqueta="Humedad del aire" valor={`${num(r.humedad.valor, 0)} %`} detalle={diaCorto(r.humedad.fecha)} />}
          {r.suelo && <Stat etiqueta="Humedad del suelo (raíces)" valor={`${num(r.suelo.valor * 100, 0)} %`} tono="amarillo"
            detalle={`${diaCorto(r.suelo.fecha)} · 0 % seco, 100 % saturado`} />}
          {r.radiacion && <Stat etiqueta="Radiación solar" valor={num(r.radiacion.valor)} detalle={`${unidadRad} · ${diaCorto(r.radiacion.fecha)}`} />}
          {r.viento && <Stat etiqueta="Viento a 2 m" valor={`${num(r.viento.valor)} m/s`} detalle={diaCorto(r.viento.fecha)} />}
        </>
      )}
      <Stat etiqueta="Elevación y pendiente (SRTM)" valor={terreno.disponible ? `${num(terreno.elevacion_m, 0)} m` : '—'} tono="amarillo"
        detalle={terreno.disponible ? `Pendiente ${num(terreno.pendiente_pct)} % · ${RIESGO[terreno.riesgo]}` : 'Aún sin consultar'} />
      <Stat etiqueta="Vegetación (NDVI, MODIS)" valor={ndvi.ultimo ? num(ndvi.ultimo.valor, 2) : '—'} tono={ndvi.ultimo && ndvi.ultimo.valor < ndvi.umbral_desnudo ? 'vino' : 'azul'}
        detalle={ndvi.ultimo
          ? `Compuesto del ${fecha(`${ndvi.ultimo.fecha}T12:00:00Z`)}${ndvi.ultimo.valor < ndvi.umbral_desnudo ? ' · suelo casi desnudo' : ''}`
          : ndviEstado === 'consultando' ? `Descargando de MODIS (${ndvi.estado.avance})…`
            : ndviEstado === 'en_cola' ? 'En cola para descargar…'
              : ndviEstado === 'error' ? `MODIS no respondió: ${ndvi.estado.error}` : 'Sin datos todavía'} />
    </div>
  );
}

// ---------- Consola ----------
const TIPO = {
  descarga: { marca: '↓', texto: 'DESCARGA', clase: 'ok' },
  cache: { marca: '=', texto: 'CACHÉ', clase: 'cache' },
  guardado: { marca: '=', texto: 'GUARDADO', clase: 'cache' },
  cola: { marca: '…', texto: 'EN COLA', clase: 'cola' },
  demo: { marca: '!', texto: 'DEMO', clase: 'falla' },
  error: { marca: '✗', texto: 'ERROR', clase: 'falla' },
};
const horaDe = (d) => new Date(d).toLocaleTimeString('es-BO', { hour12: false });
const MAX_LINEAS = 300;

function Consola({ alNuevoEvento }) {
  const ligero = useLigero();
  const [lineas, setLineas] = useState([]);
  const [pausada, setPausada] = useState(false);
  const [conectada, setConectada] = useState(true);
  const desde = useRef(0);
  const caja = useRef(null);
  const alPie = useRef(true);
  const aviso = useRef(alNuevoEvento);
  aviso.current = alNuevoEvento;

  useEffect(() => {
    if (pausada) return undefined;
    let vivo = true, temporizador = null;
    const intervalo = ligero ? 10000 : 2500;
    const leer = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const r = await api.consolaNasa(desde.current);
          if (!vivo) return;
          setConectada(true);
          if (r.eventos.length) {
            const primeraVez = desde.current === 0;
            desde.current = r.eventos.at(-1).id;
            setLineas((ls) => [...ls, ...r.eventos].slice(-MAX_LINEAS));
            if (!primeraVez) r.eventos.forEach((e) => aviso.current?.(e));
          }
        } catch {
          if (vivo) setConectada(false);
        }
      }
      if (vivo) temporizador = setTimeout(leer, intervalo);
    };
    leer();
    return () => { vivo = false; clearTimeout(temporizador); };
  }, [pausada, ligero]);

  // Baja sola a la última línea, salvo que la persona haya subido a leer.
  useEffect(() => {
    if (alPie.current && caja.current) caja.current.scrollTop = caja.current.scrollHeight;
  }, [lineas]);
  const alDesplazar = () => {
    const c = caja.current;
    alPie.current = c.scrollHeight - c.scrollTop - c.clientHeight < 24;
  };

  const descargas = lineas.filter((l) => l.tipo === 'descarga').length;
  return (
    <section className="caja consola-nasa" aria-labelledby="titulo-consola">
      <div className="consola-cabeza">
        <h2 id="titulo-consola">Consola de la NASA</h2>
        <span className={`consola-estado ${pausada ? 'pausa' : conectada ? 'activa' : 'caida'}`}>
          {pausada ? 'En pausa' : conectada ? 'Escuchando' : 'Sin conexión con el servidor'}
        </span>
      </div>
      <p className="suave">Cada línea es una consulta que el servidor hizo a la NASA por sus acciones: <b>DESCARGA</b> es un dato recién recibido; <b>CACHÉ</b> o <b>GUARDADO</b>, uno recibido antes.</p>
      <div className="consola-pantalla" ref={caja} onScroll={alDesplazar} role="log" aria-live="polite" aria-label="Consultas a la NASA" tabIndex={0}>
        {!lineas.length && <p className="consola-vacia">Esperando consultas… pulse «Consultar ahora a la NASA».</p>}
        {lineas.map((l) => {
          const t = TIPO[l.tipo] || { marca: '·', texto: l.tipo, clase: '' };
          return (
            <p key={l.id} className={`consola-linea ${t.clase}`}>
              <span className="consola-hora">{horaDe(l.en)}</span>{' '}
              <span className={`consola-fuente f-${l.fuente.split(' ').at(-1).toLowerCase()}`}>[{l.fuente}]</span>{' '}
              <span className="consola-tipo">{t.marca} {t.texto}</span>{' '}
              <span>{l.detalle}</span>
              {l.ms !== null && <span className="consola-ms"> · {l.ms < 1000 ? `${l.ms} ms` : `${(l.ms / 1000).toFixed(1)} s`}</span>}
            </p>
          );
        })}
      </div>
      <div className="consola-pie">
        <span className="suave">{lineas.length} consultas · {descargas} descargas</span>
        <button type="button" className="secundario chico" onClick={() => setPausada((p) => !p)}>{pausada ? 'Reanudar' : 'Pausar'}</button>
        <button type="button" className="secundario chico" onClick={() => setLineas([])} disabled={!lineas.length}>Limpiar</button>
      </div>
    </section>
  );
}
