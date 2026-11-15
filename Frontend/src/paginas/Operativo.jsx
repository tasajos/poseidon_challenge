import { useState } from 'react';
import { api } from '../api.js';
import { Pestanas, Stat, ListaEvaluaciones, Detalle, NO_DISPONIBLE, SEMILLAS, fecha, puede, useDatos } from '../componentes.jsx';
import FichaParcela, { EtiquetaErosion } from '../Ficha.jsx';

// Técnico de campo: parcelas asignadas y su ficha (HU-OPT-01), revisión con observación local (HU-OPT-04),
// visitas de asistencia (HU-OPT-03) e historial de validaciones por distrito.
export default function Operativo({ usuario }) {
  const asiste = puede(usuario, 'asistencia');
  const [vista, setVista] = useState('parcelas');
  const [paraVisita, setParaVisita] = useState(null);
  const asignadas = useDatos(() => api.parcelas('asignadas'));
  const evaluaciones = useDatos(api.evaluaciones);
  const catalogo = useDatos(api.cultivos);
  const parcelas = asignadas.datos?.parcelas || [];
  const todas = evaluaciones.datos || [];
  const pendientes = todas.filter((e) => e.estado === 'pendiente');

  return (
    <>
      <div className="stats">
        <Stat etiqueta="Parcelas asignadas" valor={parcelas.length} tono="azul" />
        <Stat etiqueta="Por revisar" valor={pendientes.length} tono="naranja" />
        <Stat etiqueta="Revisadas" valor={todas.length - pendientes.length} tono="amarillo" />
        <Stat etiqueta="Agricultores a su cargo" valor={new Set(parcelas.map((p) => p.usuario_id)).size} tono="vino" />
      </div>
      <Pestanas valor={vista} onCambiar={setVista} opciones={[
        ['parcelas', 'Mis parcelas'], ['revision', `Revisión${pendientes.length ? ` (${pendientes.length})` : ''}`],
        ...(asiste ? [['visitas', 'Visitas'], ['validaciones', 'Validaciones']] : []),
      ]} />
      {vista === 'parcelas' && (
        <MisParcelas datos={asignadas} cultivos={catalogo.datos?.cultivos || []}
          onVisita={asiste ? (id) => { setParaVisita(id); setVista('visitas'); } : undefined} />
      )}
      {vista === 'revision' && <Revisiones datos={evaluaciones} validar={asiste} />}
      {vista === 'visitas' && <Visitas parcelas={parcelas} inicial={paraVisita} />}
      {vista === 'validaciones' && <Validaciones />}
    </>
  );
}

function MisParcelas({ datos: { datos, error }, cultivos, onVisita }) {
  const [abierta, setAbierta] = useState(null);
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="cargando">Cargando…</p>;
  if (!datos.parcelas.length) return <p className="vacio">Aún no tiene parcelas asignadas. El administrador las asigna, o se reparten solas cuando un agricultor registra su parcela.</p>;
  return (
    <div className="dos-columnas">
      <ul className="lista">
        {datos.parcelas.map((p) => (
          <li key={p.id}>
            <button className={`item ${abierta === p.id ? 'activo' : ''}`} onClick={() => setAbierta(p.id)}>
              <span className="item-cabeza"><b>{p.nombre}</b><span className="codigo">{p.codigo}</span></span>
              <span className="item-rotacion">{p.agricultor}</span>
              <span className="item-pie">{p.zona} · {p.cultivo_nombre || `cultivo ${NO_DISPONIBLE.toLowerCase()}`}{p.etapa_texto ? ` · ${p.etapa_texto}` : ''}</span>
              {p.erosion && p.erosion !== 'bajo' && <EtiquetaErosion riesgo={p.erosion} />}
            </button>
          </li>
        ))}
      </ul>
      <div>
        {abierta ? (
          <>
            {onVisita && <button type="button" className="principal sin-margen" onClick={() => onVisita(abierta)}>Registrar una visita a esta parcela</button>}
            <FichaParcela key={abierta} id={abierta} cultivos={cultivos} opciones={datos} />
          </>
        ) : <p className="vacio">Elija una parcela para preparar la visita: verá su ficha agroclimática y las observaciones existentes.</p>}
      </div>
    </div>
  );
}

