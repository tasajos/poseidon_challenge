import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Interruptor, fechaHora, useDatos } from '../componentes.jsx';

const CANAL = { web: 'Notificación web', sms: 'SMS' };
const ESTADO = { enviado: 'enviada', simulado: 'simulada', 'sin-dispositivo': 'sin dispositivo', error: 'falló' };

// ---------- Notificaciones web en este dispositivo ----------
const soportaPush = typeof window !== 'undefined'
  && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function claveBytes(base64) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

async function suscripcionActual() {
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

async function activarEnDispositivo(clave) {
  if (await Notification.requestPermission() !== 'granted') {
    throw new Error('El navegador no dio permiso para notificaciones. Actívelo en la configuración del sitio.');
  }
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveBytes(clave) });
  await api.suscribir(sub.toJSON());
}

async function desactivarEnDispositivo() {
  const sub = await suscripcionActual();
  if (!sub) return;
  await api.desuscribir(sub.endpoint);
  await sub.unsubscribe();
}

export default function Alertas() {
  const { datos, error, recargar } = useDatos(api.alertas);
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="cargando">Cargando…</p>;
  return (
    <div className="dos-columnas inversa">
      <div>
        <Preferencias datos={datos} recargar={recargar} />
        <Historial items={datos.historial} />
      </div>
      <div>
        <Dispositivo clave={datos.clave_push} recargar={recargar} />
        <Probar datos={datos} recargar={recargar} />
      </div>
    </div>
  );
}

function Preferencias({ datos, recargar }) {
  const [p, setP] = useState(datos.preferencias);
  const [estado, setEstado] = useState({ ok: '', error: '', cargando: false });
  const cambiar = (k) => (v) => setP({ ...p, [k]: v });

  async function guardar(e) {
    e.preventDefault();
    setEstado({ ok: '', error: '', cargando: true });
    try {
      setP(await api.guardarPreferencias(p));
      setEstado({ ok: 'Preferencias guardadas.', error: '', cargando: false });
      recargar();
    } catch (err) { setEstado({ ok: '', error: err.message, cargando: false }); }
  }

  return (
    <form className="caja" onSubmit={guardar}>
      <h2>Qué alertas recibir</h2>
      <Interruptor marcado={p.helada} onCambiar={cambiar('helada')}
        detalle={`Cuando la mínima diaria baja a ${datos.umbrales.heladaC} °C o menos`}>Helada</Interruptor>
      <Interruptor marcado={p.sequia} onCambiar={cambiar('sequia')}
        detalle={`Cuando en 30 días llueve menos del ${datos.umbrales.sequiaPct} % de lo normal`}>Sequía severa</Interruptor>

      <h2>Cómo recibirlas</h2>
      <Interruptor marcado={p.web} onCambiar={cambiar('web')}
        detalle={datos.dispositivos ? `${datos.dispositivos} dispositivo(s) registrado(s)` : 'Active el dispositivo en el recuadro de al lado'}>
        Notificación web
      </Interruptor>
      <Interruptor marcado={p.sms} onCambiar={cambiar('sms')}
        detalle={datos.sms_configurado ? 'Mensaje de texto a su celular' : 'El servidor aún no tiene SMS configurado: el envío se simula'}>
        SMS
      </Interruptor>
      {p.sms && (
        <label className="campo">Celular con código de país
          <input type="tel" inputMode="tel" value={p.telefono || ''} placeholder="+591 70000000" autoComplete="tel"
            onChange={(e) => setP({ ...p, telefono: e.target.value })} required />
        </label>
      )}
      <button className="principal" disabled={estado.cargando}>{estado.cargando ? 'Guardando…' : 'Guardar preferencias'}</button>
      {estado.ok && <p className="exito" role="status">{estado.ok}</p>}
      {estado.error && <p className="error" role="alert">{estado.error}</p>}
    </form>
  );
}

