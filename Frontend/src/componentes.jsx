import { createContext, lazy, Suspense, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { Termino } from './Termino.jsx';

const CRITERIOS = { agua: 'Agua', clima: 'Heladas', suelo: 'Suelo', ingreso: 'Ingreso', forraje: 'Forraje' };
export const COCHABAMBA = [-17.3895, -66.1568];
export const fecha = (d) => new Date(d).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });
export const fechaHora = (d) => new Date(d).toLocaleString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const puede = (usuario, permiso) => Boolean(usuario?.permisos?.includes(permiso));
export const SEMILLAS = { disponible: 'Hay semilla en la zona', limitada: 'Semilla escasa o cara', no_disponible: 'No se consigue en la zona' };
export const NO_DISPONIBLE = 'No disponible';

// Modo de bajo consumo (HU-USR-06): sin mapas ni tarjetas largas; solo números y la tabla comparativa.
export const ModoLigero = createContext(false);
export const useLigero = () => useContext(ModoLigero);

// Interruptor accesible (checkbox con estilo de botón deslizante).
export function Interruptor({ marcado, onCambiar, children, detalle, disabled }) {
  return (
    <label className={`interruptor ${disabled ? 'apagado' : ''}`}>
      <input type="checkbox" role="switch" checked={marcado} disabled={disabled} onChange={(e) => onCambiar(e.target.checked)} />
      <span className="riel" aria-hidden="true" />
      <span className="texto"><b>{children}</b>{detalle && <small>{detalle}</small>}</span>
    </label>
  );
}

// Carga datos al montar y permite recargar.
export function useDatos(cargar, dependencias = []) {
  const [estado, setEstado] = useState({ datos: null, error: '' });
  const recargar = () => cargar().then((datos) => setEstado({ datos, error: '' }))
    .catch((e) => setEstado((s) => ({ ...s, error: e.message })));
  useEffect(() => { recargar(); }, dependencias); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...estado, recargar };
}

export function Stat({ etiqueta, valor, tono = 'azul', detalle }) {
  return (
    <div className={`stat tono-${tono}`}>
      <b>{valor}</b><span>{etiqueta}</span>{detalle && <small>{detalle}</small>}
    </div>
  );
}

export const Estado = ({ estado }) => <span className={`estado ${estado}`}>{estado === 'revisada' ? 'Revisada' : 'Pendiente'}</span>;

export function Pestanas({ opciones, valor, onCambiar }) {
  return (
    <div className="pestanas" role="tablist">
      {opciones.map(([clave, texto]) => (
        <button key={clave} role="tab" aria-selected={valor === clave} className={valor === clave ? 'activa' : ''}
          onClick={() => onCambiar(clave)}>{texto}</button>
      ))}
    </div>
  );
}

// Mapa. Leaflet se descarga solo cuando hace falta; en modo de bajo consumo no se muestra.
// Propiedades: ver mapa.jsx.
const MapaReal = lazy(() => import('./mapa.jsx'));
export function Mapa(props) {
  const ligero = useLigero();
  if (ligero) {
    return <p className="mapa-omitido">Mapa oculto en modo de bajo consumo.{props.onElegir ? ' Elija una zona o escriba las coordenadas.' : ''}</p>;
  }
  return (
    <Suspense fallback={<div className="mapa mapa-cargando" style={{ height: props.alto || 240 }}>Cargando mapa…</div>}>
      <MapaReal {...props} />
    </Suspense>
  );
}

