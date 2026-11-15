import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api.js';
import { Estado, Detalle, fecha, useDatos } from '../componentes.jsx';
import fondoLogin from '../fondo-login.jpg';

const TERRITORIOS = [
  {
    nombre: 'Cochabamba',
    coords: [-17.3895, -66.1568],
    temp: 22,
    humedad: 72,
    precipitacion: 0,
    parcelasDemo: [
      { id: 'd1', parcela: 'Parcela Valle Central', cliente: 'Agricultor Demo', lat: -17.3945, lon: -66.1650, alerta: false },
      { id: 'd2', parcela: 'Finca Tiquipaya Norte', cliente: 'Cooperativa Norte', lat: -17.3810, lon: -66.1560, alerta: false },
      { id: 'd3', parcela: 'Chacra Bajo Sur', cliente: 'Productor Local', lat: -17.3875, lon: -66.1445, alerta: false },
    ],
  },
  {
    nombre: 'Tiquipaya',
    coords: [-17.3380, -66.2158],
    temp: 20,
    humedad: 76,
    precipitacion: 4,
    parcelasDemo: [
      { id: 't1', parcela: 'Finca Tiquipaya Alta', cliente: 'Agricultor Demo', lat: -17.3360, lon: -66.2210, alerta: false },
      { id: 't2', parcela: 'Parcela Linde', cliente: 'Productor Tiquipaya', lat: -17.3410, lon: -66.2120, alerta: false },
      { id: 't3', parcela: 'Sector Chilimarca', cliente: 'Asociación Riego', lat: -17.3395, lon: -66.2050, alerta: false },
    ],
  },
  {
    nombre: 'Valle Bajo',
    coords: [-17.3975, -66.2815],
    temp: 23,
    humedad: 68,
    precipitacion: 0,
    parcelasDemo: [
      { id: 'v1', parcela: 'Parcela Quillacollo', cliente: 'Agricultor Demo', lat: -17.3990, lon: -66.2890, alerta: false },
      { id: 'v2', parcela: 'Finca Vinto', cliente: 'Hortalizas Valle', lat: -17.3935, lon: -66.2780, alerta: false },
      { id: 'v3', parcela: 'Chacra El Paso', cliente: 'Comunidad Agrícola', lat: -17.3965, lon: -66.2710, alerta: false },
    ],
  },
  {
    nombre: 'Valle Alto / Punata',
    coords: [-17.5425, -65.8347],
    temp: 21,
    humedad: 64,
    precipitacion: 2,
    parcelasDemo: [
      { id: 'p1', parcela: 'Finca Punata Centro', cliente: 'Agricultor Demo', lat: -17.5450, lon: -65.8410, alerta: false },
      { id: 'p2', parcela: 'Parcela Cliza', cliente: 'Granos del Valle', lat: -17.5390, lon: -65.8320, alerta: false },
      { id: 'p3', parcela: 'Sector San Benito', cliente: 'Productor Punata', lat: -17.5415, lon: -65.8250, alerta: false },
    ],
  },
];

const iconoPinVerde = L.divIcon({
  className: 'pin-verde-monitoreo',
  html: `<svg viewBox="0 0 36 46" width="34" height="44">
    <path d="M18 2C9.7 2 3 8.7 3 17c0 10.8 15 26 15 26s15-15.2 15-26c0-8.3-6.7-15-15-15z" fill="#4eb03b" stroke="#fff" stroke-width="2.5"/>
    <circle cx="18" cy="16.5" r="5.5" fill="#fff"/>
  </svg>`,
  iconSize: [34, 44],
  iconAnchor: [17, 42],
});

const iconoPinAlerta = L.divIcon({
  className: 'pin-verde-monitoreo',
  html: `<svg viewBox="0 0 36 46" width="34" height="44">
    <path d="M18 2C9.7 2 3 8.7 3 17c0 10.8 15 26 15 26s15-15.2 15-26c0-8.3-6.7-15-15-15z" fill="#dc392a" stroke="#fff" stroke-width="2.5"/>
    <circle cx="18" cy="16.5" r="5.5" fill="#fff"/>
  </svg>`,
  iconSize: [34, 44],
  iconAnchor: [17, 42],
});

