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

function Usuarios({ yo }) {
  const { datos, error, recargar } = useDatos(api.usuarios);
  const lista = datos || [];
  const vacio = { nombre: '', email: '', password: '', rol: 'cliente' };
  const [nuevo, setNuevo] = useState(vacio);
  const { accion, avisos } = useAccion(recargar);
  const campo = (k) => (e) => setNuevo({ ...nuevo, [k]: e.target.value });

  function crear(e) {
    e.preventDefault();
    accion(api.crearUsuario(nuevo).then(() => setNuevo(vacio)), 'Usuario creado.');
  }

  return (
    <div className="dos-columnas inversa">
      <div className="caja">
        <h2>Usuarios</h2>
        <p className="suave">El rol define qué vistas y datos ve cada persona. Ajuste lo que puede hacer cada rol en “Roles y permisos”.</p>
        {error && <p className="error">{error}</p>}
        <div className="tabla-scroll">
          <table className="tabla apilable">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acceso</th><th>Alta</th></tr></thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id} className={u.activo ? '' : 'inactivo'}>
                  <td data-t="Nombre"><b>{u.nombre}</b></td><td data-t="Correo">{u.email}</td>
                  <td data-t="Rol">
                    <select value={u.rol} disabled={u.id === yo.id} aria-label={`Rol de ${u.nombre}`}
                      onChange={(e) => accion(api.actualizarUsuario(u.id, { rol: e.target.value }), 'Rol actualizado.')}>
                      {ROLES.map((r) => <option key={r} value={r}>{QUIEN[r]}</option>)}
                    </select>
                  </td>
                  <td data-t="Acceso">
                    <button className="secundario chico" disabled={u.id === yo.id}
                      onClick={() => accion(api.actualizarUsuario(u.id, { activo: !u.activo }), u.activo ? 'Usuario desactivado.' : 'Usuario activado.')}>
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                  <td data-t="Alta">{fecha(u.creado_en)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {avisos}
      </div>

      <form className="caja" onSubmit={crear}>
        <h2>Nuevo usuario</h2>
        <label className="campo">Nombre<input value={nuevo.nombre} onChange={campo('nombre')} maxLength={80} required /></label>
        <label className="campo">Correo<input type="email" value={nuevo.email} onChange={campo('email')} required /></label>
        <label className="campo">Contraseña (mínimo 8 caracteres)
          <input type="password" value={nuevo.password} onChange={campo('password')} minLength={8} autoComplete="new-password" required />
        </label>
        <label className="campo">Rol
          <select value={nuevo.rol} onChange={campo('rol')}>{ROLES.map((r) => <option key={r} value={r}>{QUIEN[r]}</option>)}</select>
        </label>
        <button className="principal">Crear usuario</button>
      </form>
    </div>
  );
}

// Matriz rol × permiso. Cada casilla se guarda al momento y rige en la siguiente petición del usuario.
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
