import { useState } from 'react';
import { api } from '../api.js';
import { Pestanas, Stat, fecha, useDatos } from '../componentes.jsx';
import { TarjetaOferta, EstadoSolicitud, Contacto, cantidadTexto, unidad } from '../oferta.jsx';

// Agricultor: publica su cosecha (HU-CLI-02) y responde a compradores (HU-CLI-03).
export default function Ventas() {
  const [vista, setVista] = useState('oferta');
  const ofertas = useDatos(api.misOfertas);
  const recibidas = useDatos(api.solicitudesRecibidas);
  const pendientes = (recibidas.datos || []).filter((s) => s.estado === 'pendiente').length;
  const activas = (ofertas.datos?.ofertas || []).filter((o) => o.activa).length;

  return (
    <>
      <div className="stats">
        <Stat etiqueta="Ofertas publicadas" valor={activas} tono="azul" />
        <Stat etiqueta="Solicitudes por responder" valor={pendientes} tono="naranja" />
        <Stat etiqueta="Compradores aceptados" valor={(recibidas.datos || []).filter((s) => s.estado === 'aceptada').length} tono="amarillo" />
      </div>
      <Pestanas valor={vista} onCambiar={setVista}
        opciones={[['oferta', 'Mi oferta'], ['solicitudes', `Solicitudes recibidas${pendientes ? ` (${pendientes})` : ''}`]]} />
      {vista === 'oferta' && <MiOferta datos={ofertas} />}
      {vista === 'solicitudes' && <Recibidas datos={recibidas} />}
    </>
  );
}

const mesActual = () => new Date().toISOString().slice(0, 7);