function ControlMapaMonitoreo({ centro, zoom }) {
  const map = useMap();
  const [lat, lon] = centro;
  useEffect(() => {
    map.setView([lat, lon], zoom);
  }, [map, lat, lon, zoom]);
  return null;
}

function EmblemaPoseidon({ className = 'admin-emblema' }) {
  return (
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
  );
}

export default function Monitoreo({ usuario, onSalir }) {
  const { datos: d, error, recargar } = useDatos(api.monitoreo);
  const [seccion, setSeccion] = useState('inicio');
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [indiceTerritorio, setIndiceTerritorio] = useState(0);
  const [zoom, setZoom] = useState(14);
  const [evaluacionAbierta, setEvaluacionAbierta] = useState(null);

  const territorio = TERRITORIOS[indiceTerritorio];
  const evaluacionesReales = d?.evaluaciones || [];
  const alertasReales = d?.alertas || [];

  // Marcadores del mapa: muestra las 3 parcelas del territorio + evaluaciones adicionales
  const marcadores = indiceTerritorio === 0 && evaluacionesReales.length > 0
    ? evaluacionesReales.map((e) => ({
        id: e.id,
        esReal: true,
        parcela: e.parcela,
        cliente: e.cliente,
        lat: e.lat,
        lon: e.lon,
        alerta: false,
      }))
    : territorio.parcelasDemo;

  const conteoAlertas = evaluacionesReales.length > 3 ? alertasReales.length : 1;
  const alertasMostradas = alertasReales.length > 0
    ? alertasReales
    : [
        {
          id: 'demo-1',
          parcela: territorio.parcelasDemo[0].parcela,
          tipo: 'agua',
          texto: `Vigilancia agroclimática activa en ${territorio.nombre}: verificar humedad del suelo antes de la próxima campaña.`,
        },
      ];

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
      id: 'mapa',
      texto: 'Mapa Global',
      icono: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'alertas',
      texto: 'Alertas',
      icono: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0-6 6v4.2L4.3 15a1 1 0 0 0 .7 1.7h14a1 1 0 0 0 .7-1.7L18 13.2V9a6 6 0 0 0-6-6zm0 18a2.5 2.5 0 0 0 2.4-2H9.6A2.5 2.5 0 0 0 12 21z" fill="currentColor" />
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
      {/* Barra lateral izquierda Poseidón */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-marca">
          <EmblemaPoseidon className="admin-logo-grande" />
          <div className="admin-marca-titulos">
            <span>Proyecto</span>
            <strong>Poseidón</strong>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Menú de monitoreo global">
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

      {/* Marco principal derecho */}
      <div className="admin-contenido">
        <div className="admin-marco">
          {/* Barra superior verde oscuro */}
          <header className="admin-topbar">
            <div className="admin-topbar-izq">
              <EmblemaPoseidon className="admin-logo-chico" />
              <h1>4. Panel de Monitoreo - Supervisor Global</h1>
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
                <span>{usuario?.nombre || 'Supervisor Demo'}</span>
                <svg className="admin-chevron" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5 7.5L10 12.5L15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {menuUsuario && (
                <div className="admin-perfil-menu" role="menu">
                  <div className="admin-perfil-info">
                    <strong>{usuario?.nombre || 'Supervisor Demo'}</strong>
                    <small>{usuario?.email || 'monitoreo@poseidon.test'}</small>
                    <span className="admin-rol-badge">Monitoreo / Supervisor</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuUsuario(false);
                      setSeccion('alertas');
                    }}
                  >
                    Ver alertas ({conteoAlertas})
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

          {/* Cuerpo del Panel de Monitoreo */}
          <div className="admin-cuerpo">
            {error && <p className="error">{error}</p>}

            {/* Fila superior de 3 tarjetas climáticas (idéntica a la maqueta) */}
            <div className="admin-kpis">
              {/* Tarjeta 1: Clima y Territorio */}
              <article
                className="admin-kpi-card"
                onClick={() => setIndiceTerritorio((i) => (i + 1) % TERRITORIOS.length)}
                title="Haz clic para cambiar territorio monitoreado"
              >
                <div className="admin-kpi-icono clima-sol">
                  <svg viewBox="0 0 44 44" aria-hidden="true">
                    {/* Sol */}
                    <circle cx="16" cy="16" r="7" fill="#fbb829" />
                    <g stroke="#fbb829" strokeWidth="2.2" strokeLinecap="round">
                      <line x1="16" y1="4" x2="16" y2="6.5" />
                      <line x1="16" y1="25.5" x2="16" y2="28" />
                      <line x1="4" y1="16" x2="6.5" y2="16" />
                      <line x1="25.5" y1="16" x2="28" y2="16" />
                      <line x1="7.5" y1="7.5" x2="9.3" y2="9.3" />
                      <line x1="22.7" y1="22.7" x2="24.5" y2="24.5" />
                      <line x1="24.5" y1="7.5" x2="22.7" y2="9.3" />
                      <line x1="7.5" y1="24.5" x2="9.3" y2="22.7" />
                    </g>
                    {/* Nube celeste */}
                    <path
                      d="M18 33h14a6 6 0 0 0 .8-11.9A8.5 8.5 0 0 0 16.5 19a6.5 6.5 0 0 0 1.5 14z"
                      fill="#59b0ec"
                    />
                  </svg>
                </div>
                <div className="admin-kpi-datos">
                  <span className="admin-kpi-titulo">Clima y Territorio</span>
                  <strong className="admin-kpi-numero">{territorio.temp} °C</strong>
                  <small className="monitoreo-territorio-sub">{territorio.nombre}</small>
                </div>
              </article>

              {/* Tarjeta 2: Humedad */}
              <article className="admin-kpi-card" onClick={() => setSeccion('reportes')}>
                <div className="admin-kpi-icono humedad-gota">
                  <svg viewBox="0 0 40 40" aria-hidden="true">
                    <path d="M20 5C20 5 8 18 8 25.5a12 12 0 0 0 24 0C32 18 20 5 20 5z" fill="#469de8" />
                    <path d="M14.5 26a6 6 0 0 1-1.2-3.8" fill="none" stroke="rgba(255,255,255,0.78)" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="admin-kpi-datos">
                  <span className="admin-kpi-titulo">Humedad</span>
                  <strong className="admin-kpi-numero">{territorio.humedad}%</strong>
                  <small className="admin-kpi-sub">Balance hídrico regional</small>
                </div>
              </article>

              {/* Tarjeta 3: Precipitación */}
              <article className="admin-kpi-card" onClick={() => setSeccion('reportes')}>
                <div className="admin-kpi-icono lluvia-nube">
                  <svg viewBox="0 0 44 44" aria-hidden="true">
                    <path
                      d="M13 26h18a6.5 6.5 0 0 0 .9-12.9A9 9 0 0 0 14.5 11a7 7 0 0 0-1.5 15z"
                      fill="#4f9fe8"
                    />
                    <g fill="#3a89d6">
                      <ellipse cx="15" cy="32" rx="1.8" ry="3" transform="rotate(15 15 32)" />
                      <ellipse cx="22" cy="35" rx="1.8" ry="3" transform="rotate(15 22 35)" />
                      <ellipse cx="29" cy="32" rx="1.8" ry="3" transform="rotate(15 29 32)" />
                    </g>
                  </svg>
                </div>
                <div className="admin-kpi-datos">
                  <span className="admin-kpi-titulo">Precipitación</span>
                  <strong className="admin-kpi-numero">{territorio.precipitacion} mm</strong>
                  <small className="admin-kpi-sub"> Monitoreo NASA POWER</small>
                </div>
              </article>
            </div>

            {/* Segunda fila: Mapa de Parcelas + Columna derecha (Alertas y Sistema en Funcionamiento) */}
            <div className="monitoreo-tablero-inferior">
              {/* Tarjeta izquierda: Mapa de Parcelas */}
              <section className="admin-widget-card monitoreo-mapa-card">
                <div className="monitoreo-mapa-tope">
                  <h2>Mapa de Parcelas</h2>
                  <span className="suave">
                    {marcadores.length} parcelas monitoreadas en {territorio.nombre}
                  </span>
                </div>

                <div className="monitoreo-mapa-wrap">
                  <MapContainer
                    center={territorio.coords}
                    zoom={zoom}
                    zoomControl={false}
                    className="monitoreo-mapa-satelite"
                  >
                    <TileLayer
                      attribution="&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                    <ControlMapaMonitoreo centro={territorio.coords} zoom={zoom} />
                    {marcadores.map((m) => (
                      <Marker
                        key={m.id}
                        position={[m.lat, m.lon]}
                        icon={m.alerta ? iconoPinAlerta : iconoPinVerde}
                        eventHandlers={{
                          click: () => {
                            if (m.esReal) setEvaluacionAbierta(m.id);
                          },
                        }}
                      >
                        <Tooltip direction="top" offset={[0, -36]}>
                          <b>{m.parcela}</b> · {m.cliente}
                        </Tooltip>
                      </Marker>
                    ))}
                  </MapContainer>

                  <div className="cliente-zoom-controles" role="group" aria-label="Zoom del mapa de parcelas">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(18, z + 1))}
                      aria-label="Acercar mapa"
                      title="Acercar"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(10, z - 1))}
                      aria-label="Alejar mapa"
                      title="Alejar"
                    >
                      −
                    </button>
                  </div>
                </div>
              </section>

              {/* Columna derecha: Tarjeta Alertas + Pastilla Sistema en Funcionamiento */}
              <div className="monitoreo-columna-der">
                <section className="monitoreo-alertas-card">
                  <div className="monitoreo-alertas-tope">
                    <svg className="monitoreo-campana" viewBox="0 0 32 32" aria-hidden="true">
                      <path
                        d="M16 4a8 8 0 0 0-8 8v5.5L5.7 20a1.3 1.3 0 0 0 .9 2.2h18.8a1.3 1.3 0 0 0 .9-2.2L24 17.5V12a8 8 0 0 0-8-8zm0 24a3.2 3.2 0 0 0 3.1-2.5h-6.2A3.2 3.2 0 0 0 16 28z"
                        fill="#dc392a"
                      />
                    </svg>
                    <h2>Alertas</h2>
                  </div>

                  <div className="monitoreo-alertas-centro">
                    <strong>{conteoAlertas}</strong>
                    <span>{conteoAlertas === 1 ? 'Nueva alerta' : 'Alertas activas'}</span>
                  </div>

                  <button
                    type="button"
                    className="monitoreo-btn-alerta"
                    onClick={() => setSeccion('alertas')}
                  >
                    <span>Ver alerta</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </section>

                <button
                  type="button"
                  className="monitoreo-sistema-ok"
                  onClick={recargar}
                  title="Haz clic para actualizar el estado de monitoreo"
                >
                  <span className="monitoreo-check-circulo" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="11" fill="#2b7a38" />
                      <path d="M7.5 12.3l3 3 6-6.2" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <strong>Sistema en Funcionamiento</strong>
                </button>
              </div>
            </div>

            {/* Secciones funcionales inferiores */}
            {(seccion === 'inicio' || seccion === 'mapa') && (
              <div className="admin-widget-card admin-panel-bloque">
                <div className="admin-cabecera-tabla">
                  <div>
                    <h2>Actividad Regional de Evaluaciones y Parcelas</h2>
                    <p className="suave">
                      Supervisión de rotaciones registradas, demanda de riego y validación técnica en tiempo real.
                    </p>
                  </div>
                  <div className="fila" style={{ marginTop: 0 }}>
                    {TERRITORIOS.map((t, idx) => (
                      <button
                        key={t.nombre}
                        type="button"
                        className={`secundario chico ${indiceTerritorio === idx ? 'activar' : ''}`}
                        onClick={() => setIndiceTerritorio(idx)}
                      >
                        {t.nombre}
                      </button>
                    ))}
                  </div>
                </div>

                {evaluacionesReales.length === 0 ? (
                  <p className="vacio">
                    Mostrando las 3 parcelas de referencia en <b>{territorio.nombre}</b>. Cuando los agricultores guarden nuevas evaluaciones de rotación, aparecerán listadas aquí con su estado técnico.
                  </p>
                ) : (
                  <div className="tabla-scroll">
                    <table className="tabla apilable">
                      <thead>
                        <tr>
                          <th>Parcela</th>
                          <th>Agricultor</th>
                          <th>Rotación actual</th>
                          <th className="num">Riego (mm)</th>
                          <th>Mejor opción</th>
                          <th>Estado</th>
                          <th>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluacionesReales.map((e) => (
                          <tr
                            key={e.id}
                            onClick={() => setEvaluacionAbierta(e.id)}
                            style={{ cursor: 'pointer' }}
                            title="Haz clic para ver el detalle completo de la evaluación"
                          >
                            <td data-t="Parcela"><b>{e.parcela}</b></td>
                            <td data-t="Agricultor">{e.cliente}</td>
                            <td data-t="Rotación actual">{e.resumen.actual.nombres.join(' → ')}</td>
                            <td data-t="Riego (mm)" className="num">{e.resumen.deficit_agua_mm}</td>
                            <td data-t="Mejor opción">
                              {e.resumen.mejor.nombres.join(' → ')} ({e.resumen.mejor.puntaje})
                            </td>
                            <td data-t="Estado"><Estado estado={e.estado} /></td>
                            <td data-t="Fecha">{fecha(e.creado_en)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {evaluacionAbierta && (
                  <div className="caja" style={{ marginTop: 12 }}>
                    <Detalle id={evaluacionAbierta} />
                  </div>
                )}
              </div>
            )}

            {seccion === 'alertas' && (
              <div className="admin-widget-card admin-panel-bloque">
                <h2>Centro de Alertas Agroclimáticas ({conteoAlertas})</h2>
                <p className="suave">
                  Detección temprana de déficit hídrico superior a 400 mm por campaña y exposición a heladas por cultivo.
                </p>
                <ul className="alertas">
                  {alertasMostradas.map((a, i) => (
                    <li key={`${a.id}-${i}`} className={a.tipo}>
                      <b>{a.parcela}</b>
                      <span>{a.texto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {seccion === 'reportes' && d && (
              <div className="admin-panel-bloque">
                <div className="admin-kpis">
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-datos">
                      <span className="admin-kpi-titulo">Evaluaciones Monitoreadas</span>
                      <strong className="admin-kpi-numero">{d.totales.evaluaciones}</strong>
                      <small className="admin-kpi-sub">{d.totales.pendientes} pendientes de revisión</small>
                    </div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-datos">
                      <span className="admin-kpi-titulo">Productores Activos</span>
                      <strong className="admin-kpi-numero">{d.totales.clientes}</strong>
                      <small className="admin-kpi-sub">Con parcelas geolocalizadas</small>
                    </div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-datos">
                      <span className="admin-kpi-titulo">Consultas NASA POWER</span>
                      <strong className="admin-kpi-numero">
                        {d.fuentes_clima['nasa-power'] || 0} / {d.totales.evaluaciones}
                      </strong>
                      <small className="admin-kpi-sub">Fuente agroclimática satelital</small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {seccion === 'configuracion' && (
              <div className="admin-widget-card admin-panel-bloque">
                <h2>Configuración del Supervisor Global</h2>
                <p className="suave">Selecciona el territorio principal de monitoreo climático y satelital:</p>
                <div className="fila" style={{ flexWrap: 'wrap' }}>
                  {TERRITORIOS.map((t, idx) => (
                    <button
                      key={t.nombre}
                      type="button"
                      className={`secundario chico ${indiceTerritorio === idx ? 'activar' : ''}`}
                      onClick={() => {
                        setIndiceTerritorio(idx);
                        setSeccion('inicio');
                      }}
                    >
                      {t.nombre} ({t.temp} °C · {t.humedad}%)
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
