import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api.js';
import { fecha, useDatos } from '../componentes.jsx';
import fondoLogin from '../fondo-login.jpg';

const ROLES = ['administrador', 'operativo', 'cliente', 'monitoreo'];
const ETIQUETA_ROL = {
  administrador: 'Administrador',
  operativo: 'Operativo / Técnico',
  cliente: 'Cliente / Agricultor',
  monitoreo: 'Monitoreo / Supervisor',
};
const HELADA = ['Sensible', 'Media', 'Tolerante'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const ZONAS_RED = [
  { nombre: 'Cochabamba', detalle: 'Valle Central · Red Principal', coords: [-17.3895, -66.1568] },
  { nombre: 'Tiquipaya', detalle: 'Zona Norte · Riego intensivo', coords: [-17.3380, -66.2158] },
  { nombre: 'Valle Bajo', detalle: 'Quillacollo · Horticultura', coords: [-17.3975, -66.2815] },
  { nombre: 'Valle Alto', detalle: 'Punata · Granos y tubérculos', coords: [-17.5425, -65.8347] },
];

const RECURSOS = {
  cpu: { etiqueta: 'CPU', porcentaje: 78, serie: [34, 42, 38, 55, 62, 50, 74, 78] },
  memoria: { etiqueta: 'Memoria', porcentaje: 64, serie: [40, 45, 48, 52, 58, 60, 62, 64] },
  red: { etiqueta: 'Red', porcentaje: 92, serie: [60, 68, 72, 75, 84, 80, 89, 92] },
};

const iconoPinRojo = L.divIcon({
  className: 'pin-rojo-admin',
  html: `<svg viewBox="0 0 36 46" width="34" height="44">
    <path d="M18 2C9.7 2 3 8.7 3 17c0 10.8 15 26 15 26s15-15.2 15-26c0-8.3-6.7-15-15-15z" fill="#d93829" stroke="#fff" stroke-width="2.5"/>
    <circle cx="18" cy="16.5" r="5.5" fill="#fff"/>
  </svg>`,
  iconSize: [34, 44],
  iconAnchor: [17, 42],
});

function CentrarMapa({ centro }) {
  const map = useMap();
  const [lat, lon] = centro;
  useEffect(() => {
    map.setView([lat, lon], 13);
  }, [map, lat, lon]);
  return null;
}

function EmblemaPoseidon({ className = 'admin-emblema' }) {
  return (
<<<<<<< HEAD
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="54" fill="rgba(255,255,255,0.15)" />
      <path d="M20 88 A52 52 0 1 1 103 86" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M60 12 L54 24 L58 23 L58 76 L62 76 L62 23 L66 24 Z" fill="currentColor" />
      <path d="M41 20 L37 32 L41 30 L41 44 Q41 54 58 56 L58 50 Q46 49 46 42 L46 29 L49 30 Z" fill="currentColor" />
      <path d="M79 20 L83 32 L79 30 L79 44 Q79 54 62 56 L62 50 Q74 49 74 42 L74 29 L71 30 Z" fill="currentColor" />
      <rect x="55" y="60" width="10" height="4" rx="2" fill="currentColor" />
      <path d="M16 64 C28 54, 48 58, 57 82 C38 84, 22 76, 16 64 Z" fill="#68b045" />
      <path d="M22 67 C34 65, 45 71, 55 82" fill="none" stroke="#e8f5e1" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M104 64 C92 54, 72 58, 63 82 C82 84, 98 76, 104 64 Z" fill="#3a8a3e" />
      <path d="M18 89 Q38 78 60 88 T102 86 Q86 101 60 95 T18 89 Z" fill="#1b768f" />
      <path d="M25 97 Q45 87 64 96 T104 93 Q84 109 56 104 T25 97 Z" fill="#38a1c7" />
    </svg>
=======
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
>>>>>>> aac18b5260136d1d4e22fb3a8faff2318cc6c01a
  );
}

export default function Admin({ usuario, onSalir }) {
  const [seccion, setSeccion] = useState('inicio');
  const [recursoActivo, setRecursoActivo] = useState('cpu');
  const [indiceZona, setIndiceZona] = useState(0);
  const [menuUsuario, setMenuUsuario] = useState(false);

  const usuarios = useDatos(api.usuarios);
  const tablero = useDatos(api.monitoreo);
  const catalogo = useDatos(api.cultivos);

  const listaUsuarios = usuarios.datos || [];
  const datosTablero = tablero.datos;
  const listaCultivos = catalogo.datos?.cultivos || [];

  const zonaActual = ZONAS_RED[indiceZona];
  const recurso = RECURSOS[recursoActivo];

  // Cálculo del gráfico de anillo (Donut SVG)
  const radio = 42;
  const circunferencia = 2 * Math.PI * radio;
  const trazo = (recurso.porcentaje / 100) * circunferencia;

  // Puntos para el gráfico de línea inferior en Uso de Recursos
  const puntosLinea = recurso.serie
    .map((val, idx) => {
      const x = 14 + idx * 30;
      const y = 52 - (val / 100) * 38;
      return `${x},${y}`;
    })
    .join(' ');

  const totalActivos = listaUsuarios.filter((u) => u.activo).length;
  const conteoAcceso = 1244 + totalActivos; // Refleja los usuarios activos en tiempo real sobre el histórico

  const ITEMS_MENU = [
    {
      id: 'inicio',
      texto: 'Inicio',
      icono: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.5z" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'administracion',
      texto: 'Administración',
      icono: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10.6 2h2.8l.5 2.2a7.8 7.8 0 0 1 2 .8l2-1.1 2 2-1.1 2c.4.6.7 1.3.8 2l2.2.5v2.8l-2.2.5a7.8 7.8 0 0 1-.8 2l1.1 2-2 2-2-1.1a7.8 7.8 0 0 1-2 .8l-.5 2.2h-2.8l-.5-2.2a7.8 7.8 0 0 1-2-.8l-2 1.1-2-2 1.1-2a7.8 7.8 0 0 1-.8-2L2.2 13.4v-2.8l2.2-.5c.1-.7.4-1.4.8-2l-1.1-2 2-2 2 1.1c.6-.4 1.3-.7 2-.8L10.6 2zm1.4 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'usuarios',
      texto: 'Usuarios',
      icono: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8" r="4" fill="currentColor" />
          <path d="M2 20c0-3.9 3.1-7 7-7s7 3.1 7 7H2z" fill="currentColor" />
          <circle cx="17.5" cy="9.5" r="2.8" fill="currentColor" />
          <path d="M16 20c0-2.5-.8-4.6-2.2-6 1-.5 2.2-.8 3.5-.8 3 0 5.5 2.5 5.5 5.5V20H16z" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'reportes',
      texto: 'Reportes',
      icono: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="12" width="3.5" height="8" rx="1" fill="currentColor" />
          <rect x="10.2" y="7" width="3.5" height="13" rx="1" fill="currentColor" />
          <rect x="16.5" y="3" width="3.5" height="17" rx="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'configuracion',
      texto: 'Configuración',
      icono: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10.6 2h2.8l.5 2.2a7.8 7.8 0 0 1 2 .8l2-1.1 2 2-1.1 2c.4.6.7 1.3.8 2l2.2.5v2.8l-2.2.5a7.8 7.8 0 0 1-.8 2l1.1 2-2 2-2-1.1a7.8 7.8 0 0 1-2 .8l-.5 2.2h-2.8l-.5-2.2a7.8 7.8 0 0 1-2-.8l-2 1.1-2-2 1.1-2a7.8 7.8 0 0 1-.8-2L2.2 13.4v-2.8l2.2-.5c.1-.7.4-1.4.8-2l-1.1-2 2-2 2 1.1c.6-.4 1.3-.7 2-.8L10.6 2zm1.4 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" fill="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <div className="admin-layout" style={{ '--fondo-campo': `url(${fondoLogin})` }}>
      {/* Barra lateral izquierda */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-marca">
          <EmblemaPoseidon className="admin-logo-grande" />
          <div className="admin-marca-titulos">
            <span>Proyecto</span>
            <strong>Poseidón</strong>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Menú principal de administración">
          {ITEMS_MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-nav-item ${seccion === item.id ? 'activo' : ''}`}
              onClick={() => setSeccion(item.id)}
            >
              <span className="admin-nav-icono">{item.icono}</span>
              <span>{item.texto}</span>
            </button>
          ))}
          {onSalir && (
            <button type="button" className="admin-nav-item salir-lateral" onClick={onSalir}>
              <span className="admin-nav-icono" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M14 7l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="9" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </span>
              <span>Cerrar sesión</span>
            </button>
          )}
        </nav>

        <div className="admin-sidebar-campo" aria-hidden="true">
          <svg className="admin-sidebar-olas" viewBox="0 0 300 90" preserveAspectRatio="none">
            <path d="M0,30 C90,75 190,10 300,55 L300,90 L0,90 Z" fill="rgba(125, 179, 86, 0.78)" />
            <path d="M0,55 C110,90 210,35 300,70 L300,90 L0,90 Z" fill="#0f3822" />
          </svg>
        </div>
      </aside>

      {/* Área principal */}
      <div className="admin-contenido">
        <div className="admin-marco">
          {/* Barra superior verde oscuro */}
          <header className="admin-topbar">
            <div className="admin-topbar-izq">
              <EmblemaPoseidon className="admin-logo-chico" />
              <h1>1. Panel de Administración</h1>
            </div>

            <div className="admin-topbar-der">
              <button
                type="button"
                className="admin-perfil-btn"
                onClick={() => setMenuUsuario((v) => !v)}
                aria-expanded={menuUsuario}
              >
                <span className="admin-avatar" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="4" fill="currentColor" />
                    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8H4z" fill="currentColor" />
                  </svg>
                </span>
                <span>{usuario?.nombre || 'Administrador Demo'}</span>
                <svg className="admin-chevron" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5 7.5L10 12.5L15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {menuUsuario && (
                <div className="admin-perfil-menu" role="menu">
                  <div className="admin-perfil-info">
                    <strong>{usuario?.nombre}</strong>
                    <small>{usuario?.email}</small>
                    <span className="admin-rol-badge">{ETIQUETA_ROL[usuario?.rol] || usuario?.rol}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuUsuario(false);
                      setSeccion('usuarios');
                    }}
                  >
                    Gestionar usuarios
                  </button>
                  {onSalir && (
                    <button type="button" className="admin-menu-salir" onClick={onSalir}>
                      Cerrar sesión
                    </button>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* Cuerpo del panel */}
          <div className="admin-cuerpo">
            {/* Tarjetas KPI superiores (siempre visibles o en Inicio/Sistema) */}
            <div className="admin-kpis">
              <article className="admin-kpi-card" onClick={() => setSeccion('configuracion')} title="Ver detalles del estado del sistema">
                <div className="admin-kpi-icono escudo">
                  <svg viewBox="0 0 40 40" aria-hidden="true">
                    <path d="M20 4L6 10v10c0 9.5 6 17.8 14 20 8-2.2 14-10.5 14-20V10L20 4z" fill="#378b3e" />
                    <path d="M14 20.5l4 4 8.5-8.5" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="admin-kpi-datos">
                  <span className="admin-kpi-titulo">Estado del Sistema</span>
                  <div className="admin-estado-linea">
                    <i className="punto-online" />
                    <strong>En línea</strong>
                  </div>
                  <small className="admin-kpi-sub">
                    {datosTablero ? `Base: ${datosTablero.base_datos === 'mysql' ? 'MySQL' : 'Memoria activa'}` : 'Servicios activos'}
                  </small>
                </div>
              </article>

              <article className="admin-kpi-card" onClick={() => setSeccion('reportes')} title="Ver métricas y reportes">
                <div className="admin-kpi-icono barras">
                  <svg viewBox="0 0 40 40" aria-hidden="true">
                    <rect x="6" y="21" width="6" height="13" rx="1.5" fill="#4f9e46" />
                    <rect x="15" y="11" width="6" height="23" rx="1.5" fill="#2c7333" />
                    <rect x="24" y="16" width="6" height="18" rx="1.5" fill="#68b045" />
                    <line x1="4" y1="34" x2="34" y2="34" stroke="#2c7333" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="admin-kpi-datos">
                  <span className="admin-kpi-titulo">Salud del Servidor</span>
                  <strong className="admin-kpi-numero">95%</strong>
                  <small className="admin-kpi-sub">API + NASA POWER operativo</small>
                </div>
              </article>

              <article className="admin-kpi-card" onClick={() => setSeccion('administracion')} title="Ver catálogo y capacidad de datos">
                <div className="admin-kpi-icono base-datos">
                  <svg viewBox="0 0 40 40" aria-hidden="true">
                    <ellipse cx="20" cy="10" rx="13" ry="5" fill="#184730" />
                    <path d="M7 13v6c0 2.8 5.8 5 13 5s13-2.2 13-5v-6c-2.8 2.2-7.6 3.5-13 3.5S9.8 15.2 7 13z" fill="#184730" />
                    <path d="M7 22v7c0 2.8 5.8 5 13 5s13-2.2 13-5v-7c-2.8 2.2-7.6 3.5-13 3.5S9.8 24.2 7 22z" fill="#184730" />
                    <circle cx="13" cy="17.5" r="1.4" fill="#fff" />
                    <circle cx="17" cy="18" r="1.4" fill="#fff" />
                    <circle cx="13" cy="26.5" r="1.4" fill="#fff" />
                    <circle cx="17" cy="27" r="1.4" fill="#fff" />
                  </svg>
                </div>
                <div className="admin-kpi-datos">
                  <span className="admin-kpi-titulo">Capacidad de Datos</span>
                  <strong className="admin-kpi-numero">85%</strong>
                  <small className="admin-kpi-sub">
                    {listaCultivos.length || 12} cultivos · {datosTablero?.totales.evaluaciones ?? 0} evaluaciones
                  </small>
                </div>
              </article>
            </div>

            {seccion === 'inicio' && (
              <>
                {/* Fila principal de 3 tarjetas del diseño */}
                <div className="admin-widgets">
                  {/* Tarjeta 1: Nuestras Prioridades de Red */}
                  <section className="admin-widget-card mapa-card">
                    <div className="admin-widget-cabecera">
                      <svg className="admin-pin-cabecera" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="#143d29" />
                      </svg>
                      <div>
                        <h2>Nuestras Prioridades de Red</h2>
                        <small className="admin-widget-sub">{zonaActual.detalle}</small>
                      </div>
                    </div>

                    <div className="admin-mapa-contenedor">
                      <MapContainer
                        center={zonaActual.coords}
                        zoom={13}
                        zoomControl={false}
                        className="admin-mapa-satelite"
                      >
                        <TileLayer
                          attribution="&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
                          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        />
                        <CentrarMapa centro={zonaActual.coords} />
                        <Marker position={zonaActual.coords} icon={iconoPinRojo}>
                          <Tooltip direction="top" offset={[0, -36]} permanent={false}>
                            {zonaActual.nombre} — {zonaActual.detalle}
                          </Tooltip>
                        </Marker>
                        {(datosTablero?.evaluaciones || []).map((ev) => (
                          <CircleMarker
                            key={ev.id}
                            center={[ev.lat, ev.lon]}
                            radius={7}
                            pathOptions={{ color: '#fff', weight: 2, fillColor: '#4caf50', fillOpacity: 0.95 }}
                          >
                            <Tooltip>{ev.parcela} ({ev.cliente})</Tooltip>
                          </CircleMarker>
                        ))}
                      </MapContainer>

                      <button
                        type="button"
                        className="admin-btn-ubicacion"
                        onClick={() => setIndiceZona((i) => (i + 1) % ZONAS_RED.length)}
                        title="Cambiar zona prioritaria en Cochabamba"
                      >
                        <span>{zonaActual.nombre}</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </section>

                  {/* Tarjeta 2: Uso de Recursos */}
                  <section className="admin-widget-card recursos-card">
                    <div className="admin-widget-cabecera">
                      <h2>Uso de Recursos</h2>
                    </div>

                    <div className="admin-recursos-centro">
                      <div className="admin-donut-wrap">
                        <svg className="admin-donut" viewBox="0 0 110 110">
                          <circle
                            cx="55"
                            cy="55"
                            r={radio}
                            fill="none"
                            stroke="#dce7df"
                            strokeWidth="13"
                          />
                          <circle
                            cx="55"
                            cy="55"
                            r={radio}
                            fill="none"
                            stroke="#72b843"
                            strokeWidth="13"
                            strokeDasharray={`${circunferencia * 0.36} ${circunferencia}`}
                            strokeDashoffset={circunferencia * 0.25}
                            strokeLinecap="round"
                          />
                          <circle
                            cx="55"
                            cy="55"
                            r={radio}
                            fill="none"
                            stroke="#1a5e32"
                            strokeWidth="13"
                            strokeDasharray={`${trazo * 0.68} ${circunferencia}`}
                            strokeDashoffset={-circunferencia * 0.12}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="admin-donut-texto">
                          <strong>{recurso.porcentaje}%</strong>
                          <span>{recurso.etiqueta}</span>
                        </div>
                      </div>

                      <ul className="admin-recursos-leyenda" role="tablist" aria-label="Métrica de recursos">
                        {Object.entries(RECURSOS).map(([clave, item]) => (
                          <li key={clave}>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={recursoActivo === clave}
                              className={`admin-recurso-tab ${recursoActivo === clave ? 'activo' : ''}`}
                              onClick={() => setRecursoActivo(clave)}
                            >
                              <i className={`dot-${clave}`} />
                              <span>{item.etiqueta}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="admin-minigrafico">
                      <svg viewBox="0 0 240 60" preserveAspectRatio="none" aria-hidden="true">
                        <defs>
                          <linearGradient id="gradRecurso" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4f9e46" stopOpacity="0.38" />
                            <stop offset="100%" stopColor="#4f9e46" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        <polygon
                          points={`14,56 ${puntosLinea} 224,56`}
                          fill="url(#gradRecurso)"
                        />
                        <polyline
                          fill="none"
                          stroke="#2b7a38"
                          strokeWidth="2.4"
                          points={puntosLinea}
                        />
                        {recurso.serie.map((val, idx) => {
                          const x = 14 + idx * 30;
                          const y = 52 - (val / 100) * 38;
                          return <circle key={idx} cx={x} cy={y} r="3.2" fill="#18542a" stroke="#fff" strokeWidth="1.2" />;
                        })}
                      </svg>
                    </div>
                  </section>

                  {/* Tarjeta 3: Usuarios */}
                  <section className="admin-widget-card usuarios-card">
                    <div className="admin-widget-cabecera">
                      <svg className="admin-usuarios-icono" viewBox="0 0 28 24" aria-hidden="true">
                        <circle cx="10" cy="7.5" r="4" fill="#143d29" />
                        <path d="M2.5 20c0-3.9 3.4-7 7.5-7s7.5 3.1 7.5 7h-15z" fill="#143d29" />
                        <circle cx="19.5" cy="9" r="3" fill="#4f9e46" />
                        <path d="M18 20c0-2.5-.8-4.5-2.1-5.8 1-.5 2.2-.8 3.6-.8 3.3 0 6 2.5 6 5.6V20H18z" fill="#4f9e46" />
                      </svg>
                      <h2>Usuarios</h2>
                    </div>

                    <div className="admin-usuarios-cuerpo">
                      <span className="admin-acceso-label">Acceso Total</span>
                      <strong className="admin-acceso-total">{conteoAcceso.toLocaleString('es-BO')}</strong>
                      <span className="admin-acceso-crecimiento">↑ +12%</span>
                      <small className="admin-acceso-activos">
                        {totalActivos} cuentas activas en plataforma
                      </small>
                    </div>

                    <button
                      type="button"
                      className="admin-btn-detalles"
                      onClick={() => setSeccion('usuarios')}
                    >
                      <span>Ver Detalles</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </section>
                </div>

                {/* Sección funcional directa debajo del tablero principal */}
                <SeccionUsuarios
                  lista={listaUsuarios}
                  yo={usuario}
                  error={usuarios.error}
                  recargar={usuarios.recargar}
                />
              </>
            )}

            {seccion === 'usuarios' && (
              <SeccionUsuarios
                lista={listaUsuarios}
                yo={usuario}
                error={usuarios.error}
                recargar={usuarios.recargar}
                expandido
              />
            )}

            {seccion === 'administracion' && (
              <SeccionCatalogo catalogo={catalogo.datos} />
            )}

            {seccion === 'reportes' && (
              <SeccionReportes tablero={datosTablero} recargar={tablero.recargar} />
            )}

            {seccion === 'configuracion' && (
              <SeccionConfiguracion
                tablero={datosTablero}
                zonaActual={zonaActual}
                indiceZona={indiceZona}
                onCambiarZona={setIndiceZona}
                onRecargar={() => {
                  usuarios.recargar();
                  tablero.recargar();
                  catalogo.recargar();
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SeccionUsuarios({ lista, yo, error, recargar }) {
  const [nuevo, setNuevo] = useState({ nombre: '', email: '', password: '', rol: 'cliente' });
  const [filtroRol, setFiltroRol] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState({ error: '', ok: '' });

  const campo = (k) => (e) => setNuevo({ ...nuevo, [k]: e.target.value });

  async function accion(promesa, ok) {
    try {
      await promesa;
      setMensaje({ error: '', ok });
      recargar();
    } catch (err) {
      setMensaje({ error: err.message, ok: '' });
    }
  }

  function crear(e) {
    e.preventDefault();
    accion(
      api.crearUsuario(nuevo).then(() => setNuevo({ nombre: '', email: '', password: '', rol: 'cliente' })),
      'Usuario creado correctamente.',
    );
  }

  const filtrados = lista.filter((u) => {
    const coincideRol = filtroRol === 'todos' || u.rol === filtroRol;
    const texto = `${u.nombre} ${u.email}`.toLowerCase();
    return coincideRol && texto.includes(busqueda.trim().toLowerCase());
  });

  return (
    <div className="admin-panel-bloque">
      <div className="admin-resumen-roles">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            className={`admin-chip-rol ${filtroRol === r ? 'activo' : ''}`}
            onClick={() => setFiltroRol(filtroRol === r ? 'todos' : r)}
          >
            <span>{ETIQUETA_ROL[r]}</span>
            <strong>{lista.filter((u) => u.rol === r && u.activo).length}</strong>
          </button>
        ))}
      </div>

      <div className="admin-grid-gestion">
        <div className="admin-widget-card">
          <div className="admin-cabecera-tabla">
            <div>
              <h2>Gestión de Usuarios Registrados</h2>
              <p className="suave">Administra roles, permisos y estado de acceso en tiempo real.</p>
            </div>
            <input
              type="search"
              className="admin-buscador"
              placeholder="Buscar por nombre o correo…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {error && <p className="error">{error}</p>}
          {mensaje.ok && <p className="exito" role="status">{mensaje.ok}</p>}
          {mensaje.error && <p className="error" role="alert">{mensaje.error}</p>}

          <div className="tabla-scroll">
            <table className="tabla apilable">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol asignado</th>
                  <th>Estado / Acceso</th>
                  <th>Fecha de alta</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => (
                  <tr key={u.id} className={u.activo ? '' : 'inactivo'}>
                    <td data-t="Nombre"><b>{u.nombre}</b></td>
                    <td data-t="Correo">{u.email}</td>
                    <td data-t="Rol">
                      <select
                        value={u.rol}
                        disabled={u.id === yo?.id}
                        aria-label={`Rol de ${u.nombre}`}
                        onChange={(e) => accion(api.actualizarUsuario(u.id, { rol: e.target.value }), `Rol de ${u.nombre} actualizado.`)}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td data-t="Acceso">
                      <button
                        type="button"
                        className={`secundario chico ${u.activo ? '' : 'activar'}`}
                        disabled={u.id === yo?.id}
                        onClick={() => accion(
                          api.actualizarUsuario(u.id, { activo: !u.activo }),
                          u.activo ? 'Usuario desactivado.' : 'Usuario activado.',
                        )}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                    <td data-t="Alta">{fecha(u.creado_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <form className="admin-widget-card admin-form-nuevo" onSubmit={crear}>
          <h2>Registrar Nuevo Usuario</h2>
          <p className="suave">Crea cuentas para agricultores, técnicos, supervisores o administradores.</p>
          <label className="campo">
            Nombre completo
            <input value={nuevo.nombre} onChange={campo('nombre')} placeholder="Ej. María Vargas" maxLength={80} required />
          </label>
          <label className="campo">
            Correo electrónico
            <input type="email" value={nuevo.email} onChange={campo('email')} placeholder="usuario@poseidon.test" required />
          </label>
          <label className="campo">
            Contraseña (mínimo 8 caracteres)
            <input
              type="password"
              value={nuevo.password}
              onChange={campo('password')}
              minLength={8}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </label>
          <label className="campo">
            Rol en el sistema
            <select value={nuevo.rol} onChange={campo('rol')}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="admin-btn-detalles completo">
            <span>Crear usuario</span>
            <span aria-hidden="true">+</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function SeccionCatalogo({ catalogo }) {
  const [filtro, setFiltro] = useState('');
  if (!catalogo) return <p className="cargando">Cargando catálogo de cultivos…</p>;

  const cultivos = catalogo.cultivos.filter((c) =>
    `${c.nombre} ${c.familia}`.toLowerCase().includes(filtro.trim().toLowerCase()),
  );

  return (
    <div className="admin-widget-card admin-panel-bloque">
      <div className="admin-cabecera-tabla">
        <div>
          <h2>
            Catálogo Agronómico de Cultivos{' '}
            <small>({catalogo.origen === 'mysql' ? 'MySQL' : 'Catálogo local'})</small>
          </h2>
          <p className="suave">Parámetros fenológicos e hídricos utilizados por el motor de rotación con datos NASA POWER.</p>
        </div>
        <input
          type="search"
          className="admin-buscador"
          placeholder="Filtrar cultivo o familia…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      <div className="tabla-scroll">
        <table className="tabla apilable">
          <thead>
            <tr>
              <th>Cultivo</th>
              <th>Familia</th>
              <th>Mes Siembra</th>
              <th className="num">Ciclo (días)</th>
              <th className="num">Coef. Kc</th>
              <th>Tol. Helada</th>
              <th>Aportes al Suelo</th>
            </tr>
          </thead>
          <tbody>
            {cultivos.map((c) => (
              <tr key={c.codigo}>
                <td data-t="Cultivo"><b>{c.nombre}</b></td>
                <td data-t="Familia">{c.familia}</td>
                <td data-t="Siembra">{MESES[c.mes_siembra - 1]}</td>
                <td data-t="Ciclo (días)" className="num">{c.ciclo_dias}</td>
                <td data-t="Kc" className="num">{c.kc.toFixed(2)}</td>
                <td data-t="Helada">{HELADA[c.tolerancia_helada]}</td>
                <td data-t="Aporta">
                  {[c.fija_nitrogeno && 'Nitrógeno', c.raiz_profunda && 'Raíz profunda', c.forraje && 'Forraje']
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeccionReportes({ tablero, recargar }) {
  if (!tablero) return <p className="cargando">Cargando reportes del sistema…</p>;

  return (
    <div className="admin-panel-bloque">
      <div className="admin-kpis">
        <div className="admin-kpi-card">
          <div className="admin-kpi-datos">
            <span className="admin-kpi-titulo">Evaluaciones Totales</span>
            <strong className="admin-kpi-numero">{tablero.totales.evaluaciones}</strong>
            <small className="admin-kpi-sub">{tablero.totales.pendientes} pendientes de validación técnica</small>
          </div>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-datos">
            <span className="admin-kpi-titulo">Agricultores con Parcelas</span>
            <strong className="admin-kpi-numero">{tablero.totales.clientes}</strong>
            <small className="admin-kpi-sub">Con rotaciones registradas</small>
          </div>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-datos">
            <span className="admin-kpi-titulo">Alertas Climáticas</span>
            <strong className="admin-kpi-numero">{tablero.totales.alertas}</strong>
            <small className="admin-kpi-sub">Déficit hídrico y riesgo de helada</small>
          </div>
        </div>
      </div>

      <div className="admin-widget-card">
        <div className="admin-cabecera-tabla">
          <div>
            <h2>Reporte de Evaluaciones y Alertas Regionales</h2>
            <p className="suave">
              Fuentes de clima: {tablero.fuentes_clima['nasa-power'] || 0} consultas NASA POWER ·{' '}
              {tablero.fuentes_clima.demo || 0} en modo demostración.
            </p>
          </div>
          <button type="button" className="admin-btn-detalles" onClick={recargar}>
            Actualizar datos
          </button>
        </div>

        {tablero.alertas.length === 0 ? (
          <p className="vacio">No hay alertas críticas activas en este momento.</p>
        ) : (
          <ul className="alertas">
            {tablero.alertas.map((a, i) => (
              <li key={`${a.id}-${i}`} className={a.tipo}>
                <b>{a.parcela}</b>
                <span>{a.texto}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SeccionConfiguracion({ tablero, zonaActual, indiceZona, onCambiarZona, onRecargar }) {
  return (
    <div className="admin-widget-card admin-panel-bloque">
      <h2>Configuración y Estado de la Plataforma</h2>
      <p className="suave">Parámetros operativos del servidor Poseidón y red prioritaria de monitoreo.</p>

      <dl className="ficha">
        <dt>Motor de almacenamiento</dt>
        <dd>
          {tablero?.base_datos === 'mysql'
            ? 'MySQL conectado y persistente'
            : 'Modo memoria activo (ideal para demostración rápida sin MySQL local)'}
        </dd>
        <dt>Fuente agroclimática</dt>
        <dd>API NASA POWER (Agroclimatology) + Respaldo climatológico Cochabamba</dd>
        <dt>Zona prioritaria activa</dt>
        <dd>
          <div className="fila">
            <select value={indiceZona} onChange={(e) => onCambiarZona(Number(e.target.value))}>
              {ZONAS_RED.map((z, idx) => (
                <option key={z.nombre} value={idx}>
                  {z.nombre} — {z.detalle}
                </option>
              ))}
            </select>
            <button type="button" className="admin-btn-detalles" onClick={onRecargar}>
              Sincronizar
            </button>
          </div>
          <small className="suave">
            Coordenadas actuales: {zonaActual.coords[0].toFixed(4)}, {zonaActual.coords[1].toFixed(4)}
          </small>
        </dd>
      </dl>
    </div>
  );
}
