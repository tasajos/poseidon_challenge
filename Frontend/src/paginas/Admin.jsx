import { useState } from 'react';
import { api } from '../api.js';
import { Pestanas, Stat, fecha, fechaHora, puede, useDatos } from '../componentes.jsx';

const ROLES = ['administrador', 'operativo', 'cliente', 'monitoreo', 'comprador'];
const PLURAL = { administrador: 'Administradores', operativo: 'Operativos', cliente: 'Clientes', monitoreo: 'Monitoreo', comprador: 'Compradores' };
const QUIEN = { administrador: 'Administrador', operativo: 'Técnico operativo', cliente: 'Agricultor (cliente)', monitoreo: 'Gestor de monitoreo', comprador: 'Comprador (cooperativa o mercado)' };
const TONO = { administrador: 'vino', operativo: 'naranja', cliente: 'azul', monitoreo: 'amarillo', comprador: 'azul' };
const HELADA = ['Sensible', 'Media', 'Tolerante'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function Admin({ usuario }) {
  const gestiona = puede(usuario, 'usuarios');
  const respalda = puede(usuario, 'respaldos');
  const opciones = [
    gestiona && ['usuarios', 'Usuarios'],
    gestiona && ['permisos', 'Roles y permisos'],
    puede(usuario, 'asignar') && ['asignacion', 'Parcelas y técnicos'],
    gestiona && ['auditoria', 'Auditoría'],
    respalda && ['respaldos', 'Respaldos'],
    ['sistema', 'Sistema'],
    ['catalogo', 'Cultivos'],
  ].filter(Boolean);
  const [vista, setVista] = useState(opciones[0][0]);

  return (
    <>
      {gestiona && <ResumenUsuarios />}
      <Pestanas valor={vista} onCambiar={setVista} opciones={opciones} />
      {vista === 'usuarios' && <Usuarios yo={usuario} />}
      {vista === 'permisos' && <Permisos />}
      {vista === 'asignacion' && <Asignaciones />}
      {vista === 'auditoria' && <Auditoria />}
      {vista === 'respaldos' && <Respaldos />}
      {vista === 'sistema' && <Sistema />}
      {vista === 'catalogo' && <Catalogo />}
    </>
  );
}

function ResumenUsuarios() {
  const { datos } = useDatos(api.usuarios);
  const lista = datos || [];
  return (
    <div className="stats">
      {ROLES.map((r) => (
        <Stat key={r} etiqueta={PLURAL[r]} valor={lista.filter((u) => u.rol === r && u.activo).length} tono={TONO[r]} />
      ))}
    </div>
  );
}

// Ejecuta una acción y muestra su resultado.
function useAccion(recargar) {
  const [mensaje, setMensaje] = useState({ error: '', ok: '' });
  const [ocupado, setOcupado] = useState(false);
  async function accion(promesa, ok) {
    setOcupado(true);
    try { const r = await promesa; setMensaje({ error: '', ok: typeof ok === 'function' ? ok(r) : ok }); recargar?.(); }
    catch (err) { setMensaje({ error: err.message, ok: '' }); }
    finally { setOcupado(false); }
  }
  const avisos = (
    <>
      {mensaje.ok && <p className="exito" role="status">{mensaje.ok}</p>}
      {mensaje.error && <p className="error" role="alert">{mensaje.error}</p>}
    </>
  );
  return { accion, avisos, ocupado };
}

const CON_APROBACION = ['administrador', 'operativo', 'monitoreo'];
const estadoDe = (u) => (u.pendiente ? 'pendiente' : u.activo ? 'activa' : 'inactiva');
const ESTADO_CUENTA = { pendiente: 'Pendiente de aprobación', activa: 'Activa', inactiva: 'Inactiva' };

// Registro y habilitación de cuentas (HU-ADM-01).
function Usuarios({ yo }) {
  const { datos, error, recargar } = useDatos(api.usuarios);
  const lista = datos || [];
  const pendientes = lista.filter((u) => u.pendiente);
  const vacio = { nombre: '', email: '', telefono: '', password: '', rol: 'cliente' };
  const [nuevo, setNuevo] = useState(vacio);
  const [registro, setRegistro] = useState({ ok: '', error: '', campo: '', cargando: false });
  const { accion, avisos } = useAccion(recargar);
  const campo = (k) => (e) => { setNuevo({ ...nuevo, [k]: e.target.value }); if (registro.campo === k) setRegistro({ ...registro, error: '', campo: '' }); };
  const falla = (k) => (registro.campo === k ? { 'aria-invalid': true, 'aria-describedby': 'error-registro' } : {});

  async function crear(e) {
    e.preventDefault();
    setRegistro({ ok: '', error: '', campo: '', cargando: true });
    try {
      const r = await api.crearUsuario(nuevo);
      setNuevo(vacio);
      setRegistro({ ok: r.mensaje, error: '', campo: '', cargando: false });
      recargar();
    } catch (err) { setRegistro({ ok: '', error: err.message, campo: err.campo || '', cargando: false }); }
  }

  return (
    <div className="dos-columnas inversa">
      <div>
        {pendientes.length > 0 && (
          <div className="caja pendientes">
            <h2>Cuentas pendientes de aprobación <small>{pendientes.length}</small></h2>
            <p className="suave">Las cuentas de técnico, gestor y administrador no pueden ingresar hasta que un responsable las aprueba. Si hay otro administrador activo, no puede aprobar las que usted mismo registró.</p>
            <ul className="solicitudes">
              {pendientes.map((u) => (
                <li key={u.id} className="solicitud">
                  <div className="solicitud-cabeza"><b>{u.nombre}</b><span className="estado-solicitud pendiente">{QUIEN[u.rol]}</span></div>
                  <p className="suave">{u.email}{u.telefono ? ` · ${u.telefono}` : ''} · registrada el {fecha(u.creado_en)}{u.creado_por === yo.id ? ' por usted' : ''}</p>
                  <div className="fila-botones">
                    <button type="button" className="secundario" onClick={() => accion(api.aprobarUsuario(u.id, false), `Se rechazó la cuenta de ${u.nombre}.`)}>Rechazar</button>
                    <button type="button" className="principal" onClick={() => accion(api.aprobarUsuario(u.id, true), `Cuenta de ${u.nombre} aprobada: ya puede ingresar.`)}>Aprobar</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="caja">
          <h2>Usuarios</h2>
          <p className="suave">El rol define qué vistas y datos ve cada persona. Ajuste lo que puede hacer cada rol en “Roles y permisos”.</p>
          {error && <p className="error">{error}</p>}
          <div className="tabla-scroll">
            <table className="tabla apilable">
              <thead><tr><th>Nombre</th><th>Contacto</th><th>Rol</th><th>Estado</th><th>Acceso</th><th>Alta</th></tr></thead>
              <tbody>
                {lista.map((u) => (
                  <tr key={u.id} className={u.activo ? '' : 'inactivo'}>
                    <td data-t="Nombre"><b>{u.nombre}</b></td>
                    <td data-t="Contacto">{u.email}{u.telefono && <><br />{u.telefono}</>}</td>
                    <td data-t="Rol">
                      <select value={u.rol} disabled={u.id === yo.id || u.pendiente} aria-label={`Rol de ${u.nombre}`}
                        onChange={(e) => accion(api.actualizarUsuario(u.id, { rol: e.target.value }),
                          (r) => (r.pendiente ? 'Rol actualizado. Como tiene privilegios, la cuenta queda pendiente de aprobación.' : 'Rol actualizado.'))}>
                        {ROLES.map((r) => <option key={r} value={r}>{QUIEN[r]}</option>)}
                      </select>
                    </td>
                    <td data-t="Estado"><span className={`estado-cuenta ${estadoDe(u)}`}>{ESTADO_CUENTA[estadoDe(u)]}</span></td>
                    <td data-t="Acceso">
                      {!u.pendiente && (
                        <button className="secundario chico" disabled={u.id === yo.id}
                          onClick={() => accion(api.actualizarUsuario(u.id, { activo: !u.activo }), u.activo ? 'Usuario desactivado.' : 'Usuario activado.')}>
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </td>
                    <td data-t="Alta">{fecha(u.creado_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {avisos}
        </div>
      </div>

      <form className="caja" onSubmit={crear} noValidate={false}>
        <h2>Registrar usuario</h2>
        <p className="suave">Los campos con <span className="obligatorio">(obligatorio)</span> son necesarios para guardar.</p>
        <label className="campo">Nombre <span className="obligatorio">(obligatorio)</span>
          <input value={nuevo.nombre} onChange={campo('nombre')} maxLength={80} required {...falla('nombre')} />
        </label>
        <label className="campo">Correo <span className="obligatorio">(obligatorio)</span>
          <input type="email" value={nuevo.email} onChange={campo('email')} required autoComplete="off" {...falla('email')} />
          <small className="ayuda">Es el identificador de la cuenta: no puede repetirse.</small>
        </label>
        <label className="campo">Teléfono (opcional)
          <input type="tel" inputMode="tel" value={nuevo.telefono} onChange={campo('telefono')} placeholder="+591 70000000" {...falla('telefono')} />
        </label>
        <label className="campo">Rol <span className="obligatorio">(obligatorio)</span>
          <select value={nuevo.rol} onChange={campo('rol')} {...falla('rol')}>{ROLES.map((r) => <option key={r} value={r}>{QUIEN[r]}</option>)}</select>
        </label>
        {CON_APROBACION.includes(nuevo.rol) && (
          <p className="aviso">Este rol tiene privilegios: la cuenta quedará <b>pendiente</b> hasta que un responsable la apruebe.</p>
        )}
        <label className="campo">Contraseña inicial <span className="obligatorio">(obligatorio)</span>
          <input type="password" value={nuevo.password} onChange={campo('password')} minLength={8} autoComplete="new-password" required {...falla('password')} />
          <small className="ayuda">Mínimo 8 caracteres. No se muestra ni se guarda en la auditoría.</small>
        </label>
        <button className="principal" disabled={registro.cargando}>{registro.cargando ? 'Guardando…' : 'Registrar usuario'}</button>
        {registro.ok && <p className="exito" role="status">{registro.ok}</p>}
        {registro.error && <p className="error" role="alert" id="error-registro">{registro.error}</p>}
      </form>
    </div>
  );
}

// Asignación de parcelas a técnicos (HU-OPT-01).
function Asignaciones() {
  const parcelas = useDatos(() => api.parcelas('todas'));
  const usuarios = useDatos(api.usuarios);
  const { accion, avisos } = useAccion(parcelas.recargar);
  if (parcelas.error) return <p className="error">{parcelas.error}</p>;
  if (!parcelas.datos || !usuarios.datos) return <p className="cargando">Cargando…</p>;
  const tecnicos = usuarios.datos.filter((u) => u.rol === 'operativo' && u.activo);
  const lista = parcelas.datos.parcelas;
  return (
    <div className="caja">
      <h2>Parcelas y técnico asignado</h2>
      <p className="suave">Cada técnico ve solo las parcelas que tiene asignadas. Al registrarse, una parcela se asigna sola al técnico con menos carga; aquí puede cambiarla.</p>
      {!lista.length && <p className="suave">Todavía no hay parcelas registradas.</p>}
      {lista.length > 0 && (
        <div className="tabla-scroll">
          <table className="tabla apilable">
            <thead><tr><th>Parcela</th><th>Agricultor</th><th>Zona</th><th>Técnico asignado</th></tr></thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td data-t="Parcela"><b>{p.nombre}</b> <span className="codigo">{p.codigo}</span></td>
                  <td data-t="Agricultor">{p.agricultor}</td>
                  <td data-t="Zona">{p.zona}</td>
                  <td data-t="Técnico asignado">
                    <select value={p.tecnico_id ?? ''} aria-label={`Técnico de ${p.nombre}`}
                      onChange={(e) => accion(api.asignarParcela(p.id, e.target.value === '' ? null : Number(e.target.value)), `${p.nombre}: asignación actualizada.`)}>
                      <option value="">Sin asignar</option>
                      {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                      {p.tecnico_id && !tecnicos.some((t) => t.id === p.tecnico_id) && <option value={p.tecnico_id}>{p.tecnico} (inactivo)</option>}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {avisos}
    </div>
  );
}

const ACCIONES = {
  'usuario.registrado': 'Registró la cuenta', 'usuario.aprobado': 'Aprobó la cuenta', 'usuario.rechazado': 'Rechazó la cuenta',
  'usuario.rol': 'Cambió el rol de', 'usuario.activado': 'Activó la cuenta', 'usuario.desactivado': 'Desactivó la cuenta',
  'permisos.cambiados': 'Cambió los permisos del rol', 'respaldo.restaurado': 'Restauró el respaldo', 'parcela.asignada': 'Asignó la parcela',
};
const detalleTexto = (d) => (d ? Object.entries(d).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length))
  .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ') : '');

// Registro de auditoría (HU-ADM-01): quién hizo qué. Nunca incluye contraseñas.
function Auditoria() {
  const { datos, error } = useDatos(api.auditoria);
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="cargando">Cargando…</p>;
  return (
    <div className="caja">
      <h2>Auditoría</h2>
      <p className="suave">Registros, aprobaciones, cambios de rol y de permisos, asignaciones y restauraciones. No se guardan contraseñas ni credenciales.</p>
      {!datos.length && <p className="suave">Aún no hay eventos registrados.</p>}
      {datos.length > 0 && (
        <div className="tabla-scroll">
          <table className="tabla apilable">
            <thead><tr><th>Cuándo</th><th>Quién</th><th>Qué hizo</th><th>Detalle</th></tr></thead>
            <tbody>
              {datos.map((a) => (
                <tr key={a.id}>
                  <td data-t="Cuándo">{fechaHora(a.creado_en)}</td>
                  <td data-t="Quién">{a.actor}</td>
                  <td data-t="Qué hizo">{ACCIONES[a.accion] || a.accion} <b>{a.objeto}</b></td>
                  <td data-t="Detalle">{detalleTexto(a.detalle) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Permisos() {
  const { datos, error, recargar } = useDatos(api.permisos);
  const { accion, avisos, ocupado } = useAccion(recargar);
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="cargando">Cargando…</p>;
  const { catalogo, matriz, fijos } = datos;

  function alternar(rol, permiso, valor) {
    const actuales = matriz[rol] || [];
    const nuevos = valor ? [...actuales, permiso] : actuales.filter((p) => p !== permiso);
    accion(api.guardarPermisos(rol, nuevos),
      `${QUIEN[rol]}: ${valor ? 'ahora puede' : 'ya no puede'} ${catalogo[permiso].charAt(0).toLowerCase()}${catalogo[permiso].slice(1)}.`);
  }

  return (
    <div className="caja">
      <h2>Roles y permisos</h2>
      <p className="suave">
        Marque lo que puede hacer cada rol. Las vistas sin permiso desaparecen del menú y el servidor rechaza sus datos,
        incluso para sesiones ya abiertas. La gestión de usuarios del administrador no se puede quitar.
      </p>
      <div className="tabla-scroll">
        <table className="tabla matriz">
          <thead>
            <tr><th>Permiso</th>{ROLES.map((r) => <th key={r} className={`rol-col tono-${TONO[r]}`}>{QUIEN[r]}</th>)}</tr>
          </thead>
          <tbody>
            {Object.entries(catalogo).map(([permiso, texto]) => (
              <tr key={permiso}>
                <th scope="row">{texto}</th>
                {ROLES.map((rol) => {
                  const fijo = fijos[rol]?.includes(permiso);
                  return (
                    <td key={rol} data-t={QUIEN[rol]}>
                      <input type="checkbox" checked={Boolean(matriz[rol]?.includes(permiso))} disabled={fijo || ocupado}
                        aria-label={`${QUIEN[rol]}: ${texto}`} title={fijo ? 'Fijo: evita que el sistema quede sin administración' : undefined}
                        onChange={(e) => alternar(rol, permiso, e.target.checked)} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {avisos}
    </div>
  );
}

const TIPO_RESPALDO = { auto: 'Automático', manual: 'Manual', previo: 'Antes de restaurar' };
const tamano = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

function Respaldos() {
  const { datos, error, recargar } = useDatos(api.respaldos);
  const { accion, avisos, ocupado } = useAccion(recargar);
  const [restaurando, setRestaurando] = useState(null);
  const [confirmacion, setConfirmacion] = useState('');
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="cargando">Cargando…</p>;
  const { estado, respaldos } = datos;

  function restaurar(e) {
    e.preventDefault();
    const nombre = restaurando.nombre;
    accion(api.restaurar(nombre).then((r) => { setRestaurando(null); setConfirmacion(''); return r; }),
      (r) => `Base restaurada a ${fechaHora(restaurando.creado_en)}. El estado anterior quedó guardado como ${r.previo}.`);
  }

  return (
    <div className="dos-columnas inversa">
      <div className="caja">
        <h2>Puntos de restauración</h2>
        {estado.base_datos === 'memoria' && (
          <p className="aviso">Modo memoria: los respaldos sí se guardan en disco y sirven para recuperar los datos tras reiniciar.</p>
        )}
        {!respaldos.length && <p className="suave">Todavía no hay respaldos.</p>}
        <ul className="respaldos">
          {respaldos.map((r) => (
            <li key={r.nombre} className={restaurando?.nombre === r.nombre ? 'activo' : ''}>
              <div>
                <b>{r.valido ? fechaHora(r.creado_en) : r.nombre}</b>
                <span className={`etiqueta ${r.tipo}`}>{TIPO_RESPALDO[r.tipo] || r.tipo}</span>
              </div>
              {r.valido ? (
                <small>
                  {r.conteos.usuarios} usuarios · {r.conteos.parcelas} parcelas · {r.conteos.evaluaciones} evaluaciones · {tamano(r.bytes)}
                  {r.creado_por && r.creado_por !== 'sistema' ? ` · por ${r.creado_por}` : ''}
                </small>
              ) : <small className="problema">No se puede usar: {r.problema}</small>}
              {r.valido && (
                <button className="secundario chico" disabled={ocupado}
                  onClick={() => { setRestaurando(r); setConfirmacion(''); }}>Restaurar…</button>
              )}
            </li>
          ))}
        </ul>
        {avisos}
      </div>

      <div>
        <div className="caja">
          <h2>Respaldo automático</h2>
          <dl className="ficha compacta">
            <dt>Frecuencia</dt><dd>{estado.activo ? `Diario a las ${estado.hora}` : 'Desactivado (BACKUP_HORA)'}</dd>
            {estado.proxima && <><dt>Próximo</dt><dd>{fechaHora(estado.proxima)}</dd></>}
            {estado.ultimo && <><dt>Último</dt><dd>{fechaHora(estado.ultimo.creado_en)}</dd></>}
            <dt>Se conservan</dt><dd>los {estado.retener} automáticos más recientes</dd>
          </dl>
          {estado.ultimo_error && <p className="error">El último respaldo automático falló: {estado.ultimo_error.mensaje}</p>}
          <button className="principal" disabled={ocupado}
            onClick={() => accion(api.crearRespaldo(), (r) => `Respaldo creado: ${r.nombre}`)}>
            {ocupado ? 'Trabajando…' : 'Crear respaldo ahora'}
          </button>
        </div>

        {restaurando && (
          <form className="caja peligro" onSubmit={restaurar}>
            <h2>Restaurar a {fechaHora(restaurando.creado_en)}</h2>
            <p className="suave">
              Se reemplazarán los usuarios, permisos, parcelas, evaluaciones y alertas por los del respaldo.
              Todo lo hecho después de esa fecha se perderá, pero antes se guarda un respaldo del estado actual para poder deshacer.
            </p>
            <label className="campo">Para confirmar, escriba el nombre del respaldo
              <code className="nombre-respaldo">{restaurando.nombre}</code>
              <input value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} autoComplete="off" spellCheck={false} />
            </label>
            <button className="principal peligro" disabled={ocupado || confirmacion !== restaurando.nombre}>
              {ocupado ? 'Restaurando…' : 'Restaurar base de datos'}
            </button>
            <button type="button" className="secundario" onClick={() => setRestaurando(null)}>Cancelar</button>
          </form>
        )}
      </div>
    </div>
  );
}

function Sistema() {
  const { datos: s, error } = useDatos(api.sistema);
  if (error) return <p className="error">{error}</p>;
  if (!s) return <p className="cargando">Cargando…</p>;
  const a = s.alertas;
  return (
    <div className="caja">
      <h2>Estado del sistema</h2>
      <dl className="ficha">
        <dt>Base de datos</dt>
        <dd>{s.base_datos === 'mysql' ? 'MySQL conectado' : 'Modo memoria: los datos se pierden al reiniciar (restaure un respaldo para recuperarlos)'}</dd>
        <dt>Respaldos</dt>
        <dd>{s.respaldos.activo ? `Diarios a las ${s.respaldos.hora}` : 'Automáticos desactivados'}
          {s.respaldos.ultimo && `; último ${fechaHora(s.respaldos.ultimo.creado_en)}`}</dd>
        <dt>Alertas climáticas</dt>
        <dd>
          {a.cada_horas ? `Revisión cada ${a.cada_horas} h con NASA POWER` : 'Revisión automática desactivada (ALERTAS_CADA_HORAS)'}
          {a.ultima && `; última ${fechaHora(a.ultima.en)}: ${a.ultima.lugares} lugares, ${a.ultima.nuevas} alertas nuevas`}
          {a.ultima?.errores > 0 && `, ${a.ultima.errores} sin datos`}
        </dd>
        <dt>Umbrales</dt>
        <dd>Helada: mínima diaria ≤ {a.umbrales.heladaC} °C · Sequía: lluvia de 30 días por debajo del {a.umbrales.sequiaPct} % de lo normal</dd>
        <dt>SMS</dt>
        <dd>{s.sms_configurado ? 'Twilio configurado' : 'Simulado: falta configurar Twilio (TWILIO_* en .env)'}</dd>
        <dt>Fotos de campo</dt>
        <dd className={s.fotos.almacen === 'drive' && !s.fotos.ok ? 'problema' : undefined}>
          {s.fotos.almacen === 'drive'
            ? `Google Drive ${s.fotos.ok ? 'conectado' : 'con problemas'}: ${s.fotos.detalle}`
            : `${s.fotos.detalle} (configure GOOGLE_DRIVE_* en .env)`}
        </dd>
      </dl>
    </div>
  );
}

function Catalogo() {
  const { datos } = useDatos(api.cultivos);
  if (!datos) return <p className="cargando">Cargando…</p>;
  return (
    <div className="caja">
      <h2>Catálogo de cultivos <small>{datos.origen === 'mysql' ? 'desde MySQL' : 'desde archivo'}</small></h2>
      <p className="suave">Valores de referencia aproximados; deben validarse con un agrónomo local.</p>
      <div className="tabla-scroll">
        <table className="tabla apilable">
          <thead><tr><th>Cultivo</th><th>Familia</th><th>Siembra</th><th>Ciclo (días)</th><th>Kc</th><th>Helada</th><th>Aporta</th></tr></thead>
          <tbody>
            {datos.cultivos.map((c) => (
              <tr key={c.codigo}>
                <td data-t="Cultivo"><b>{c.nombre}</b></td><td data-t="Familia">{c.familia}</td><td data-t="Siembra">{MESES[c.mes_siembra - 1]}</td>
                <td data-t="Ciclo (días)" className="num">{c.ciclo_dias}</td><td data-t="Kc" className="num">{c.kc.toFixed(2)}</td>
                <td data-t="Helada">{HELADA[c.tolerancia_helada]}</td>
                <td data-t="Aporta">{[c.fija_nitrogeno && 'nitrógeno', c.raiz_profunda && 'raíz profunda', c.forraje && 'forraje'].filter(Boolean).join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
