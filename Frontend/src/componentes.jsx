import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import { api } from './api.js';
import { Termino } from './Termino.jsx';

const CRITERIOS = { agua: 'Agua', clima: 'Heladas', suelo: 'Suelo', ingreso: 'Ingreso', forraje: 'Forraje' };
export const COCHABAMBA = [-17.3895, -66.1568];
export const fecha = (d) => new Date(d).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });
export const fechaHora = (d) => new Date(d).toLocaleString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const puede = (usuario, permiso) => Boolean(usuario?.permisos?.includes(permiso));

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

function Clic({ onElegir }) {
  useMapEvents({ click: (e) => onElegir([e.latlng.lat, e.latlng.lng]) });
  return null;
}

// puntos: [{ id, lat, lon, texto, alerta }]. Con onElegir, el mapa permite marcar un punto.
export function Mapa({ puntos = [], onElegir, alto = 240 }) {
  return (
    <MapContainer center={puntos[0] ? [puntos[0].lat, puntos[0].lon] : COCHABAMBA} zoom={10}
      className={`mapa ${onElegir ? 'elegible' : ''}`} style={{ height: alto }}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {onElegir && <Clic onElegir={onElegir} />}
      {puntos.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lon]} radius={9}
          pathOptions={{ color: '#fff', weight: 2, fillColor: p.alerta ? '#7A1F3D' : '#1E4E8C', fillOpacity: 1 }}>
          {p.texto && <Tooltip>{p.texto}</Tooltip>}
        </CircleMarker>
      ))}
    </MapContainer>
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
export function Detalle({ id, children }) {
  const { datos: e, error } = useDatos(() => api.evaluacion(id), [id]);
  if (error) return <p className="error">{error}</p>;
  if (!e) return <p className="cargando">Cargando…</p>;
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
      <div className="tarjetas">{e.resultado.map((x) => <Estrategia key={x.tipo} e={x} />)}</div>
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

export function Estrategia({ e }) {
  return (
    <article className={`tarjeta ${e.tipo}`}>
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
      <ul>{e.porque.map((t) => <li key={t}>{t}</li>)}</ul>
      <h4>Evidencia</h4>
      <ul>
        <li><Termino id="riego">Riego necesario</Termino>: <b>{e.evidencia.deficit_agua_mm} mm</b> por campaña (demanda {e.evidencia.demanda_agua_mm} mm)</li>
        <li><Termino id="suelo-desnudo">Suelo desnudo</Termino>: <b>{e.evidencia.meses_suelo_desnudo} meses</b> al año</li>
        {e.detalle.map((d) => (
          <li key={d.codigo}>{d.nombre}: {d.siembra}–{d.cosecha}, riego {d.deficit_mm} mm
            {d.meses_helada.length > 0 && `, helada en ${d.meses_helada.join(', ')}`}</li>
        ))}
      </ul>
      <h4>Riesgos a revisar</h4>
      <ul>{e.riesgos.map((t) => <li key={t}>{t}</li>)}</ul>
      <details>
        <summary>Lo que este análisis no sabe</summary>
        <ul>{e.vacios.map((t) => <li key={t}>{t}</li>)}</ul>
      </details>
    </article>
  );
}

export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#FAC748" />
      <path d="M20 9c5 5 7 9 7 13a7 7 0 0 1-14 0c0-4 2-8 7-13z" fill="#1E4E8C" />
      <path d="M8 29c4-3 8-3 12 0s8 3 12 0" fill="none" stroke="#7A1F3D" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
