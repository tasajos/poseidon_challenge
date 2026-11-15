// Ficha de una parcela: lo que declaró el agricultor, lo que aportan NASA y GAMC (con fecha y fuente),
// su historial y las observaciones de campo. La usan el agricultor y el técnico asignado.
import { useEffect, useState } from 'react';
import { api } from './api.js';
import { Clima, Estado, Mapa, NO_DISPONIBLE, ObservacionTecnico, fecha, useDatos } from './componentes.jsx';
import { GraficaNdvi } from './graficas.jsx';
import { Termino } from './Termino.jsx';

const ORIGEN = { agricultor: 'Agricultor', nasa: 'NASA', gamc: 'GAMC' };
const EROSION = { bajo: 'Riesgo de erosión bajo', medio: 'Riesgo de erosión medio', alto: 'Alerta: riesgo de erosión alto' };
const ADOPTADA = { actual: 'mantiene su rotación', ajuste: 'eligió el ajuste', cambio: 'eligió el cambio mayor' };
const dato = (v, sufijo = '') => (v === null || v === undefined || v === '' ? <span className="no-disponible">{NO_DISPONIBLE}</span> : `${v}${sufijo}`);
const ha = (v) => (v === null || v === undefined ? null : Number(v).toLocaleString('es-BO', { maximumFractionDigits: 2 }));

export function EtiquetaErosion({ riesgo }) {
  if (!riesgo) return null;
  return <span className={`etiqueta erosion-${riesgo}`}>{EROSION[riesgo]}</span>;
}

