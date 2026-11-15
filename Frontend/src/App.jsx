import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api, hayToken, setToken } from './api.js';
import { ModoLigero, puede } from './componentes.jsx';
import { EmblemaPoseidon, Icono, ETIQUETA_ROL } from './identidad.jsx';
import fondoCampo from './fondo-login.jpg';
// La pantalla de ingreso (con su foto y estilos) se descarga solo si hace falta ingresar.
const Login = lazy(() => import('./paginas/Login.jsx'));

// Cada página se descarga cuando se abre: así la primera pantalla pesa poco (HU-USR-06).
const Cliente = lazy(() => import('./paginas/Cliente.jsx'));
const Operativo = lazy(() => import('./paginas/Operativo.jsx'));
const Monitoreo = lazy(() => import('./paginas/Monitoreo.jsx'));
const Admin = lazy(() => import('./paginas/Admin.jsx'));
const Alertas = lazy(() => import('./paginas/Alertas.jsx'));
const Glosario = lazy(() => import('./paginas/Glosario.jsx'));
const NasaVivo = lazy(() => import('./paginas/NasaVivo.jsx'));
const Comprador = lazy(() => import('./paginas/Comprador.jsx'));
const Ventas = lazy(() => import('./paginas/Ventas.jsx'));
const Campo = lazy(() => import('./paginas/Campo.jsx'));

// Cada vista exige al menos uno de sus permisos (el glosario, ninguno). El menú muestra solo las vistas permitidas;
// el backend vuelve a comprobar cada permiso en cada petición.
const MODULOS = [
  { clave: 'finca', icono: 'ubicacion', permisos: ['evaluar'], Panel: Cliente, menu: 'Mi finca', titulo: 'Mi finca', bajada: 'Registre su parcela y compare rotaciones' },
  { clave: 'nasa', icono: 'satelite', permisos: ['evaluar'], Panel: NasaVivo, menu: 'NASA en vivo', titulo: 'Datos de la NASA en vivo', bajada: 'Clima, relieve y vegetación de su parcela, consultados ahora a NASA POWER, SRTM y MODIS' },
  { clave: 'revision', icono: 'llave', permisos: ['revisar'], Panel: Operativo, menu: 'Asistencia técnica', titulo: 'Asistencia técnica', bajada: 'Sus parcelas asignadas, revisiones y visitas de campo' },
  { clave: 'monitoreo', icono: 'barras', permisos: ['reportes'], Panel: Monitoreo, menu: 'Monitoreo', titulo: 'Monitoreo regional', bajada: 'Panorama por zona, escenarios de agua, adopción y suelo desnudo' },
  { clave: 'alertas', icono: 'campana', permisos: ['alertas'], Panel: Alertas, menu: 'Alertas', titulo: 'Alertas climáticas', bajada: 'Avisos de helada y sequía en su teléfono' },
  { clave: 'oferta', icono: 'canasta', permisos: ['comprar'], Panel: Comprador, menu: 'Oferta sostenible', titulo: 'Oferta sostenible', bajada: 'Cosechas de rotaciones que cuidan el suelo y el agua' },
  { clave: 'ventas', icono: 'etiqueta', permisos: ['ofertar'], Panel: Ventas, menu: 'Mis ventas', titulo: 'Mis ventas', bajada: 'Publique su cosecha y responda a compradores locales' },
  { clave: 'campo', icono: 'insecto', permisos: ['incidencias'], Panel: Campo, menu: 'Plagas en campo', titulo: 'Plagas y enfermedades en campo', bajada: 'Marque incidencias con GPS y fotos desde el teléfono' },
  { clave: 'admin', icono: 'engranaje', permisos: ['usuarios', 'respaldos', 'asignar'], Panel: Admin, menu: 'Administración', titulo: 'Administración', bajada: 'Usuarios, permisos, parcelas, respaldos y sistema' },
  { clave: 'glosario', icono: 'libro', permisos: [], Panel: Glosario, menu: 'Glosario', titulo: 'Glosario y guía', bajada: 'Los términos científicos explicados con palabras sencillas y ejemplos' },
];
const INICIO = { cliente: 'finca', operativo: 'revision', monitoreo: 'monitoreo', administrador: 'admin', comprador: 'oferta' };

