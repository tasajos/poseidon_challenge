import { useRef, useState } from 'react';
import { api } from '../api.js';
import { EmblemaPoseidon } from '../identidad.jsx';
import fondoLogin from '../fondo-login.jpg';
import '../login.css';

// Pantalla de ingreso con el diseño Poseidón de la rama frontend3.
//
// Accesos rápidos por rol: completan el correo de la cuenta de demostración. La contraseña NO está escrita en
// el código: si se define VITE_CLAVE_DEMO (Frontend/.env.local, solo para demostraciones locales) se usa para
// entrar con un toque; si no, el cursor pasa a la contraseña para escribirla.
const CLAVE_DEMO = import.meta.env.VITE_CLAVE_DEMO || '';

const ROLES_ACCESO = [
  {
    id: 'cliente', etiqueta: ['Cliente /', 'Agricultor'], email: 'cliente@poseidon.test',
    icono: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="13" cy="10" r="4.5" fill="currentColor" />
        <path d="M5 25c0-4.4 3.6-8 8-8s8 3.6 8 8H5z" fill="currentColor" />
        <path d="M27 12c0 4-2.5 6.8-6.5 7.2.4-4 3-6.8 6.5-7.2z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'administrador', etiqueta: ['Administrador', 'de Sistema'], email: 'admin@poseidon.test',
    icono: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path fill="currentColor" d="M14.3 4h3.4l.6 2.6a9.2 9.2 0 0 1 2.3 1l2.4-1.3 2.4 2.4-1.3 2.4c.4.7.8 1.5 1 2.3l2.6.6v3.4l-2.6.6a9.2 9.2 0 0 1-1 2.3l1.3 2.4-2.4 2.4-2.4-1.3a9.2 9.2 0 0 1-2.3 1L17.7 28h-3.4l-.6-2.6a9.2 9.2 0 0 1-2.3-1l-2.4 1.3-2.4-2.4 1.3-2.4a9.2 9.2 0 0 1-1-2.3L4.3 17.7v-3.4l2.6-.6c.2-.8.6-1.6 1-2.3L6.6 9l2.4-2.4 2.4 1.3c.7-.4 1.5-.8 2.3-1L14.3 4zm1.7 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
      </svg>
    ),
  },
  {
    id: 'operativo', etiqueta: ['Operativo /', 'Técnico'], email: 'operativo@poseidon.test',
    icono: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path fill="currentColor" d="M22.8 5.2a6.2 6.2 0 0 0-5.7 8.6l-9.9 9.9a2.4 2.4 0 1 0 3.4 3.4l9.9-9.9a6.2 6.2 0 0 0 8.6-5.7c0-.6-.1-1.2-.3-1.7l-3.6 3.6-3.1-.8-.8-3.1 3.6-3.6c-.5-.2-1.1-.3-1.7-.3z" />
      </svg>
    ),
  },
  {
    id: 'monitoreo', etiqueta: ['Monitoreo /', 'Supervisor'], email: 'monitoreo@poseidon.test',
    icono: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="4" y="6" width="24" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="M9 17l4-4 3 2.5 5-5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 22h8l1.5 4h-11L12 22z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'comprador', etiqueta: ['Comprador /', 'Cooperativa'], email: 'comprador@poseidon.test',
    icono: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M4 12h24l-2.4 13.2a2.4 2.4 0 0 1-2.4 2H8.8a2.4 2.4 0 0 1-2.4-2L4 12z" fill="currentColor" />
        <path d="M10.5 12l4-8M21.5 12l-4-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Login({ onIngreso }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const [rolActivo, setRolActivo] = useState('');
  const [ayudaClave, setAyudaClave] = useState(false);
  const [aviso, setAviso] = useState('');
  const [estado, setEstado] = useState({ cargando: false, error: '' });
  const campoClave = useRef(null);
  // En modo de bajo consumo no se descarga la foto de fondo (pesa ~1 MB).
  const ligero = typeof document !== 'undefined' && document.documentElement.classList.contains('ligero');

  async function ejecutarIngreso(correo, clave) {
    setEstado({ cargando: true, error: '' });
    try {
      const respuesta = await api.login(correo, clave);
      onIngreso({ ...respuesta, recordar });
    } catch (err) {
      setEstado({ cargando: false, error: err.message });
    }
  }

  function ingresar(e) {
    e.preventDefault();
    ejecutarIngreso(email, password);
  }

  function seleccionarRol(rol) {
    setRolActivo(rol.id);
    setEmail(rol.email);
    setAyudaClave(false);
    setEstado({ cargando: false, error: '' });
    if (CLAVE_DEMO) {
      setPassword(CLAVE_DEMO);
      setAviso('');
      ejecutarIngreso(rol.email, CLAVE_DEMO);
    } else {
      setPassword('');
      setAviso(`Cuenta de demostración: ${rol.email}. Escriba su contraseña y pulse Ingresar.`);
      campoClave.current?.focus();
    }
  }

  return (
    <div className={`login-pantalla ${ligero ? 'sin-foto' : ''}`} style={ligero ? undefined : { '--fondo-login': `url(${fondoLogin})` }}>
      <div className="login-esquina-sup" aria-hidden="true" />
      <svg className="login-hexagonos" viewBox="0 0 420 110" aria-hidden="true">
        <g stroke="rgba(255,255,255,0.42)" strokeWidth="1.5" fill="rgba(255,255,255,0.12)">
          <polygon points="75,18 110,36 110,74 75,92 40,74 40,36" />
          <polygon points="205,10 242,30 242,70 205,90 168,70 168,30" />
          <polygon points="335,18 370,36 370,74 335,92 300,74 300,36" />
          <line x1="110" y1="55" x2="168" y2="50" strokeDasharray="3 3" />
          <line x1="242" y1="50" x2="300" y2="55" strokeDasharray="3 3" />
        </g>
        <g transform="translate(59, 39)" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" fill="none">
          <rect x="11" y="11" width="10" height="10" transform="rotate(-45 16 16)" />
          <rect x="2" y="14" width="8" height="5" transform="rotate(-45 6 16.5)" />
          <rect x="22" y="13" width="8" height="5" transform="rotate(-45 26 15.5)" />
          <path d="M18 22a6 6 0 0 1 6 6M16 25a3 3 0 0 1 3 3" strokeLinecap="round" />
        </g>
        <g transform="translate(189, 34)" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" fill="none">
          <path d="M16 28V14" strokeLinecap="round" />
          <path d="M16 20c-6 0-10-4-10-10 6 0 10 4 10 10z" />
          <path d="M16 16c5 0 9-3.5 9-9-5 0-9 3.5-9 9z" />
        </g>
        <g transform="translate(319, 38)" fill="rgba(255,255,255,0.72)">
          <rect x="4" y="18" width="4" height="10" rx="1" />
          <rect x="11" y="13" width="4" height="15" rx="1" />
          <rect x="18" y="8" width="4" height="20" rx="1" />
          <rect x="25" y="3" width="4" height="25" rx="1" />
        </g>
      </svg>

      <div className="login-contenedor">
        <section className="login-hero">
          <div className="login-identidad">
            <div className="login-marca-bloque">
              <EmblemaPoseidon className="emblema-hero" />
              <div className="login-marca-texto">
                <span className="login-proyecto">Proyecto</span>
                <h1>Poseidón</h1>
                <div className="login-subrayado" aria-hidden="true"><span /></div>
              </div>
            </div>
            <p className="login-subtitulo">Rotación de cultivos con datos NASA + GAMC</p>
          </div>

          <div className="login-lema-bloque">
            <div className="login-lema-fila">
              <svg className="login-hojas-lema" viewBox="0 0 64 64" aria-hidden="true">
                <path d="M34 52 C14 48, 8 28, 14 12 C28 18, 36 32, 34 52 Z" fill="#7bc658" />
                <path d="M36 52 C34 34, 42 20, 56 16 C56 32, 48 46, 36 52 Z" fill="#438a36" />
              </svg>
              <h2 className="login-lema">
                Innovación agrícola
                <span>para un futuro <b>sostenible</b></span>
              </h2>
            </div>
            <svg className="login-onda-lema" viewBox="0 0 420 28" aria-hidden="true">
              <path d="M6 22 Q130 2 265 15 T412 10" fill="none" stroke="#68b045" strokeWidth="4.5" strokeLinecap="round" />
            </svg>
          </div>

          <ul className="login-pilares" aria-label="Características principales">
            <li>
              <svg viewBox="0 0 40 40" aria-hidden="true">
                <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="15" y="15" width="10" height="10" transform="rotate(-45 20 20)" />
                  <rect x="4" y="17" width="9" height="6" transform="rotate(-45 8.5 20)" />
                  <rect x="27" y="17" width="9" height="6" transform="rotate(-45 31.5 20)" />
                  <path d="M14 26a8 8 0 0 1-8-8M11 29a12 12 0 0 1-11-11" />
                </g>
              </svg>
              <div><span>Datos</span><b>NASA</b></div>
            </li>
            <li>
              <svg viewBox="0 0 40 40" aria-hidden="true">
                <g stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 33h28" />
                  <rect x="9" y="22" width="4" height="11" fill="currentColor" stroke="none" />
                  <rect x="16" y="17" width="4" height="16" fill="currentColor" stroke="none" />
                  <rect x="23" y="12" width="4" height="21" fill="currentColor" stroke="none" />
                  <rect x="30" y="19" width="4" height="14" fill="currentColor" stroke="none" />
                  <path d="M8 16l8-6 6 3 9-8" />
                  <path d="M26 5h5v5" />
                </g>
              </svg>
              <div><span>Análisis</span><b>Inteligente</b></div>
            </li>
            <li>
              <svg viewBox="0 0 40 40" aria-hidden="true">
                <g stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 34V18" />
                  <path d="M20 26c-8 0-13-5-13-13 8 0 13 5 13 13z" />
                  <path d="M20 22c7 0 12-4.5 12-12-7 0-12 4.5-12 12z" />
                  <path d="M12 34h16" />
                </g>
              </svg>
              <div><span>Cultivos</span><b>Más Eficientes</b></div>
            </li>
          </ul>
        </section>

        <section className="login-tarjeta" aria-label="Formulario de inicio de sesión">
          <div className="login-tarjeta-tope">
            <span className="linea-tope" aria-hidden="true" />
            <EmblemaPoseidon className="emblema-tarjeta" />
            <span className="linea-tope" aria-hidden="true" />
          </div>

          <h2 className="login-bienvenida">Bienvenida</h2>
          <p className="login-instruccion">Inicia sesión para continuar</p>

          <form className="login-formulario" onSubmit={ingresar}>
            <label className="login-input-grupo">
              <span className="sr-only">Correo</span>
              <span className="login-icono-input" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <input type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="username" required />
            </label>

            <div className="login-input-grupo">
              <label className="login-clave">
                <span className="sr-only">Contraseña</span>
                <span className="login-icono-input" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="12" cy="16" r="1.4" fill="#fff" />
                  </svg>
                </span>
                <input ref={campoClave} type={mostrarClave ? 'text' : 'password'} placeholder="Contraseña" value={password}
                  onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              </label>
              <button type="button" className="login-ojo" onClick={() => setMostrarClave((v) => !v)}
                aria-label={mostrarClave ? 'Ocultar la clave' : 'Ver la clave'} title={mostrarClave ? 'Ocultar la clave' : 'Ver la clave'}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7z" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                  {!mostrarClave && <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
                </svg>
              </button>
            </div>

            <div className="login-opciones">
              <label className="login-recordar">
                <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
                <span>Recordar sesión</span>
              </label>
              <button type="button" className="login-olvido" onClick={() => setAyudaClave((v) => !v)} aria-expanded={ayudaClave}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {ayudaClave && (
              <p className="login-ayuda" role="status">
                Poseidón todavía no tiene recuperación automática de contraseña. Pida al administrador del sistema que le
                restablezca el acceso.
              </p>
            )}
            {aviso && <p className="login-ayuda" role="status">{aviso}</p>}

            <button type="submit" className="login-boton" disabled={estado.cargando}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 17l5-5-5-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <span>{estado.cargando ? 'Ingresando…' : 'Ingresar'}</span>
            </button>

            {estado.error && <p className="error login-error" role="alert">{estado.error}</p>}
          </form>

          <div className="login-separador" aria-hidden="true">
            <span className="linea-sep" />
            <span className="puntos-sep"><i /><i /><i /></span>
            <span className="linea-sep" />
          </div>

          <p className="login-roles-titulo">Cuentas de demostración</p>
          <div className="login-roles" role="group" aria-label="Cuentas de demostración por rol">
            {ROLES_ACCESO.map((r) => (
              <button key={r.id} type="button" className={`login-rol-btn ${rolActivo === r.id ? 'activo' : ''}`}
                onClick={() => seleccionarRol(r)} disabled={estado.cargando} title={`${r.etiqueta.join(' ')} (${r.email})`}>
                <span className="login-rol-icono">{r.icono}</span>
                <span className="login-rol-texto"><span>{r.etiqueta[0]}</span><span>{r.etiqueta[1]}</span></span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <svg className="login-olas-inf" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,40 C220,120 420,10 740,85 C980,130 1220,90 1440,30 L1440,120 L0,120 Z" fill="rgba(130, 178, 92, 0.72)" />
        <path d="M0,65 C260,135 480,35 820,105 C1060,140 1280,85 1440,55 L1440,120 L0,120 Z" fill="#123f29" />
      </svg>
    </div>
  );
}
