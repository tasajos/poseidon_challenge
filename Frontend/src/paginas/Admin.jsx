import { useState } from 'react';
import { api } from '../api.js';
import { Pestanas, Stat, fecha, useDatos } from '../componentes.jsx';

const ROLES = ['administrador', 'operativo', 'cliente', 'monitoreo'];
const PLURAL = { administrador: 'Administradores', operativo: 'Operativos', cliente: 'Clientes', monitoreo: 'Monitoreo' };
const TONO = { administrador: 'vino', operativo: 'naranja', cliente: 'azul', monitoreo: 'amarillo' };
const HELADA = ['Sensible', 'Media', 'Tolerante'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function Admin({ usuario }) {
  const [vista, setVista] = useState('usuarios');
  const usuarios = useDatos(api.usuarios);
  const tablero = useDatos(api.monitoreo);
  const lista = usuarios.datos || [];
  const t = tablero.datos;

  return (
    <>
      <div className="stats">
        {ROLES.map((r) => (
          <Stat key={r} etiqueta={PLURAL[r]}
            valor={lista.filter((u) => u.rol === r && u.activo).length} tono={TONO[r]} />
        ))}
      </div>
      <Pestanas valor={vista} onCambiar={setVista}
        opciones={[['usuarios', 'Usuarios'], ['sistema', 'Sistema'], ['catalogo', 'Cultivos']]} />

      {vista === 'usuarios' && <Usuarios lista={lista} yo={usuario} error={usuarios.error} recargar={usuarios.recargar} />}
      {vista === 'sistema' && t && (
        <div className="caja">
          <h2>Estado del sistema</h2>
          <dl className="ficha">
            <dt>Base de datos</dt>
            <dd>
              {t.base_datos === 'mysql' && 'MySQL conectado'}
              {t.base_datos === 'sqlite' && 'SQLite conectado (Database/poseidon.db · persistente)'}
              {t.base_datos !== 'mysql' && t.base_datos !== 'sqlite' && 'Modo memoria: los datos se pierden al reiniciar'}
            </dd>
            <dt>Evaluaciones</dt><dd>{t.totales.evaluaciones} en total, {t.totales.pendientes} pendientes de revisión</dd>
            <dt>Clima</dt>
            <dd>{t.fuentes_clima['nasa-power'] || 0} con NASA POWER, {t.fuentes_clima.demo || 0} con clima de demostración</dd>
            <dt>Alertas</dt><dd>{t.totales.alertas} activas</dd>
          </dl>
        </div>
      )}
      {vista === 'catalogo' && <Catalogo />}
    </>
  );
}

function Usuarios({ lista, yo, error, recargar }) {
  const [nuevo, setNuevo] = useState({ nombre: '', email: '', password: '', rol: 'cliente' });
  const [mensaje, setMensaje] = useState({ error: '', ok: '' });
  const campo = (k) => (e) => setNuevo({ ...nuevo, [k]: e.target.value });

  async function accion(promesa, ok) {
    try { await promesa; setMensaje({ error: '', ok }); recargar(); }
    catch (err) { setMensaje({ error: err.message, ok: '' }); }
  }
  function crear(e) {
    e.preventDefault();
    accion(api.crearUsuario(nuevo).then(() => setNuevo({ nombre: '', email: '', password: '', rol: 'cliente' })), 'Usuario creado.');
  }

  return (
    <div className="dos-columnas inversa">
      <div className="caja">
        <h2>Usuarios</h2>
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
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
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
        {mensaje.ok && <p className="exito" role="status">{mensaje.ok}</p>}
        {mensaje.error && <p className="error" role="alert">{mensaje.error}</p>}
      </div>

      <form className="caja" onSubmit={crear}>
        <h2>Nuevo usuario</h2>
        <label className="campo">Nombre<input value={nuevo.nombre} onChange={campo('nombre')} maxLength={80} required /></label>
        <label className="campo">Correo<input type="email" value={nuevo.email} onChange={campo('email')} required /></label>
        <label className="campo">Contraseña (mínimo 8 caracteres)
          <input type="password" value={nuevo.password} onChange={campo('password')} minLength={8} autoComplete="new-password" required />
        </label>
        <label className="campo">Rol
          <select value={nuevo.rol} onChange={campo('rol')}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        </label>
        <button className="principal">Crear usuario</button>
      </form>
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
