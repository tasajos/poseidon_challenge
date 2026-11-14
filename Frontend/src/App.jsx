import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import { getCultivos, evaluar } from './api.js';

const PRIORIDADES = [
  ['agua', 'Ahorrar agua'],
  ['suelo', 'Mejorar el suelo'],
  ['clima', 'Evitar heladas'],
  ['ingreso', 'Ingreso'],
  ['forraje', 'Forraje'],
];
const CRITERIOS = { agua: 'Agua', clima: 'Heladas', suelo: 'Suelo', ingreso: 'Ingreso', forraje: 'Forraje' };

function Selector({ onElegir }) {
  useMapEvents({ click: (e) => onElegir([e.latlng.lat, e.latlng.lng]) });
  return null;
}

export default function App() {
  const [cultivos, setCultivos] = useState([]);
  const [punto, setPunto] = useState([-17.3895, -66.1568]); // Cochabamba
  const [nombre, setNombre] = useState('');
  const [rotacion, setRotacion] = useState(['papa', 'maiz']);
  const [prioridades, setPrioridades] = useState({ agua: 4, suelo: 3, clima: 2, ingreso: 2, forraje: 0 });
  const [resultado, setResultado] = useState(null);
  const [estado, setEstado] = useState({ cargando: false, error: '' });

  useEffect(() => {
    getCultivos().then((r) => setCultivos(r.cultivos))
      .catch(() => setEstado({ cargando: false, error: 'No se pudo conectar con el backend (puerto 3001).' }));
  }, []);

  const cambiarCultivo = (i, valor) => setRotacion(rotacion.map((c, j) => (j === i ? valor : c)));
  const libres = (actual) => cultivos.filter((c) => c.codigo === actual || !rotacion.includes(c.codigo));
  const agregar = () => {
    const libre = cultivos.find((c) => !rotacion.includes(c.codigo));
    if (libre) setRotacion([...rotacion, libre.codigo]);
  };

  async function comparar(e) {
    e.preventDefault();
    setEstado({ cargando: true, error: '' });
    try {
      setResultado(await evaluar({ nombre, lat: punto[0], lon: punto[1], rotacion, prioridades }));
      setEstado({ cargando: false, error: '' });
    } catch (err) {
      setEstado({ cargando: false, error: err.message });
    }
  }

  return (
    <div className="pagina">
      <header>
        <h1>Poseidon</h1>
        <p>Asesor de rotación de cultivos con datos de NASA · Space Apps 2026</p>
      </header>

      <main>
        <form className="panel" onSubmit={comparar}>
          <h2>1. Ubique su parcela</h2>
          <p className="ayuda">Toque el mapa para marcar el lugar.</p>
          <MapContainer center={punto} zoom={10} className="mapa">
            <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Selector onElegir={setPunto} />
            <CircleMarker center={punto} radius={9} pathOptions={{ color: '#1d4d3a', fillColor: '#e0a526', fillOpacity: 1 }} />
          </MapContainer>
          <p className="coord">{punto[0].toFixed(4)}, {punto[1].toFixed(4)}</p>
          <label className="campo">Nombre de la parcela
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Chacra Tiquipaya" maxLength={80} />
          </label>

          <h2>2. ¿Qué siembra hoy?</h2>
          <p className="ayuda">Un cultivo por campaña, en orden.</p>
          {rotacion.map((codigo, i) => (
            <div className="fila" key={i}>
              <span className="orden">{i + 1}</span>
              <select value={codigo} onChange={(e) => cambiarCultivo(i, e.target.value)} aria-label={`Cultivo ${i + 1}`}>
                {libres(codigo).map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
              </select>
              {rotacion.length > 2 && (
                <button type="button" className="quitar" onClick={() => setRotacion(rotacion.filter((_, j) => j !== i))} aria-label="Quitar cultivo">×</button>
              )}
            </div>
          ))}
          {rotacion.length < 4 && <button type="button" className="secundario" onClick={agregar}>+ Añadir cultivo</button>}

          <h2>3. ¿Qué le importa más?</h2>
          {PRIORIDADES.map(([clave, texto]) => (
            <label className="deslizador" key={clave}>
              <span>{texto}</span>
              <input type="range" min="0" max="5" value={prioridades[clave]}
                onChange={(e) => setPrioridades({ ...prioridades, [clave]: Number(e.target.value) })} />
              <b>{prioridades[clave]}</b>
            </label>
          ))}

          <button className="principal" disabled={estado.cargando || !cultivos.length}>
            {estado.cargando ? 'Consultando datos…' : 'Comparar rotaciones'}
          </button>
          {estado.error && <p className="error" role="alert">{estado.error}</p>}
        </form>

        <section className="resultados">
          {!resultado && <p className="vacio">Marque su parcela, indique su rotación y pulse “Comparar rotaciones”.</p>}
          {resultado && (
            <>
              {resultado.fuenteClima === 'demo' && (
                <p className="aviso" role="status">
                  Sin conexión con NASA POWER: se muestran valores de clima de demostración para Cochabamba, no datos de NASA.
                </p>
              )}
              <Clima meses={resultado.clima} fuente={resultado.fuenteClima} />
              <div className="tarjetas">
                {resultado.estrategias.map((e) => <Estrategia key={e.tipo} e={e} />)}
              </div>
              <p className="nota">Esta herramienta apoya la decisión; no reemplaza el criterio del agricultor ni de un técnico agrícola local.</p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function Clima({ meses, fuente }) {
  return (
    <div className="clima">
      <h2>Clima típico del lugar <small>{fuente === 'nasa-power' ? 'NASA POWER' : 'demostración'}</small></h2>
      <div className="tabla-scroll">
        <table>
          <thead><tr><th></th>{meses.map((m) => <th key={m.mes}>{m.mes}</th>)}</tr></thead>
          <tbody>
            <tr><th>Lluvia (mm)</th>{meses.map((m) => <td key={m.mes} className={m.seco ? 'seco' : ''}>{Math.round(m.lluvia_mm)}</td>)}</tr>
            <tr><th>Evapotranspiración (mm)</th>{meses.map((m) => <td key={m.mes}>{Math.round(m.et0_mm)}</td>)}</tr>
            <tr><th>Mínima (°C)</th>{meses.map((m) => <td key={m.mes} className={`helada-${m.helada}`}>{m.tmin}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="leyenda"><i className="seco" /> mes seco <i className="helada-media" /> helada posible <i className="helada-alta" /> helada probable</p>
    </div>
  );
}

function Estrategia({ e }) {
  return (
    <article className={`tarjeta ${e.tipo}`}>
      <div className="cabecera">
        <h3>{e.titulo}</h3>
        <div className="puntaje"><b>{e.puntaje}</b><span>/100</span></div>
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
        <li>Riego necesario: <b>{e.evidencia.deficit_agua_mm} mm</b> por campaña (demanda {e.evidencia.demanda_agua_mm} mm)</li>
        <li>Suelo desnudo: <b>{e.evidencia.meses_suelo_desnudo} meses</b> al año</li>
        <li>Familias: {e.evidencia.familias.join(', ')}</li>
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
