import { useState } from 'react';
import { api } from '../api.js';
import { Interruptor, Mapa, Pestanas, Stat, fecha, useDatos } from '../componentes.jsx';
import { TarjetaOferta, EstadoSolicitud, Contacto, PRACTICAS_CORTAS, cantidadTexto } from '../oferta.jsx';

// Cooperativa o mercado local: oferta sostenible con filtros (HU-CLI-02) y solicitudes de compra (HU-CLI-03).
export default function Comprador() {
  const [vista, setVista] = useState('oferta');
  const enviadas = useDatos(api.solicitudesEnviadas);
  const lista = enviadas.datos || [];
  const pendientes = lista.filter((s) => s.estado === 'pendiente').length;

  return (
    <>
      <div className="stats">
        <Stat etiqueta="Solicitudes enviadas" valor={lista.length} tono="azul" />
        <Stat etiqueta="Esperando respuesta" valor={pendientes} tono="amarillo" />
        <Stat etiqueta="Aceptadas" valor={lista.filter((s) => s.estado === 'aceptada').length} tono="naranja" detalle="con datos de contacto" />
      </div>
      <Pestanas valor={vista} onCambiar={setVista}
        opciones={[['oferta', 'Oferta disponible'], ['solicitudes', `Mis solicitudes${pendientes ? ` (${pendientes})` : ''}`]]} />
      {vista === 'oferta' && <Oferta onEnviada={enviadas.recargar} />}
      {vista === 'solicitudes' && <Solicitudes datos={enviadas} />}
    </>
  );
}

const SIN_FILTROS = { cultivos: [], practicas: [], verificada: false, sello: false, agua: '', zona: '' };

function Oferta({ onEnviada }) {
  const [filtros, setFiltros] = useState(SIN_FILTROS);
  const [abierta, setAbierta] = useState(null); // oferta con el formulario de solicitud abierto
  const { datos, error, recargar } = useDatos(() => api.ofertas(filtros), [JSON.stringify(filtros)]);
  const poner = (k, v) => setFiltros({ ...filtros, [k]: v });
  const alternar = (k, valor) => poner(k, filtros[k].includes(valor) ? filtros[k].filter((x) => x !== valor) : [...filtros[k], valor]);
  const activos = filtros.cultivos.length + filtros.practicas.length + (filtros.verificada ? 1 : 0) + (filtros.sello ? 1 : 0) + (filtros.agua ? 1 : 0) + (filtros.zona ? 1 : 0);

  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="cargando">Cargando…</p>;
  const { ofertas, total, opciones } = datos;
  const cultivos = opciones.cultivos.filter((c) => c.n > 0 || filtros.cultivos.includes(c.codigo)).sort((a, b) => b.n - a.n);

  return (
    <div className="dos-columnas">
      <aside className="caja filtros">
        <h2>Filtrar oferta {activos > 0 && <button type="button" className="secundario chico" onClick={() => setFiltros(SIN_FILTROS)}>Quitar filtros ({activos})</button>}</h2>

        <h3>Cultivo</h3>
        {!cultivos.length && <p className="suave">Aún no hay cultivos ofertados.</p>}
        <div className="chips" role="group" aria-label="Cultivos">
          {cultivos.map((c) => (
            <button key={c.codigo} type="button" aria-pressed={filtros.cultivos.includes(c.codigo)}
              className={filtros.cultivos.includes(c.codigo) ? 'activa' : ''} onClick={() => alternar('cultivos', c.codigo)}>
              {c.nombre} <small>{c.n}</small>
            </button>
          ))}
        </div>

        <h3>Prácticas de rotación aplicadas</h3>
        <p className="suave">Calculadas con la rotación registrada de cada parcela; se exigen todas las marcadas.</p>
        {Object.entries(PRACTICAS_CORTAS).map(([k, texto]) => (
          <Interruptor key={k} marcado={filtros.practicas.includes(k)} onCambiar={() => alternar('practicas', k)}
            detalle={opciones.practicas[k]}>{texto}</Interruptor>
        ))}
        <Interruptor marcado={filtros.verificada} onCambiar={(v) => poner('verificada', v)}
          detalle="Un técnico de Poseidon revisó la rotación de la parcela">Solo verificadas por un técnico</Interruptor>

        <h3>Uso eficiente del agua</h3>
        <Interruptor marcado={filtros.sello} onCambiar={(v) => poner('sello', v)}
          detalle="Al menos 15 % menos riego que la rotación tradicional">Solo con sello de Gestión Hídrica Sostenible</Interruptor>
        <div className="chips" role="group" aria-label="Uso eficiente del agua">
          {[['', 'Cualquiera'], ['media', 'Medio o alto'], ['alta', 'Solo alto']].map(([v, t]) => (
            <button key={v} type="button" aria-pressed={filtros.agua === v} className={filtros.agua === v ? 'activa' : ''}
              onClick={() => poner('agua', v)}>{t}</button>
          ))}
        </div>

        <label className="campo">Zona
          <select value={filtros.zona} onChange={(e) => poner('zona', e.target.value)}>
            <option value="">Todas las zonas</option>
            {Object.entries(opciones.zonas).sort((a, b) => b[1] - a[1]).map(([z, n]) => <option key={z} value={z}>{z} ({n})</option>)}
          </select>
        </label>
        <p className="suave nota-zona">La zona es el municipio más cercano a la parcela; el mapa muestra una ubicación aproximada.</p>
      </aside>

      <section>
        <p className="resultado-filtros" role="status">
          {total === 0 ? 'No hay ofertas registradas por ahora. Aparecerán aquí cuando los agricultores publiquen su cosecha.' : `${ofertas.length} de ${total} ofertas`}
          {ofertas.length > 1 && ' · ordenadas por uso eficiente del agua'}
        </p>
        {ofertas.length > 0 && (
          <div className="caja">
            <Mapa alto={240} puntos={ofertas.map((o) => ({ id: o.id, lat: o.lat, lon: o.lon, texto: `${o.cultivo_nombre} · ${o.zona}` }))} />
          </div>
        )}
        {total > 0 && !ofertas.length && <p className="vacio">Ninguna oferta cumple todos los filtros. Pruebe quitando alguno.</p>}
        <div className="ofertas">
          {ofertas.map((o) => (
            <TarjetaOferta key={o.id} o={o}>
              {o.solicitud_pendiente
                ? <p className="exito">Ya envió una solicitud: espere la respuesta en “Mis solicitudes”.</p>
                : abierta === o.id
                  ? <FormSolicitud o={o} onCerrar={() => setAbierta(null)} onEnviada={() => { setAbierta(null); recargar(); onEnviada(); }} />
                  : <button type="button" className="principal" onClick={() => setAbierta(o.id)}>Contactar al productor</button>}
            </TarjetaOferta>
          ))}
        </div>
      </section>
    </div>
  );
}