function Revisiones({ datos: { datos, error, recargar }, validar }) {
  const [vista, setVista] = useState('pendiente');
  const [abierta, setAbierta] = useState(null);
  const items = (datos || []).filter((e) => e.estado === vista);
  return (
    <>
      {error && <p className="error">{error}</p>}
      <div className="chips" role="group" aria-label="Estado de las evaluaciones">
        {[['pendiente', 'Por revisar'], ['revisada', 'Revisadas']].map(([k, t]) => (
          <button key={k} type="button" aria-pressed={vista === k} className={vista === k ? 'activa' : ''} onClick={() => { setVista(k); setAbierta(null); }}>{t}</button>
        ))}
      </div>
      <div className="dos-columnas con-margen">
        <ListaEvaluaciones items={items} seleccion={abierta} onAbrir={setAbierta} conCliente
          vacio={vista === 'pendiente' ? 'No hay evaluaciones por revisar en sus parcelas.' : 'Aún no hay evaluaciones revisadas.'} />
        <div>
          {abierta
            ? <Detalle id={abierta} key={abierta} validar={validar}>{(e) => e.estado === 'pendiente' && <Revision id={e.id} onLista={() => { setAbierta(null); recargar(); }} />}</Detalle>
            : items.length > 0 && <p className="vacio">Elija una evaluación. En la tabla comparativa puede escribir su observación local para cada estrategia.</p>}
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

// ---------- Visitas (HU-OPT-03) ----------
const hoy = () => new Date().toISOString().slice(0, 10);
const mesLargo = (am) => new Date(`${am}-15T12:00:00Z`).toLocaleDateString('es-BO', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function Visitas({ parcelas, inicial }) {
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const { datos, error, recargar } = useDatos(() => api.visitas(rango), [rango.desde, rango.hasta]);
  const [v, setV] = useState({ parcela_id: inicial || parcelas[0]?.id || '', fecha: hoy(), observaciones: '' });
  const [estado, setEstado] = useState({ cargando: false, error: '', ok: '' });
  const parcelaId = v.parcela_id || parcelas[0]?.id || ''; // las parcelas pueden llegar después de abrir la pestaña

  async function guardar(e) {
    e.preventDefault();
    setEstado({ cargando: true, error: '', ok: '' });
    try {
      await api.registrarVisita({ ...v, parcela_id: Number(parcelaId) });
      setV({ ...v, observaciones: '' });
      setEstado({ cargando: false, error: '', ok: 'Visita registrada.' });
      recargar();
    } catch (err) { setEstado({ cargando: false, error: err.message, ok: '' }); }
  }
  const exportar = () => api.exportarVisitas(rango).then((nombre) => setEstado({ cargando: false, error: '', ok: `Se descargó ${nombre}.` }))
    .catch((err) => setEstado({ cargando: false, error: err.message, ok: '' }));
  const elegida = parcelas.find((p) => p.id === Number(parcelaId));

  return (
    <div className="dos-columnas">
      <form className="caja" onSubmit={guardar}>
        <h2>Registrar visita</h2>
        {!parcelas.length ? <p className="aviso">Necesita tener parcelas asignadas para registrar visitas.</p> : (
          <>
            <label className="campo">Parcela visitada <span className="obligatorio">(obligatorio)</span>
              <select value={parcelaId} required onChange={(e) => setV({ ...v, parcela_id: e.target.value })}>
                {parcelas.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.agricultor}</option>)}
              </select>
            </label>
            {elegida && <p className="suave">Agricultor visitado: <b>{elegida.agricultor}</b> · {elegida.zona}</p>}
            <label className="campo">Fecha <span className="obligatorio">(obligatorio)</span>
              <input type="date" required max={hoy()} value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} />
            </label>
            <label className="campo">Observaciones de asesoramiento <span className="obligatorio">(obligatorio)</span>
              <textarea rows={4} required minLength={10} maxLength={2000} value={v.observaciones} onChange={(e) => setV({ ...v, observaciones: e.target.value })}
                placeholder="Qué se revisó, qué se recomendó y qué queda pendiente" />
            </label>
            <button className="principal" disabled={estado.cargando}>{estado.cargando ? 'Guardando…' : 'Guardar visita'}</button>
          </>
        )}
        {estado.ok && <p className="exito" role="status">{estado.ok}</p>}
        {estado.error && <p className="error" role="alert">{estado.error}</p>}
      </form>

      <section>
        <div className="caja">
          <h2>Resumen de actividades de campo</h2>
          <div className="fila filtros-fecha">
            <label className="campo">Desde<input type="date" value={rango.desde} max={rango.hasta || hoy()} onChange={(e) => setRango({ ...rango, desde: e.target.value })} /></label>
            <label className="campo">Hasta<input type="date" value={rango.hasta} min={rango.desde} max={hoy()} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} /></label>
          </div>
          {error && <p className="error">{error}</p>}
          {datos && (
            <>
              <div className="stats compactas">
                <Stat etiqueta="Visitas" valor={datos.resumen.total} tono="azul" />
                <Stat etiqueta="Agricultores" valor={datos.resumen.agricultores} tono="naranja" />
                <Stat etiqueta="Parcelas" valor={datos.resumen.parcelas} tono="amarillo" />
              </div>
              {datos.resumen.por_mes.length > 0 && (
                <p className="suave">Por mes: {datos.resumen.por_mes.map((m) => `${mesLargo(m.nombre)}: ${m.n}`).join(' · ')}</p>
              )}
              <button type="button" className="secundario" disabled={!datos.resumen.total} onClick={exportar}>Exportar resumen (CSV para Excel)</button>
            </>
          )}
        </div>
        {datos && !datos.visitas.length && <p className="vacio">No hay visitas registradas en este período.</p>}
        <ul className="solicitudes">
          {(datos?.visitas || []).map((x) => (
            <li key={x.id} className="solicitud aceptada">
              <div className="solicitud-cabeza"><b>{x.agricultor}</b><span className="suave">{fecha(`${x.fecha}T12:00:00`)}</span></div>
              <p className="suave">{x.parcela || 'Parcela eliminada'}{x.zona ? ` · ${x.zona}` : ''}</p>
              <p className="mensaje">{x.observaciones}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------- Historial de validaciones por distrito (HU-OPT-04) ----------
const ESTRATEGIA = { actual: 'Rotación actual', ajuste: 'Ajuste', cambio: 'Cambio mayor' };

function Validaciones() {
  const { datos, error } = useDatos(() => api.validaciones());
  const [zona, setZona] = useState('');
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="cargando">Cargando…</p>;
  if (!datos.validaciones.length) return <p className="vacio">Aún no registró validaciones. Abra una evaluación en “Revisión” y escriba su observación local en la tabla comparativa.</p>;
  const lista = datos.validaciones.filter((v) => !zona || v.zona === zona);
  return (
    <>
      <div className="chips" role="group" aria-label="Zona o distrito">
        <button type="button" aria-pressed={zona === ''} className={zona === '' ? 'activa' : ''} onClick={() => setZona('')}>Todas <small>{datos.validaciones.length}</small></button>
        {datos.por_zona.map((z) => (
          <button key={z.zona} type="button" aria-pressed={zona === z.zona} className={zona === z.zona ? 'activa' : ''} onClick={() => setZona(z.zona)}>
            {z.zona} <small>{z.total}</small>
          </button>
        ))}
      </div>
      {datos.por_zona.some((z) => z.sin_semilla > 0) && (
        <p className="aviso con-margen">Zonas donde se reportó que no se consigue semilla: {datos.por_zona.filter((z) => z.sin_semilla).map((z) => `${z.zona} (${z.sin_semilla})`).join(', ')}.</p>
      )}
      <ul className="solicitudes con-margen">
        {lista.map((v) => (
          <li key={v.id} className="solicitud">
            <div className="solicitud-cabeza">
              <b>{v.zona} · {v.parcela || 'Parcela'}</b>
              {v.semillas && <span className={`etiqueta semillas-${v.semillas}`}>{SEMILLAS[v.semillas]}</span>}
            </div>
            <p className="suave">{ESTRATEGIA[v.estrategia] || v.estrategia}{v.rotacion ? `: ${v.rotacion.join(' → ')}` : ''} · {v.tecnico} · {fecha(v.creado_en)}</p>
            <p className="mensaje">{v.observacion}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
