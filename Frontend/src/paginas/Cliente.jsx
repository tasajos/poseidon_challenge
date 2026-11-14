import { useState } from 'react';
import { api } from '../api.js';
import { Clima, Estrategia, Mapa, Pestanas, Stat, ListaEvaluaciones, Detalle, useDatos, COCHABAMBA } from '../componentes.jsx';

const PRIORIDADES = [
  ['agua', 'Ahorrar agua'], ['suelo', 'Mejorar el suelo'], ['clima', 'Evitar heladas'],
  ['ingreso', 'Ingreso'], ['forraje', 'Forraje'],
];

export default function Cliente() {
  const [vista, setVista] = useState('comparar');
  const [abierta, setAbierta] = useState(null);
  const historial = useDatos(api.evaluaciones);
  const items = historial.datos || [];

  return (
    <>
      <div className="stats">
        <Stat etiqueta="Evaluaciones" valor={items.length} tono="azul" />
        <Stat etiqueta="Revisadas por un técnico" valor={items.filter((e) => e.estado === 'revisada').length} tono="naranja" />
        <Stat etiqueta="Pendientes de revisión" valor={items.filter((e) => e.estado === 'pendiente').length} tono="amarillo" />
      </div>
      <Pestanas valor={vista} onCambiar={(v) => { setVista(v); setAbierta(null); }}
        opciones={[['comparar', 'Comparar rotaciones'], ['historial', 'Mis evaluaciones']]} />
      {vista === 'comparar' && <Comparador onGuardada={historial.recargar} />}
      {vista === 'historial' && (
        <div className="dos-columnas">
          <ListaEvaluaciones items={items} seleccion={abierta} onAbrir={setAbierta}
            vacio="Aún no tiene evaluaciones. Use “Comparar rotaciones” para crear la primera." />
          <div>{abierta ? <Detalle id={abierta} /> : items.length > 0 && <p className="vacio">Elija una evaluación para ver el detalle.</p>}</div>
        </div>
      )}
    </>
  );
}

function Comparador({ onGuardada }) {
  const { datos } = useDatos(api.cultivos);
  const cultivos = datos?.cultivos || [];
  const [punto, setPunto] = useState(COCHABAMBA);
  const [nombre, setNombre] = useState('');
  const [rotacion, setRotacion] = useState(['papa', 'maiz']);
  const [prioridades, setPrioridades] = useState({ agua: 4, suelo: 3, clima: 2, ingreso: 2, forraje: 0 });
  const [resultado, setResultado] = useState(null);
  const [estado, setEstado] = useState({ cargando: false, error: '' });

  const libres = (actual) => cultivos.filter((c) => c.codigo === actual || !rotacion.includes(c.codigo));
  const agregar = () => {
    const libre = cultivos.find((c) => !rotacion.includes(c.codigo));
    if (libre) setRotacion([...rotacion, libre.codigo]);
  };

  async function comparar(e) {
    e.preventDefault();
    setEstado({ cargando: true, error: '' });
    try {
      setResultado(await api.evaluar({ nombre, lat: punto[0], lon: punto[1], rotacion, prioridades }));
      setEstado({ cargando: false, error: '' });
      onGuardada();
    } catch (err) { setEstado({ cargando: false, error: err.message }); }
  }

  return (
    <div className="comparador">
      <form className="caja" onSubmit={comparar}>
        <h2><span className="paso">1</span>Ubique su parcela</h2>
        <p className="suave">Toque el mapa para marcar el lugar.</p>
        <Mapa puntos={[{ id: 'p', lat: punto[0], lon: punto[1] }]} onElegir={setPunto} alto={220} />
        <label className="campo">Nombre de la parcela
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Chacra Tiquipaya" maxLength={80} />
        </label>

        <h2><span className="paso">2</span>¿Qué siembra hoy?</h2>
        <p className="suave">Un cultivo por campaña, en orden.</p>
        {rotacion.map((codigo, i) => (
          <div className="fila" key={i}>
            <select value={codigo} aria-label={`Cultivo ${i + 1}`}
              onChange={(e) => setRotacion(rotacion.map((c, j) => (j === i ? e.target.value : c)))}>
              {libres(codigo).map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
            </select>
            {rotacion.length > 2 && (
              <button type="button" className="quitar" aria-label="Quitar cultivo"
                onClick={() => setRotacion(rotacion.filter((_, j) => j !== i))}>×</button>
            )}
          </div>
        ))}
        {rotacion.length < 4 && <button type="button" className="secundario" onClick={agregar}>+ Añadir cultivo</button>}

        <h2><span className="paso">3</span>¿Qué le importa más?</h2>
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

      <section>
        {!resultado && <p className="vacio">Marque su parcela, indique su rotación y pulse “Comparar rotaciones”.</p>}
        {resultado && (
          <>
            {resultado.fuenteClima === 'demo' && (
              <p className="aviso" role="status">Sin conexión con NASA POWER: se usa un clima de demostración para Cochabamba, no datos de NASA.</p>
            )}
            <Clima meses={resultado.clima} fuente={resultado.fuenteClima} />
            <div className="tarjetas">{resultado.estrategias.map((e) => <Estrategia key={e.tipo} e={e} />)}</div>
            <p className="suave">Un técnico revisará esta evaluación; verá su nota en “Mis evaluaciones”.</p>
          </>
        )}
      </section>
    </div>
  );
}