function FormSolicitud({ o, onCerrar, onEnviada }) {
  const [tipo, setTipo] = useState('compra');
  const [cantidad, setCantidad] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [estado, setEstado] = useState({ cargando: false, error: '' });

  async function enviar(e) {
    e.preventDefault();
    setEstado({ cargando: true, error: '' });
    try {
      await api.solicitar({ oferta_id: o.id, tipo, cantidad: cantidad === '' ? undefined : Number(cantidad), mensaje });
      onEnviada();
    } catch (err) { setEstado({ cargando: false, error: err.message }); }
  }

  return (
    <form className="form-solicitud" onSubmit={enviar}>
      <fieldset className="opciones">
        <legend>¿Qué quiere hacer?</legend>
        <label><input type="radio" name={`tipo-${o.id}`} checked={tipo === 'compra'} onChange={() => setTipo('compra')} /> Intención de compra</label>
        <label><input type="radio" name={`tipo-${o.id}`} checked={tipo === 'contacto'} onChange={() => setTipo('contacto')} /> Solo pedir contacto</label>
      </fieldset>
      <label className="campo">Cantidad {tipo === 'compra' ? `(${o.unidad})` : `(${o.unidad}, opcional)`}
        <input type="number" inputMode="decimal" min="0.01" step="0.01" max={1e7} value={cantidad}
          onChange={(e) => setCantidad(e.target.value)} required={tipo === 'compra'} placeholder={`Ofertado: ${cantidadTexto(o.cantidad, o.unidad)}`} />
      </label>
      <label className="campo">Mensaje para el productor
        <textarea rows={3} maxLength={1000} minLength={10} required value={mensaje} onChange={(e) => setMensaje(e.target.value)}
          placeholder="Quiénes son, para cuándo lo necesitan, precio o condiciones de entrega…" />
      </label>
      <p className="suave">El mensaje llega por Poseidon. Su correo y el del productor solo se comparten si él acepta.</p>
      <div className="fila-botones">
        <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
        <button className="principal" disabled={estado.cargando}>{estado.cargando ? 'Enviando…' : 'Enviar solicitud'}</button>
      </div>
      {estado.error && <p className="error" role="alert">{estado.error}</p>}
    </form>
  );
}

function Solicitudes({ datos: { datos, error, recargar } }) {
  const [aviso, setAviso] = useState({ ok: '', error: '' });
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="cargando">Cargando…</p>;
  if (!datos.length) return <p className="vacio">Aún no envió solicitudes. Use “Contactar al productor” en una oferta.</p>;

  async function retirar(id) {
    try { await api.retirarSolicitud(id); setAviso({ ok: 'Solicitud retirada.', error: '' }); recargar(); }
    catch (err) { setAviso({ ok: '', error: err.message }); }
  }

  return (
    <>
      {aviso.ok && <p className="exito" role="status">{aviso.ok}</p>}
      {aviso.error && <p className="error" role="alert">{aviso.error}</p>}
      <ul className="solicitudes">
        {datos.map((s) => (
          <li key={s.id} className={`solicitud ${s.estado}`}>
            <div className="solicitud-cabeza">
              <b>{s.cultivo_nombre} · {s.zona}</b>
              <EstadoSolicitud estado={s.estado} />
            </div>
            <p className="suave">
              {s.tipo === 'compra' ? `Intención de compra: ${cantidadTexto(s.cantidad, s.unidad)}` : 'Pedido de contacto'}
              {' · '}{s.productor} · enviada el {fecha(s.creado_en)}
            </p>
            <p className="mensaje">{s.mensaje}</p>
            {s.respuesta && <blockquote className="respuesta"><b>Respuesta del productor</b><p>{s.respuesta}</p></blockquote>}
            {s.estado === 'aceptada' && <Contacto contacto={s.contacto} nombre={s.productor} />}
            {s.estado === 'pendiente' && (
              <button type="button" className="secundario chico" onClick={() => retirar(s.id)}>Retirar solicitud</button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