export function ListaEvaluaciones({ items, seleccion, onAbrir, conCliente, vacio }) {
  if (!items.length) return <p className="vacio">{vacio}</p>;
  return (
    <ul className="lista">
      {items.map((e) => (
        <li key={e.id}>
          <button className={`item ${seleccion === e.id ? 'activo' : ''}`} onClick={() => onAbrir(e.id)}>
            <span className="item-cabeza"><b>{e.parcela}</b><Estado estado={e.estado} /></span>
            <span className="item-rotacion">{e.resumen.actual.nombres.join(' → ')}</span>
            <span className="item-pie">
              {conCliente && `${e.cliente} · `}{fecha(e.creado_en)} · riego {e.resumen.deficit_agua_mm} mm
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// Detalle de una evaluación guardada. Los hijos (p. ej. el formulario de revisión) van al final.
// adoptar: el dueño puede marcar qué estrategia aplicará. validar: el técnico puede dejar su observación local.
export function Detalle({ id, children, adoptar = false, validar = false }) {
  const { datos: e, error, recargar } = useDatos(() => api.evaluacion(id), [id]);
  const ligero = useLigero();
  const [aviso, setAviso] = useState('');
  if (error) return <p className="error">{error}</p>;
  if (!e) return <p className="cargando">Cargando…</p>;

  const accion = (promesa) => promesa.then(() => { setAviso(''); recargar(); }).catch((err) => setAviso(err.message));
  const onAdoptar = adoptar ? (tipo) => accion(api.adoptar(e.id, tipo)) : undefined;
  const onValidar = validar ? (tipo, cuerpo) => accion(api.validar(e.id, { estrategia: tipo, ...cuerpo })) : undefined;
  return (
    <div className="detalle">
      <div className="detalle-cabeza">
        <div>
          <h2>{e.parcela}</h2>
          <p className="suave">{e.cliente} · {fecha(e.creado_en)} · {e.lat.toFixed(3)}, {e.lon.toFixed(3)}</p>
        </div>
        <Estado estado={e.estado} />
      </div>
      {e.fuente_clima === 'demo' && <p className="aviso">Calculada con clima de demostración, no con datos de NASA.</p>}
      {e.nota_tecnico && (
        <blockquote className="nota-tecnica">
          <b>Nota del técnico{e.revisor ? ` (${e.revisor})` : ''}</b>
          <p>{e.nota_tecnico}</p>
        </blockquote>
      )}
      {aviso && <p className="error" role="alert">{aviso}</p>}
      <TablaComparativa estrategias={e.resultado} validaciones={e.validaciones} adoptada={e.adoptada} onValidar={onValidar} onAdoptar={ligero ? onAdoptar : undefined} />
      {!ligero && (
        <div className="tarjetas">
          {e.resultado.map((x) => <Estrategia key={x.tipo} e={x} adoptada={e.adoptada} onAdoptar={onAdoptar} validaciones={e.validaciones} />)}
        </div>
      )}
      {children && children(e)}
    </div>
  );
}

export function Clima({ meses, fuente }) {
  return (
    <div className="caja">
      <h2>
        <Termino id="climatologia">Clima típico del lugar</Termino>{' '}
        <small>{fuente === 'nasa-power' ? <Termino id="nasa-power">NASA POWER</Termino> : 'demostración'}</small>
      </h2>
      <p className="suave">Toque los nombres con línea punteada para ver qué significan.</p>
      <div className="tabla-scroll">
        <table>
          <thead><tr><th></th>{meses.map((m) => <th key={m.mes}>{m.mes}</th>)}</tr></thead>
          <tbody>
            <tr><th><Termino id="lluvia">Lluvia</Termino> (mm)</th>{meses.map((m) => <td key={m.mes} className={m.seco ? 'seco' : ''}>{Math.round(m.lluvia_mm)}</td>)}</tr>
            <tr><th><Termino id="evapotranspiracion">Evapotranspiración</Termino> (mm)</th>{meses.map((m) => <td key={m.mes}>{Math.round(m.et0_mm)}</td>)}</tr>
            <tr><th><Termino id="temperatura-minima">Mínima</Termino> (°C)</th>{meses.map((m) => <td key={m.mes} className={`helada-${m.helada}`}>{m.tmin}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="leyenda">
        <i className="seco" /> <Termino id="mes-seco">mes seco</Termino>
        <i className="helada-media" /> helada posible <i className="helada-alta" /> helada probable
        {' '}<Termino id="temperatura-minima" soloIcono />
      </p>
    </div>
  );
}

// Última observación del técnico para una estrategia.
const ultimaValidacion = (validaciones, tipo) => (validaciones || []).find((v) => v.estrategia === tipo);

export function ObservacionTecnico({ v }) {
  if (!v) return null;
  return (
    <div className="observacion-tecnico">
      <b>Observación del técnico local{v.tecnico ? ` (${v.tecnico})` : ''}</b>
      {v.semillas && <span className={`etiqueta semillas-${v.semillas}`}>{SEMILLAS[v.semillas]}</span>}
      <p>{v.observacion}</p>
      {v.creado_en && <small>{fecha(v.creado_en)}</small>}
    </div>
  );
}

// Campo editable del técnico dentro de la tabla comparativa (HU-OPT-04).
function FormObservacion({ tipo, previa, onValidar }) {
  const [abierto, setAbierto] = useState(false);
  const [semillas, setSemillas] = useState(previa?.semillas || '');
  const [observacion, setObservacion] = useState('');
  if (!abierto) {
    return <button type="button" className="secundario chico" onClick={() => setAbierto(true)}>{previa ? 'Actualizar observación' : 'Escribir observación'}</button>;
  }
  return (
    <form className="form-observacion" onSubmit={(ev) => { ev.preventDefault(); onValidar(tipo, { semillas: semillas || null, observacion }); setAbierto(false); setObservacion(''); }}>
      <label className="campo">Semilla en la zona
        <select value={semillas} onChange={(ev) => setSemillas(ev.target.value)}>
          <option value="">Sin dato</option>
          {Object.entries(SEMILLAS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
      </label>
      <label className="campo">Observación local
        <textarea rows={3} required minLength={5} maxLength={1000} value={observacion} onChange={(ev) => setObservacion(ev.target.value)}
          placeholder="Dónde conseguir semilla, cuidados para el microclima de la zona…" />
      </label>
      <div className="fila-botones">
        <button type="button" className="secundario chico" onClick={() => setAbierto(false)}>Cancelar</button>
        <button className="principal chico">Guardar</button>
      </div>
    </form>
  );
}

// Comparativa numérica de las estrategias: una columna por estrategia. Es la vista del modo de bajo consumo
// y donde el técnico escribe su observación local.
export function TablaComparativa({ estrategias, validaciones, adoptada, onValidar, onAdoptar }) {
  const mejor = Math.max(...estrategias.map((e) => e.puntaje));
  const fila = (titulo, valor, clase, clave) => (
    <tr className={clase} key={clave}>
      <th scope="row">{titulo}</th>
      {estrategias.map((e) => <td key={e.tipo}>{valor(e)}</td>)}
    </tr>
  );
  const hayAhorro = estrategias.some((e) => e.evidencia.ahorro_agua_pct !== undefined && e.evidencia.ahorro_agua_pct !== null);
  const hayObservaciones = onValidar || estrategias.some((e) => ultimaValidacion(validaciones, e.tipo));
  return (
    <div className="caja comparativa">
      <h2>Comparación de las {estrategias.length} estrategias</h2>
      <div className="tabla-scroll">
        <table className="tabla-comparativa">
          <thead>
            <tr>
              <th />
              {estrategias.map((e) => (
                <th key={e.tipo} scope="col" className={e.puntaje === mejor ? 'mejor' : ''}>
                  {e.titulo}{adoptada === e.tipo && <span className="etiqueta elegida">Elegida</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fila('Rotación', (e) => <b>{e.nombres.join(' → ')}</b>, 'fila-rotacion')}
            {fila(<><Termino id="puntaje">Puntaje</Termino> (0-100)</>, (e) => <b className={e.puntaje === mejor ? 'num-mejor' : ''}>{e.puntaje}</b>)}
            {Object.entries(CRITERIOS).map(([k, t]) => fila(t, (e) => e.puntajes[k], 'fila-criterio', k))}
            {fila(<><Termino id="riego">Riego necesario</Termino> (mm)</>, (e) => e.evidencia.deficit_agua_mm)}
            {fila(<><Termino id="suelo-desnudo">Suelo desnudo</Termino> (meses)</>, (e) => e.evidencia.meses_suelo_desnudo)}
            {hayAhorro && fila(<><Termino id="sello-hidrico">Ahorro de agua</Termino> frente a papa → maíz</>, (e) => (e.evidencia.ahorro_agua_pct > 0 ? `${e.evidencia.ahorro_agua_pct} %` : 'Sin ahorro'))}
            {fila('Riesgos a revisar', (e) => e.riesgos.length)}
            {hayObservaciones && fila('Observación del técnico local', (e) => {
              const v = ultimaValidacion(validaciones, e.tipo);
              return (
                <div className="celda-observacion">
                  {v ? <ObservacionTecnico v={v} /> : <span className="suave">Sin observación</span>}
                  {onValidar && <FormObservacion tipo={e.tipo} previa={v} onValidar={onValidar} />}
                </div>
              );
            }, 'fila-observacion')}
            {onAdoptar && fila('¿Cuál aplicará?', (e) => (
              adoptada === e.tipo
                ? <button type="button" className="secundario chico" onClick={() => onAdoptar(null)}>Quitar elección</button>
                : <button type="button" className="secundario chico" onClick={() => onAdoptar(e.tipo)}>Elegir esta</button>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Estrategia({ e, adoptada, onAdoptar, validaciones }) {
  const elegida = adoptada === e.tipo;
  const t = e.evidencia.terreno;
  const ahorro = e.evidencia.ahorro_agua_pct;
  return (
    <article className={`tarjeta ${e.tipo} ${elegida ? 'elegida' : ''}`}>
      <div className="tarjeta-cabeza">
        <h3>{e.titulo}</h3>
        <div className="puntaje"><b>{e.puntaje}</b><span>/100</span> <Termino id="puntaje" soloIcono /></div>
      </div>
      <p className="secuencia">{e.nombres.join(' → ')}</p>
      <ul className="barras">
        {Object.entries(CRITERIOS).map(([clave, texto]) => (
          <li key={clave}><span>{texto}</span><div className="barra"><div style={{ width: `${e.puntajes[clave]}%` }} /></div><b>{e.puntajes[clave]}</b></li>
        ))}
      </ul>
      <h4>Por qué</h4>
      <ul>{e.porque.map((x) => <li key={x}>{x}</li>)}</ul>
      <h4>Evidencia</h4>
      <ul>
        <li><Termino id="riego">Riego necesario</Termino>: <b>{e.evidencia.deficit_agua_mm} mm</b> por campaña (demanda {e.evidencia.demanda_agua_mm} mm)</li>
        {ahorro !== undefined && ahorro !== null && (
          <li><Termino id="sello-hidrico">Ahorro de agua</Termino>: {ahorro > 0 ? <><b>{ahorro} %</b> menos riego que papa → maíz</> : 'no ahorra frente a papa → maíz'}</li>
        )}
        <li><Termino id="suelo-desnudo">Suelo desnudo</Termino>: <b>{e.evidencia.meses_suelo_desnudo} meses</b> al año</li>
        {t && <li><Termino id="pendiente">Pendiente</Termino>: <b>{t.pendiente_pct} %</b>, riesgo de erosión {t.riesgo}</li>}
        {(e.evidencia.plagas || []).map((p) => (
          <li key={p.familia} className="evidencia-plaga">
            <Termino id="presion-plagas">Plagas reportadas cerca</Termino>: {p.agentes.join(', ')} ({p.familia}, {p.reportes} reporte(s) a {p.distancia_km} km)
          </li>
        ))}
        {e.detalle.map((d) => (
          <li key={d.codigo}>{d.nombre}: {d.siembra}–{d.cosecha}, riego {d.deficit_mm} mm
            {d.meses_helada.length > 0 && `, helada en ${d.meses_helada.join(', ')}`}</li>
        ))}
      </ul>
      <h4>Riesgos a revisar</h4>
      <ul>{e.riesgos.map((x) => <li key={x}>{x}</li>)}</ul>
      <details>
        <summary>Lo que este análisis no sabe</summary>
        <ul>{e.vacios.map((x) => <li key={x}>{x}</li>)}</ul>
      </details>
      <ObservacionTecnico v={ultimaValidacion(validaciones, e.tipo)} />
      {elegida && <p className="exito">Usted eligió aplicar esta rotación.</p>}
      {onAdoptar && (
        <button type="button" className={elegida ? 'secundario ancho' : 'principal'} onClick={() => onAdoptar(elegida ? null : e.tipo)}>
          {elegida ? 'Quitar mi elección' : 'Voy a aplicar esta rotación'}
        </button>
      )}
    </article>
  );
}

