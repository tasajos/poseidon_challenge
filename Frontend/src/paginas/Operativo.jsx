import { useState } from 'react';
import { api } from '../api.js';
import { Pestanas, Stat, ListaEvaluaciones, Detalle, useDatos } from '../componentes.jsx';

export default function Operativo() {
  const { datos, error, recargar } = useDatos(api.evaluaciones);
  const [vista, setVista] = useState('pendiente');
  const [abierta, setAbierta] = useState(null);
  const todas = datos || [];
  const pendientes = todas.filter((e) => e.estado === 'pendiente');
  const items = todas.filter((e) => e.estado === vista);

  return (
    <>
      <div className="stats">
        <Stat etiqueta="Por revisar" valor={pendientes.length} tono="naranja" />
        <Stat etiqueta="Revisadas" valor={todas.length - pendientes.length} tono="azul" />
        <Stat etiqueta="Agricultores atendidos" valor={new Set(todas.map((e) => e.usuario_id)).size} tono="amarillo" />
        <Stat etiqueta="Con riego alto" valor={todas.filter((e) => e.resumen.deficit_agua_mm > 400).length} tono="vino" detalle="más de 400 mm por campaña" />
      </div>
      {error && <p className="error">{error}</p>}
      <Pestanas valor={vista} onCambiar={(v) => { setVista(v); setAbierta(null); }}
        opciones={[['pendiente', `Por revisar (${pendientes.length})`], ['revisada', 'Revisadas']]} />
      <div className="dos-columnas">
        <ListaEvaluaciones items={items} seleccion={abierta} onAbrir={setAbierta} conCliente
          vacio={vista === 'pendiente' ? 'No hay evaluaciones por revisar.' : 'Aún no hay evaluaciones revisadas.'} />
        <div>
          {abierta
            ? <Detalle id={abierta} key={abierta}>{(e) => e.estado === 'pendiente' && <Revision id={e.id} onLista={() => { setAbierta(null); recargar(); }} />}</Detalle>
            : items.length > 0 && <p className="vacio">Elija una evaluación para revisarla.</p>}
        </div>
      </div>
    </>
  );
}

function Revision({ id, onLista }) {
  const [nota, setNota] = useState('');
  const [estado, setEstado] = useState({ cargando: false, error: '' });

  async function guardar(e) {
    e.preventDefault();
    setEstado({ cargando: true, error: '' });
    try { await api.revisar(id, nota); onLista(); }
    catch (err) { setEstado({ cargando: false, error: err.message }); }
  }

  return (
    <form className="caja revision" onSubmit={guardar}>
      <h2>Nota técnica para el agricultor</h2>
      <p className="suave">Indique qué opción recomienda y qué debe verificar en campo.</p>
      <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={4} maxLength={2000} required
        aria-label="Nota técnica" placeholder="Ej.: Recomiendo probar haba en media parcela esta campaña…" />
      <button className="principal" disabled={estado.cargando}>{estado.cargando ? 'Guardando…' : 'Marcar como revisada'}</button>
      {estado.error && <p className="error" role="alert">{estado.error}</p>}
    </form>
  );
}