function MiOferta({ datos: { datos, error, recargar } }) {
  const [form, setForm] = useState(null);
  const [estado, setEstado] = useState({ cargando: false, error: '', ok: '' });
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="cargando">Cargando…</p>;
  const { parcelas, ofertas, unidades } = datos;
  if (!parcelas.length) {
    return <p className="vacio">Para ofertar su cosecha, primero compare rotaciones en “Mi finca”: la oferta muestra a los compradores las prácticas de esa rotación.</p>;
  }

  const f = form || { evaluacion_id: parcelas[0].evaluacion_id, cultivo: parcelas[0].cultivos[0].codigo, cantidad: '', unidad: 'qq', disponible_desde: mesActual(), nota: '' };
  const parcela = parcelas.find((p) => p.evaluacion_id === Number(f.evaluacion_id)) || parcelas[0];
  const poner = (k) => (e) => setForm({ ...f, [k]: e.target.value });

  async function publicar(e) {
    e.preventDefault();
    setEstado({ cargando: true, error: '', ok: '' });
    try {
      await api.publicarOferta({ ...f, evaluacion_id: Number(f.evaluacion_id), cantidad: Number(f.cantidad) });
      setForm(null);
      setEstado({ cargando: false, error: '', ok: 'Oferta publicada. Los compradores ya pueden verla.' });
      recargar();
    } catch (err) { setEstado({ cargando: false, error: err.message, ok: '' }); }
  }

  async function cambiar(o) {
    try { await api.cambiarOferta(o.id, !o.activa); recargar(); }
    catch (err) { setEstado({ cargando: false, error: err.message, ok: '' }); }
  }

  return (
    <div className="dos-columnas">
      <form className="caja" onSubmit={publicar}>
        <h2>Publicar cosecha</h2>
        <p className="suave">Los compradores ven el cultivo, la zona, las prácticas de su rotación y el uso del agua. No ven su parcela exacta ni su correo.</p>
        <label className="campo">Parcela
          <select value={f.evaluacion_id} onChange={(e) => {
            const p = parcelas.find((x) => x.evaluacion_id === Number(e.target.value));
            setForm({ ...f, evaluacion_id: e.target.value, cultivo: p.cultivos[0].codigo });
          }}>
            {parcelas.map((p) => (
              <option key={p.evaluacion_id} value={p.evaluacion_id}>
                {p.parcela} · {p.cultivos.map((c) => c.nombre).join(' → ')}{p.estado === 'revisada' ? ' · verificada' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">Cultivo
          <select value={f.cultivo} onChange={poner('cultivo')}>
            {parcela.cultivos.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
          </select>
        </label>
        <div className="fila">
          <label className="campo crece">Cantidad
            <input type="number" inputMode="decimal" min="0.01" step="0.01" required value={f.cantidad} onChange={poner('cantidad')} />
          </label>
          <label className="campo">Unidad
            <select value={f.unidad} onChange={poner('unidad')}>{unidades.map((u) => <option key={u} value={u}>{unidad(u, 2)}</option>)}</select>
          </label>
        </div>
        <label className="campo">Disponible desde
          <input type="month" required value={f.disponible_desde} onChange={poner('disponible_desde')} />
        </label>
        <label className="campo">Nota para compradores (opcional)
          <input value={f.nota} onChange={poner('nota')} maxLength={300} placeholder="Ej.: variedad, calidad, entrega en la comunidad" />
        </label>
        {parcela.estado !== 'revisada' && <p className="aviso">Esta rotación aún no la revisó un técnico: la oferta aparecerá como “sin verificar”.</p>}
        <button className="principal" disabled={estado.cargando}>{estado.cargando ? 'Publicando…' : 'Publicar oferta'}</button>
        {estado.ok && <p className="exito" role="status">{estado.ok}</p>}
        {estado.error && <p className="error" role="alert">{estado.error}</p>}
      </form>

      <section>
        {!ofertas.length && <p className="vacio">Aún no publicó ofertas.</p>}
        <div className="ofertas">
          {ofertas.map((o) => (
            <TarjetaOferta key={o.id} o={o} extra={!o.activa && <p className="aviso">Pausada: los compradores no la ven.</p>}>
              <p className="suave">Parcela: {o.parcela}</p>
              <button type="button" className="secundario ancho" onClick={() => cambiar(o)}>
                {o.activa ? 'Pausar oferta' : 'Volver a publicar'}
              </button>
            </TarjetaOferta>
          ))}
        </div>
      </section>
    </div>
  );
}

function Recibidas({ datos: { datos, error, recargar } }) {
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="cargando">Cargando…</p>;
  if (!datos.length) return <p className="vacio">Todavía no recibió solicitudes. Cuando un comprador le escriba, le llegará un aviso.</p>;
  return (
    <ul className="solicitudes">
      {datos.map((s) => (
        <li key={s.id} className={`solicitud ${s.estado}`}>
          <div className="solicitud-cabeza">
            <b>{s.comprador}</b>
            <EstadoSolicitud estado={s.estado} />
          </div>
          <p className="suave">
            {s.tipo === 'compra' ? `Quiere comprar ${cantidadTexto(s.cantidad, s.unidad)}` : 'Pide contacto'} de {s.cultivo_nombre.toLowerCase()}
            {' '}(usted ofertó {cantidadTexto(s.cantidad_ofertada, s.unidad)}) · {fecha(s.creado_en)}
          </p>
          <p className="mensaje">{s.mensaje}</p>
          {s.respuesta && <blockquote className="respuesta"><b>Su respuesta</b><p>{s.respuesta}</p></blockquote>}
          {s.estado === 'aceptada' && <Contacto contacto={s.contacto} nombre={s.comprador} />}
          {s.estado === 'pendiente' && <Responder s={s} onListo={recargar} />}
        </li>
      ))}
    </ul>
  );
}

function Responder({ s, onListo }) {
  const [respuesta, setRespuesta] = useState('');
  const [telefono, setTelefono] = useState('');
  const [estado, setEstado] = useState({ cargando: '', error: '' });

  async function responder(decision) {
    setEstado({ cargando: decision, error: '' });
    try {
      await api.responderSolicitud(s.id, { estado: decision, respuesta, telefono: decision === 'aceptada' ? telefono : undefined });
      onListo();
    } catch (err) { setEstado({ cargando: '', error: err.message }); }
  }

  return (
    <div className="form-solicitud">
      <label className="campo">Respuesta (opcional)
        <textarea rows={2} maxLength={1000} value={respuesta} onChange={(e) => setRespuesta(e.target.value)}
          placeholder="Ej.: Puedo entregar en la feria del sábado." />
      </label>
      <label className="campo">Compartir mi teléfono al aceptar (opcional)
        <input type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+591 70000000" autoComplete="tel" />
      </label>
      <p className="suave">Si acepta, el comprador verá su nombre, su correo y el teléfono si lo escribe. Si rechaza, no verá ningún dato suyo.</p>
      <div className="fila-botones">
        <button type="button" className="secundario" disabled={Boolean(estado.cargando)} onClick={() => responder('rechazada')}>
          {estado.cargando === 'rechazada' ? 'Enviando…' : 'Rechazar'}
        </button>
        <button type="button" className="principal" disabled={Boolean(estado.cargando)} onClick={() => responder('aceptada')}>
          {estado.cargando === 'aceptada' ? 'Enviando…' : 'Aceptar y compartir contacto'}
        </button>
      </div>
      {estado.error && <p className="error" role="alert">{estado.error}</p>}
    </div>
  );
}