function Dispositivo({ clave, recargar }) {
  const [activo, setActivo] = useState(null); // null: averiguando
  const [estado, setEstado] = useState({ error: '', cargando: false });

  useEffect(() => {
    if (!soportaPush || !window.isSecureContext) return;
    suscripcionActual().then((s) => setActivo(Boolean(s))).catch(() => setActivo(false));
  }, []);

  async function alternar() {
    setEstado({ error: '', cargando: true });
    try {
      if (activo) await desactivarEnDispositivo(); else await activarEnDispositivo(clave);
      setActivo(!activo);
      setEstado({ error: '', cargando: false });
      recargar();
    } catch (err) { setEstado({ error: err.message, cargando: false }); }
  }

  let aviso = null;
  if (!soportaPush) aviso = 'Este navegador no admite notificaciones web. Use SMS o un navegador actualizado (Chrome, Firefox, Edge; en iPhone, agregue Poseidon a la pantalla de inicio).';
  else if (!window.isSecureContext) aviso = 'Las notificaciones web necesitan una conexión segura (https o localhost). Desde una dirección de la red local no se pueden activar.';

  return (
    <div className="caja">
      <h2>Este dispositivo</h2>
      <p className="suave">Las notificaciones llegan aunque Poseidon esté cerrado, mientras el navegador siga instalado.</p>
      {aviso ? <p className="aviso">{aviso}</p> : (
        <>
          <p className={`dispositivo ${activo ? 'si' : 'no'}`}>
            {activo === null ? 'Comprobando…' : activo ? 'Recibe notificaciones' : 'No recibe notificaciones'}
          </p>
          <button className={activo ? 'secundario' : 'principal'} disabled={estado.cargando || activo === null} onClick={alternar}>
            {estado.cargando ? 'Un momento…' : activo ? 'Dejar de recibir en este dispositivo' : 'Activar notificaciones aquí'}
          </button>
        </>
      )}
      {estado.error && <p className="error" role="alert">{estado.error}</p>}
    </div>
  );
}

function Probar({ datos, recargar }) {
  const [estado, setEstado] = useState({ texto: '', error: '', cargando: '' });

  async function correr(tipo) {
    setEstado({ texto: '', error: '', cargando: tipo });
    try {
      if (tipo === 'prueba') {
        const r = await api.alertaPrueba();
        const partes = r.canales.map((c) => `${CANAL[c.canal]}: ${ESTADO[c.estado] || c.estado}`);
        setEstado({ texto: partes.length ? partes.join(' · ') : 'No tiene canales activos: active la notificación web o el SMS.', error: '', cargando: '' });
      } else {
        const r = await api.revisarAlertas();
        const texto = r.lugares === 0
          ? 'Aún no tiene parcelas. Cree una evaluación en “Mi finca” para que vigilemos ese lugar.'
          : `${r.lugares} lugar(es) revisado(s): ${r.nuevas.length ? `${r.nuevas.length} alerta(s) nueva(s)` : 'sin condiciones críticas nuevas'}.`
            + (r.errores.length ? ` ${r.errores.length} sin datos de NASA POWER por ahora.` : '');
        setEstado({ texto, error: '', cargando: '' });
      }
      recargar();
    } catch (err) { setEstado({ texto: '', error: err.message, cargando: '' }); }
  }

  return (
    <div className="caja">
      <h2>Vigilancia de sus parcelas</h2>
      <p className="suave">
        {datos.lugares
          ? `Vigilamos ${datos.lugares} lugar(es) de sus parcelas${datos.revision.cada_horas ? ` cada ${datos.revision.cada_horas} horas` : ''}.`
          : 'Aún no tiene parcelas registradas.'}
        {' '}Los datos diarios de NASA POWER llegan con 2 a 4 días de retraso y no son un pronóstico: avisan de condiciones ya medidas que suelen repetirse.
      </p>
      <button className="principal" disabled={Boolean(estado.cargando)} onClick={() => correr('revisar')}>
        {estado.cargando === 'revisar' ? 'Consultando NASA POWER…' : 'Revisar mis parcelas ahora'}
      </button>
      <button className="secundario ancho" disabled={Boolean(estado.cargando)} onClick={() => correr('prueba')}>
        {estado.cargando === 'prueba' ? 'Enviando…' : 'Enviar alerta de prueba'}
      </button>
      {estado.texto && <p className="exito" role="status">{estado.texto}</p>}
      {estado.error && <p className="error" role="alert">{estado.error}</p>}
    </div>
  );
}

function Historial({ items }) {
  return (
    <div className="caja">
      <h2>Alertas recibidas</h2>
      {!items.length && <p className="suave">Todavía no recibió alertas.</p>}
      <ul className="alertas">
        {items.map((a) => (
          <li key={a.id} className={a.tipo}>
            <b>{a.titulo}</b>
            <span>{a.mensaje}</span>
            <small>
              {fechaHora(a.creado_en)}
              {a.canales.length ? ` · ${a.canales.map((c) => `${CANAL[c.canal]} ${ESTADO[c.estado] || c.estado}`).join(', ')}` : ' · solo en la plataforma'}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}