// propia: la ve su dueño (puede corregir datos y registrar ciclos). cultivos: catálogo para los formularios.
export default function FichaParcela({ id, propia = false, cultivos = [], opciones, onComparar, onCambio }) {
  const { datos: f, error, recargar } = useDatos(() => api.parcela(id), [id]);
  const consultando = ['en_cola', 'consultando'].includes(f?.ndvi.estado?.estado);
  // Mientras MODIS responde en segundo plano, la ficha se actualiza sola.
  useEffect(() => {
    if (!consultando) return undefined;
    const t = setInterval(recargar, 6000);
    return () => clearInterval(t);
  }, [consultando]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="error">{error}</p>;
  if (!f) return <p className="cargando">Cargando la parcela…</p>;
  const p = f.parcela;
  const alCambiar = () => { recargar(); onCambio?.(); };

  return (
    <div className="ficha-parcela">
      <div className="caja">
        <div className="detalle-cabeza">
          <div>
            <h2>{p.nombre} <small>{p.codigo}</small></h2>
            <p className="suave">{p.zona} · {p.lat.toFixed(5)}, {p.lon.toFixed(5)}{!propia && p.agricultor ? ` · ${p.agricultor}` : ''}</p>
          </div>
          <EtiquetaErosion riesgo={f.terreno.riesgo} />
        </div>
        <Mapa alto={220} zoom={15} centro={[p.lat, p.lon]} perimetro={p.perimetro || undefined}
          puntos={p.perimetro ? [] : [{ id: 'p', lat: p.lat, lon: p.lon, texto: p.nombre }]} />
        <h3>Datos que dio el agricultor</h3>
        <dl className="ficha">
          <dt>Cultivo actual</dt><dd>{dato(p.cultivo_nombre)}</dd>
          <dt>Etapa</dt><dd>{dato(p.etapa_texto)}</dd>
          <dt>Superficie</dt><dd>{dato(ha(p.superficie_ha), ' ha')}</dd>
          <dt>Riego</dt><dd>{dato(p.riego_texto)}</dd>
          <dt>Técnico asignado</dt><dd>{p.tecnico || <span className="no-disponible">Sin asignar</span>}</dd>
        </dl>
        {propia && <Corregir p={p} cultivos={cultivos} opciones={opciones} onLista={alCambiar} />}
        {onComparar && <button type="button" className="principal" onClick={() => onComparar(p.id)}>Comparar rotaciones para esta parcela</button>}
      </div>

      <div className="caja">
        <h2><Termino id="pendiente">Pendiente y erosión</Termino> <small>{f.terreno.fuente || 'NASA SRTM'}</small></h2>
        {f.terreno.disponible ? (
          <>
            <div className={`sello-terreno riesgo-${f.terreno.riesgo}`}>
              <b>{f.terreno.pendiente_pct.toLocaleString('es-BO')} %</b>
              <span>
                <strong>{EROSION[f.terreno.riesgo]}</strong>
                <small>Pendiente del terreno · {Math.round(f.terreno.elevacion_m).toLocaleString('es-BO')} m sobre el nivel del mar</small>
              </span>
            </div>
            <p>{f.terreno.explicacion}</p>
            {f.terreno.sugeridos.length > 0 && (
              <>
                <h3>Cultivos que protegen la ladera</h3>
                <ul className="chips-info">{f.terreno.sugeridos.map((c) => <li key={c.codigo}><b>{c.nombre}</b> {c.motivo}</li>)}</ul>
              </>
            )}
            <p className="suave">{f.terreno.nota}</p>
          </>
        ) : <p className="aviso">{f.terreno.motivo}</p>}
      </div>

      <div className="caja">
        <h2>Historial de cosechas</h2>
        <Ciclos id={p.id} ciclos={f.ciclos} propia={propia} cultivos={cultivos} onLista={alCambiar} />
        <h3><Termino id="ndvi">Verdor de la parcela (NDVI)</Termino> <small>NASA MODIS</small></h3>
        <Ndvi id={p.id} ndvi={f.ndvi} onPedido={recargar} />
        <h3>Comparaciones de rotación</h3>
        {!f.evaluaciones.length && <p className="suave">Aún no se compararon rotaciones para esta parcela.</p>}
        <ul className="linea-tiempo">
          {f.evaluaciones.map((e) => (
            <li key={e.id}>
              <span className="fecha-linea">{fecha(e.creado_en)}</span>
              <b>{e.rotacion.join(' → ')}</b> <Estado estado={e.estado} />
              <small>Puntaje {e.puntaje} · riego {e.riego_mm} mm{e.adoptada ? ` · ${ADOPTADA[e.adoptada]}${e.adoptada !== 'actual' && e.adoptada_nombres ? `: ${e.adoptada_nombres.join(' → ')}` : ''}` : ''}</small>
              {e.nota_tecnico && <small>Nota del técnico: {e.nota_tecnico}</small>}
            </li>
          ))}
        </ul>
      </div>

      <Clima meses={f.clima.meses} fuente={f.clima.fuente} />

      <div className="caja">
        <h2>Observaciones de campo</h2>
        <h3>Visitas técnicas</h3>
        {!f.visitas.length && <p className="suave">Sin visitas registradas.</p>}
        <ul className="linea-tiempo">
          {f.visitas.map((v) => <li key={v.id}><span className="fecha-linea">{fecha(`${v.fecha}T12:00:00`)}</span><b>{v.tecnico}</b><small>{v.observaciones}</small></li>)}
        </ul>
        <h3><Termino id="presion-plagas">Plagas y enfermedades a menos de 5 km</Termino></h3>
        {!f.incidencias_cerca.length && <p className="suave">Sin reportes cercanos en el último año.</p>}
        <ul className="linea-tiempo">
          {f.incidencias_cerca.map((i) => (
            <li key={i.id}><span className="fecha-linea">{fecha(i.creado_en)}</span><b>{i.agente}</b>
              <small>{i.tipo}, severidad {i.severidad} · a {i.distancia_km.toLocaleString('es-BO')} km · {i.estado === 'activa' ? 'activa' : 'controlada'}</small></li>
          ))}
        </ul>
        {f.validaciones.length > 0 && (
          <>
            <h3>Observaciones locales sobre las estrategias</h3>
            {f.validaciones.map((v) => <ObservacionTecnico key={v.id} v={v} />)}
          </>
        )}
      </div>

      <div className="caja">
        <h2>De dónde sale cada dato</h2>
        <ul className="fuentes">
          {f.fuentes.map((x) => (
            <li key={x.dato} className={x.disponible ? '' : 'falta'}>
              <span className={`etiqueta origen-${x.origen}`}>{ORIGEN[x.origen]}</span>
              <span><b>{x.dato}</b>
                <small>{x.disponible ? (x.fecha ? `Disponible · ${fecha(x.fecha)}` : 'Disponible') : x.limitacion}</small></span>
            </li>
          ))}
        </ul>
        <p className="suave">{f.nota}</p>
      </div>
    </div>
  );
}

function Corregir({ p, cultivos, opciones, onLista }) {
  const [abierto, setAbierto] = useState(false);
  const [v, setV] = useState(null);
  const [estado, setEstado] = useState({ error: '', aviso: '' });
  if (!abierto) return <button type="button" className="secundario" onClick={() => { setV({ nombre: p.nombre, superficie_ha: p.superficie_ha ?? '', cultivo_actual: p.cultivo_actual || '', etapa: p.etapa || '', riego: p.riego || '' }); setAbierto(true); }}>Corregir estos datos</button>;
  const poner = (k) => (e) => setV({ ...v, [k]: e.target.value });
  async function guardar(e) {
    e.preventDefault();
    try {
      const r = await api.corregirParcela(p.id, v);
      setEstado({ error: '', aviso: r.avisos.join(' ') });
      setAbierto(false);
      onLista();
    } catch (err) { setEstado({ error: err.message, aviso: '' }); }
  }
  return (
    <form className="form-solicitud" onSubmit={guardar}>
      <CamposParcela v={v} poner={poner} cultivos={cultivos} opciones={opciones} />
      <div className="fila-botones">
        <button type="button" className="secundario" onClick={() => setAbierto(false)}>Cancelar</button>
        <button className="principal">Guardar cambios</button>
      </div>
      {estado.error && <p className="error" role="alert">{estado.error}</p>}
    </form>
  );
}

// Campos declarados por el agricultor. Lo que no sabe queda como "No disponible".
export function CamposParcela({ v, poner, cultivos, opciones }) {
  return (
    <>
      <label className="campo">Nombre de la parcela <span className="obligatorio">(obligatorio)</span>
        <input value={v.nombre} onChange={poner('nombre')} required maxLength={80} placeholder="Ej.: Chacra Tiquipaya" />
      </label>
      <label className="campo">Cultivo actual
        <select value={v.cultivo_actual} onChange={poner('cultivo_actual')}>
          <option value="">No sé / {NO_DISPONIBLE.toLowerCase()}</option>
          {cultivos.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
        </select>
      </label>
      <label className="campo">Superficie en hectáreas
        <input type="number" inputMode="decimal" min="0.01" step="0.01" max="5000" value={v.superficie_ha} onChange={poner('superficie_ha')} placeholder="Déjelo vacío si no la conoce" />
      </label>
      <label className="campo">Etapa del cultivo
        <select value={v.etapa} onChange={poner('etapa')}>
          <option value="">No sé / {NO_DISPONIBLE.toLowerCase()}</option>
          {Object.entries(opciones?.etapas || {}).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
      </label>
      <label className="campo">Disponibilidad de agua para riego
        <select value={v.riego} onChange={poner('riego')}>
          <option value="">No sé / {NO_DISPONIBLE.toLowerCase()}</option>
          {Object.entries(opciones?.riegos || {}).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
      </label>
    </>
  );
}

function Ciclos({ id, ciclos, propia, cultivos, onLista }) {
  const vacio = { anio: new Date().getFullYear() - 1, cultivo: cultivos[0]?.codigo || '', rendimiento: '', nota: '' };
  const [v, setV] = useState(null);
  const [error, setError] = useState('');
  const conRendimiento = ciclos.filter((c) => c.rendimiento !== null);
  const mejor = conRendimiento.length > 1 ? conRendimiento.reduce((a, b) => (b.rendimiento > a.rendimiento ? b : a)) : null;
  const accion = (promesa) => promesa.then(() => { setError(''); setV(null); onLista(); }).catch((e) => setError(e.message));
  return (
    <>
      {!ciclos.length && <p className="suave">{propia ? 'Registre las campañas pasadas para ver qué cultivos rindieron mejor.' : 'El agricultor aún no registró campañas pasadas.'}</p>}
      {mejor && <p className="exito">Mejor rendimiento registrado: {mejor.cultivo_nombre} en {mejor.anio} ({mejor.rendimiento.toLocaleString('es-BO')} qq/ha).</p>}
      {ciclos.length > 0 && (
        <table className="tabla apilable">
          <thead><tr><th>Campaña</th><th>Cultivo</th><th className="num">Rendimiento (qq/ha)</th><th>Nota</th>{propia && <th />}</tr></thead>
          <tbody>
            {ciclos.map((c) => (
              <tr key={c.id}>
                <td data-t="Campaña"><b>{c.anio}</b></td><td data-t="Cultivo">{c.cultivo_nombre}</td>
                <td data-t="Rendimiento (qq/ha)" className="num">{dato(c.rendimiento?.toLocaleString('es-BO'))}</td>
                <td data-t="Nota">{c.nota || '—'}</td>
                {propia && <td data-t=""><button type="button" className="secundario chico" onClick={() => accion(api.borrarCiclo(id, c.id))}>Quitar</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {propia && !v && <button type="button" className="secundario" onClick={() => setV(vacio)}>+ Añadir campaña pasada</button>}
      {propia && v && (
        <form className="form-solicitud" onSubmit={(e) => { e.preventDefault(); accion(api.agregarCiclo(id, { ...v, anio: Number(v.anio) })); }}>
          <div className="fila">
            <label className="campo">Año
              <input type="number" min="1990" max={new Date().getFullYear() + 1} required value={v.anio} onChange={(e) => setV({ ...v, anio: e.target.value })} />
            </label>
            <label className="campo crece">Cultivo
              <select value={v.cultivo} onChange={(e) => setV({ ...v, cultivo: e.target.value })}>{cultivos.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}</select>
            </label>
          </div>
          <label className="campo">Rendimiento en quintales por hectárea (opcional)
            <input type="number" inputMode="decimal" min="0.1" step="0.1" value={v.rendimiento} onChange={(e) => setV({ ...v, rendimiento: e.target.value })} />
          </label>
          <label className="campo">Nota (opcional)
            <input maxLength={300} value={v.nota} onChange={(e) => setV({ ...v, nota: e.target.value })} placeholder="Ej.: heló en floración, poca lluvia" />
          </label>
          <div className="fila-botones">
            <button type="button" className="secundario" onClick={() => setV(null)}>Cancelar</button>
            <button className="principal">Guardar campaña</button>
          </div>
        </form>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </>
  );
}

const TENDENCIA = {
  mejora: 'El verdor de la época húmeda viene subiendo: hay más cobertura o cultivos más vigorosos.',
  baja: 'El verdor de la época húmeda viene bajando: conviene revisar el suelo, el agua y la rotación.',
  estable: 'El verdor de la época húmeda se mantiene parecido de un año a otro.',
};

function Ndvi({ id, ndvi, onPedido }) {
  const [error, setError] = useState('');
  const e = ndvi.estado?.estado;
  const pedir = () => api.pedirNdvi(id).then(() => { setError(''); onPedido(); }).catch((err) => setError(err.message));
  if (!ndvi.disponible && !ndvi.resumen.length) return <p className="aviso">La consulta de NDVI está desactivada en este servidor.</p>;
  return (
    <>
      {(e === 'en_cola' || e === 'consultando') && (
        <p className="aviso" role="status">Consultando el satélite MODIS de la NASA{ndvi.estado.avance ? ` (${ndvi.estado.avance})` : ''}. Tarda unos minutos; esta ficha se actualiza sola.</p>
      )}
      {e === 'error' && <p className="aviso">No se pudo consultar MODIS ahora ({ndvi.estado.error}). {ndvi.resumen.length ? 'Se muestran los valores ya guardados.' : 'Puede volver a intentarlo más tarde.'}</p>}
      {ndvi.resumen.length > 0 ? (
        <>
          <GraficaNdvi resumen={ndvi.resumen} umbral={ndvi.umbral_desnudo} />
          <p>{ndvi.tendencia ? `${TENDENCIA[ndvi.tendencia.sentido]} (${ndvi.tendencia.anios} años de datos).` : 'Hacen falta al menos 3 años de datos para hablar de una tendencia.'}</p>
        </>
      ) : !e && <p className="suave">Todavía no hay valores guardados para esta parcela.</p>}
      <p className="suave">{ndvi.nota} Fuente: {ndvi.fuente}.{ndvi.actualizado_en ? ` Guardado el ${fecha(ndvi.actualizado_en)}.` : ''}</p>
      {ndvi.disponible && e !== 'en_cola' && e !== 'consultando' && (
        <button type="button" className="secundario chico" onClick={pedir}>{ndvi.resumen.length ? 'Buscar datos más recientes' : 'Consultar NDVI ahora'}</button>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </>
  );
}