function modulosDe(usuario) {
  const lista = MODULOS.filter((m) => !m.permisos.length || m.permisos.some((p) => puede(usuario, p)));
  const inicio = lista.find((m) => m.clave === INICIO[usuario.rol]);
  return inicio ? [inicio, ...lista.filter((m) => m !== inicio)] : lista;
}

// Modo de bajo consumo: lo que la persona eligió; si nunca eligió, se activa cuando el teléfono
// pide ahorrar datos o la conexión es 2G.
const CLAVE_LIGERO = 'poseidon_ligero';
function ligeroInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE_LIGERO);
    if (guardado !== null) return guardado === '1';
  } catch { /* sin almacenamiento */ }
  const red = typeof navigator !== 'undefined' ? navigator.connection : null;
  return Boolean(red && (red.saveData || /(^|-)2g$/.test(red.effectiveType || '')));
}

// En modo de bajo consumo, la página del agricultor se va descargando mientras se comprueba la sesión.
if (hayToken() && ligeroInicial()) import('./paginas/Cliente.jsx').catch(() => {});

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [listo, setListo] = useState(!hayToken());
  const [activo, setActivo] = useState(null);
  const [pedidoGlosario, setPedidoGlosario] = useState(null); // { id, n }: término que otra vista pidió abrir
  const [ligero, setLigero] = useState(ligeroInicial);

  // La clase en <html> cambia la tipografía a la del sistema antes de pintar: no se descargan fuentes.
  useLayoutEffect(() => { document.documentElement.classList.toggle('ligero', ligero); }, [ligero]);
  function alternarLigero() {
    setLigero((v) => {
      try { localStorage.setItem(CLAVE_LIGERO, v ? '0' : '1'); } catch { /* sin almacenamiento */ }
      return !v;
    });
  }

  useEffect(() => {
    if (!hayToken()) return;
    api.yo().then(setUsuario).catch(() => setToken(null)).finally(() => setListo(true));
  }, []);

  // Al volver a la pestaña se releen los permisos: si el administrador quitó uno, la vista desaparece.
  useEffect(() => {
    if (!usuario) return undefined;
    const refrescar = () => {
      if (document.visibilityState !== 'visible') return;
      api.yo().then(setUsuario).catch((e) => { if (e.status === 401) salir(); });
    };
    document.addEventListener('visibilitychange', refrescar);
    return () => document.removeEventListener('visibilitychange', refrescar);
  }, [usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Ver en el glosario completo" desde un cuadro emergente lleva a la vista Glosario en ese término.
  useEffect(() => {
    const ir = (e) => {
      setActivo('glosario');
      setPedidoGlosario((p) => ({ id: e.detail, n: (p?.n || 0) + 1 }));
    };
    window.addEventListener('poseidon:glosario', ir);
    return () => window.removeEventListener('poseidon:glosario', ir);
  }, []);

  function salir() { setToken(null); setUsuario(null); setActivo(null); setMenuPerfil(false); }

  // Menú de perfil: se cierra al tocar fuera o con Escape.
  const [menuPerfil, setMenuPerfil] = useState(false);
  const perfil = useRef(null);
  useEffect(() => {
    if (!menuPerfil) return undefined;
    const fuera = (e) => { if (!perfil.current?.contains(e.target)) setMenuPerfil(false); };
    const tecla = (e) => { if (e.key === 'Escape') setMenuPerfil(false); };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla); };
  }, [menuPerfil]);

  if (!listo) return <p className="cargando">Cargando…</p>;
  if (!usuario) {
    return (
      <Suspense fallback={<p className="cargando">Cargando…</p>}>
        <Login onIngreso={(r) => { setToken(r.token, r.recordar); setUsuario(r.usuario); }} />
      </Suspense>
    );
  }

  const modulos = modulosDe(usuario);
  const modulo = modulos.find((m) => m.clave === activo) || modulos[0];
  const irA = (clave) => { setActivo(clave); setMenuPerfil(false); window.scrollTo({ top: 0 }); };

  // Estructura del diseño Poseidón (rama frontend3): barra lateral verde con el emblema y las secciones
  // del rol, y a la derecha un marco con la barra superior del panel.
  return (
    <ModoLigero.Provider value={ligero}>
      <div className={`admin-layout rol-${usuario.rol}`} style={ligero ? undefined : { '--fondo-campo': `url(${fondoCampo})` }}>
        <aside className="admin-sidebar">
          <div className="admin-sidebar-marca">
            <EmblemaPoseidon className="admin-logo-grande" variante="claro" />
            <div className="admin-marca-titulos">
              <span>Proyecto</span>
              <strong>Poseidón</strong>
            </div>
          </div>

          <nav className="admin-nav" aria-label="Secciones">
            {modulos.map((m) => (
              <button key={m.clave} type="button" className={`admin-nav-item ${m === modulo ? 'activo' : ''}`}
                aria-current={m === modulo ? 'page' : undefined} onClick={() => irA(m.clave)}>
                <span className="admin-nav-icono"><Icono nombre={m.icono} /></span>
                <span>{m.menu}</span>
              </button>
            ))}
            <button type="button" className="admin-nav-item salir-lateral" onClick={salir}>
              <span className="admin-nav-icono"><Icono nombre="salir" /></span>
              <span>Cerrar sesión</span>
            </button>
          </nav>

          <div className="admin-sidebar-campo" aria-hidden="true">
            <svg className="admin-sidebar-olas" viewBox="0 0 300 90" preserveAspectRatio="none">
              <path d="M0,30 C90,75 190,10 300,55 L300,90 L0,90 Z" fill="rgba(125, 179, 86, 0.78)" />
              <path d="M0,55 C110,90 210,35 300,70 L300,90 L0,90 Z" fill="#0f3822" />
            </svg>
          </div>
        </aside>

        <div className="admin-contenido">
          <div className="admin-marco">
            <header className="admin-topbar cabecera">
              <div className="admin-topbar-izq">
                <EmblemaPoseidon className="admin-logo-chico" variante="claro" />
                <h1>{modulo ? modulo.titulo : 'Poseidón'}</h1>
              </div>
              <div className="admin-topbar-der">
                <button type="button" className={`modo-ligero ${ligero ? 'activo' : ''}`} aria-pressed={ligero} onClick={alternarLigero}
                  title="Muestra solo números y la tabla comparativa, sin mapas: gasta muy pocos datos móviles">
                  Modo bajo consumo{ligero ? ': activado' : ''}
                </button>
                <div className="admin-perfil" ref={perfil}>
                  <button type="button" className="admin-perfil-btn" aria-expanded={menuPerfil} aria-haspopup="menu"
                    onClick={() => setMenuPerfil((v) => !v)}>
                    <span className="admin-avatar"><Icono nombre="persona" /></span>
                    <span className="admin-perfil-nombre">{usuario.nombre}</span>
                    <Icono nombre="bajar" className="admin-chevron" />
                  </button>
                  {menuPerfil && (
                    <div className="admin-perfil-menu" role="menu">
                      <div className="admin-perfil-info">
                        <strong>{usuario.nombre}</strong>
                        <small>{usuario.email}</small>
                        <span className="admin-rol-badge">{ETIQUETA_ROL[usuario.rol] || usuario.rol}</span>
                      </div>
                      <button type="button" role="menuitem" onClick={() => irA('glosario')}>Glosario y guía</button>
                      <button type="button" role="menuitem" className="admin-menu-salir" onClick={salir}>Cerrar sesión</button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div className="admin-cuerpo">
              {modulo ? (
                <>
                  <p className="admin-bajada">{modulo.bajada}</p>
                  <main>
                    <Suspense fallback={<p className="cargando">Cargando…</p>}>
                      <modulo.Panel key={`${modulo.clave}-${ligero ? 'l' : 'c'}`} usuario={usuario}
                        pedido={modulo.clave === 'glosario' ? pedidoGlosario : undefined} />
                    </Suspense>
                  </main>
                </>
              ) : (
                <main><p className="vacio">Su rol no tiene vistas asignadas. Pida al administrador que le otorgue permisos.</p></main>
              )}
            </div>
            <footer>Poseidón apoya la decisión; no reemplaza el criterio del agricultor ni de un técnico local. Datos: NASA POWER, SRTM y MODIS.</footer>
          </div>
        </div>
      </div>
    </ModoLigero.Provider>
  );
}
