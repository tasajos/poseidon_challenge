import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api.js';
import { Clima, Estrategia, ListaEvaluaciones, Detalle, useDatos } from '../componentes.jsx';
import fondoLogin from '../fondo-login.jpg';

const TIQUIPAYA = [-17.3380, -66.2158];

const PRIORIDADES = [
  ['agua', 'Ahorrar agua'],
  ['suelo', 'Mejorar el suelo'],
  ['clima', 'Evitar heladas'],
  ['ingreso', 'Ingreso'],
  ['forraje', 'Forraje'],
];

const iconoPinVerde = L.divIcon({
  className: 'pin-verde-cliente',
  html: `<svg viewBox="0 0 36 46" width="34" height="44">
    <path d="M18 2C9.7 2 3 8.7 3 17c0 10.8 15 26 15 26s15-15.2 15-26c0-8.3-6.7-15-15-15z" fill="#4aa83b" stroke="#fff" stroke-width="2.5"/>
    <circle cx="18" cy="16.5" r="5.5" fill="#fff"/>
  </svg>`,
  iconSize: [34, 44],
  iconAnchor: [17, 42],
});

// Genera un polígono inclinado (estilo parcela agrícola) alrededor del punto central
function poligonoParcela([lat, lon]) {
  return [
    [lat + 0.0022, lon - 0.0008],
    [lat + 0.0007, lon + 0.0026],
    [lat - 0.0022, lon + 0.0008],
    [lat - 0.0007, lon - 0.0026],
  ];
}

function ControlMapaCliente({ centro, zoom, onElegir }) {
  const map = useMap();
  const [lat, lon] = centro;
  useMapEvents({
    click(e) {
      onElegir([e.latlng.lat, e.latlng.lng]);
    },
  });
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

function IlustracionCultivo({ nombre }) {
  return (
    <div className="cliente-cultivo-foto" title={`Cultivo activo: ${nombre}`}>
      <svg viewBox="0 0 420 135" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="cieloMaiz" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6bb5e8" />
            <stop offset="55%" stopColor="#bfe1f6" />
            <stop offset="100%" stopColor="#8bc367" />
          </linearGradient>
          <linearGradient id="campoFondo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6aa83f" />
            <stop offset="100%" stopColor="#1e5724" />
          </linearGradient>
        </defs>
        <rect width="420" height="135" fill="url(#cieloMaiz)" />
        {/* Nubes suaves */}
        <ellipse cx="95" cy="28" rx="48" ry="12" fill="rgba(255,255,255,0.65)" />
        <ellipse cx="310" cy="22" rx="56" ry="14" fill="rgba(255,255,255,0.55)" />
        {/* Loma agrícola al fondo */}
        <path d="M0,78 Q120,62 240,76 T420,70 L420,135 L0,135 Z" fill="url(#campoFondo)" />
        {/* Plantas y hojas de maíz en primer plano */}
        {[28, 72, 118, 165, 212, 260, 308, 355, 395].map((x, idx) => (
          <g key={x} transform={`translate(${x}, ${18 + (idx % 3) * 6})`}>
            <line x1="0" y1="120" x2="0" y2="14" stroke="#2d6e28" strokeWidth="4.5" />
            <path d="M0,75 C-22,55 -36,62 -44,82 C-26,76 -12,78 0,88 Z" fill="#4ca038" />
            <path d="M0,58 C24,38 38,44 46,64 C28,58 14,62 0,72 Z" fill="#63b842" />
            <path d="M0,40 C-18,22 -30,28 -36,44 C-20,40 -10,44 0,52 Z" fill="#7bd154" />
            {/* Espiga / mazorca dorada */}
            {idx % 2 === 1 && (
              <g transform="translate(5, 44) rotate(18)">
                <ellipse cx="0" cy="0" rx="5.5" ry="14" fill="#f3c63b" stroke="#b58318" strokeWidth="1" />
                <path d="M-5,4 Q0,14 5,4" fill="none" stroke="#4ca038" strokeWidth="2.5" />
              </g>
            )}
            {/* Espiga superior */}
            <path d="M0,14 L-6,2 M0,14 L0,0 M0,14 L6,3" stroke="#d8be52" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function Cliente({ usuario, onSalir }) {
  const [seccion, setSeccion] = useState('inicio');
  const [menuUsuario, setMenuUsuario] = useState(false);

  // Estado compartido de la finca y el simulador de rotaciones
  const [punto, setPunto] = useState(TIQUIPAYA);
  const [zoom, setZoom] = useState(15);
  const [nombreParcela, setNombreParcela] = useState('Finca Tiquipaya');
  const [rotacion, setRotacion] = useState(['maiz', 'papa', 'haba']);
  const [prioridades, setPrioridades] = useState({ agua: 4, suelo: 3, clima: 2, ingreso: 3, forraje: 1 });
  const [resultado, setResultado] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [estadoEval, setEstadoEval] = useState({ cargando: false, error: '', ok: '' });

  const { datos: datosCultivos } = useDatos(api.cultivos);
  const historial = useDatos(api.evaluaciones);

  const cultivos = datosCultivos?.cultivos || [];
  const itemsHistorial = historial.datos || [];

  // Cultivo actual principal (el primero de la rotación seleccionada)
  const codigoActual = rotacion[0] || 'maiz';
  const objCultivoActual = cultivos.find((c) => c.codigo === codigoActual);
  const nombreCultivoActual = objCultivoActual ? objCultivoActual.nombre : 'Maíz';

  // Métricas dinámicas conectadas al resultado o valores base del diseño
  const mejorEstrategia = resultado?.estrategias?.reduce((a, b) => (b.puntaje > a.puntaje ? b : a), resultado.estrategias[0]);
  const estadoCultivoPorcentaje = mejorEstrategia ? mejorEstrategia.puntaje : 85;

  const humedadSuelo = resultado
    ? Math.max(45, Math.min(92, Math.round(100 - (resultado.estrategias[0].evidencia.deficit_agua_mm / 18))))
    : 68;

  const temperaturaMedia = resultado?.clima?.length
    ? Math.round(resultado.clima.reduce((acc, m) => acc + (m.tmin + 12), 0) / resultado.clima.length)
    : 24;

  const textoRecomendacion = mejorEstrategia
    ? `${mejorEstrategia.titulo} (${mejorEstrategia.nombres.join(' → ')}): ${mejorEstrategia.porque[0] || 'Mantén el riego según el nivel de humedad actual.'}`
    : 'Mantén el riego según el nivel de humedad actual.';

  const libres = (actual) => cultivos.filter((c) => c.codigo === actual || !rotacion.includes(c.codigo));
  const agregarCultivo = () => {
    const libre = cultivos.find((c) => !rotacion.includes(c.codigo));
    if (libre) setRotacion([...rotacion, libre.codigo]);
  };

  async function ejecutarComparacion(e) {
    if (e) e.preventDefault();
    if (!cultivos.length) return;
    setEstadoEval({ cargando: true, error: '', ok: '' });
    try {
      const r = await api.evaluar({
        nombre: nombreParcela || 'Finca Tiquipaya',
        lat: punto[0],
        lon: punto[1],
        rotacion,
        prioridades,
      });
      setResultado(r);
      setEstadoEval({ cargando: false, error: '', ok: 'Evaluación calculada y guardada en tu historial.' });
      historial.recargar();
    } catch (err) {
      setEstadoEval({ cargando: false, error: err.message, ok: '' });
    }
  }

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
      id: 'comparar',
      texto: 'Mi Parcela',
      icono: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'cultivos',
      texto: 'Cultivos',
      icono: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21V11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 16c-5 0-8.5-3.5-8.5-8.5 5 0 8.5 3.5 8.5 8.5z" fill="currentColor" />
          <path d="M12 13c4.5 0 7.5-3 7.5-7.5-4.5 0-7.5 3-7.5 7.5z" fill="currentColor" />
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

        <nav className="admin-nav" aria-label="Menú del agricultor">
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

      {/* Contenedor derecho */}
      <div className="admin-contenido">
        <div className="admin-marco">
          {/* Barra superior verde oscuro */}
          <header className="admin-topbar">
            <div className="admin-topbar-izq">
              <EmblemaPoseidon className="admin-logo-chico" />
              <h1>2. Panel del Cliente - Mi Finca</h1>
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
                <span>{usuario?.nombre || 'Agricultor Demo'}</span>
                <svg className="admin-chevron" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5 7.5L10 12.5L15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {menuUsuario && (
                <div className="admin-perfil-menu" role="menu">
                  <div className="admin-perfil-info">
                    <strong>{usuario?.nombre || 'Agricultor Demo'}</strong>
                    <small>{usuario?.email || 'cliente@poseidon.test'}</small>
                    <span className="admin-rol-badge">Cliente / Agricultor</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuUsuario(false);
                      setSeccion('reportes');
                    }}
                  >
                    Mis evaluaciones ({itemsHistorial.length})
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

          {/* Cuerpo del Panel del Cliente */}
          <div className="admin-cuerpo">
            {/* Tablero Principal idéntico a la maqueta (3 columnas) */}
            <div className="cliente-tablero-grid">
              {/* Columna 1: Mi Parcela con mapa satelital, polígono y zoom +/- */}
              <section className="admin-widget-card cliente-parcela-card">
                <div className="cliente-parcela-cabecera">
                  <svg className="cliente-pin-icono" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="#133b26" />
                  </svg>
                  <div className="cliente-parcela-titulos">
                    <h2>Mi Parcela</h2>
                    <div className="cliente-finca-sub">
                      <svg viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M10 17C5 16 3 11 5 5c5 1 8 5 5 12z" fill="#7bc658" />
                        <path d="M10 17c5-1 7-6 5-12-5 1-8 5-5 12z" fill="#3c8d37" />
                      </svg>
                      <span>{nombreParcela || 'Finca Tiquipaya'}</span>
                    </div>
                  </div>
                </div>

                <div className="cliente-mapa-wrap">
                  <MapContainer
                    center={punto}
                    zoom={zoom}
                    zoomControl={false}
                    className="cliente-mapa-satelite"
                  >
                    <TileLayer
                      attribution="&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                    <ControlMapaCliente centro={punto} zoom={zoom} onElegir={setPunto} />
                    <Polygon
                      positions={poligonoParcela(punto)}
                      pathOptions={{
                        color: 'rgba(255, 255, 255, 0.92)',
                        weight: 2,
                        fillColor: '#68b045',
                        fillOpacity: 0.25,
                      }}
                    />
                    <Marker position={punto} icon={iconoPinVerde}>
                      <Tooltip direction="top" offset={[0, -36]}>
                        {nombreParcela} ({punto[0].toFixed(4)}, {punto[1].toFixed(4)}) — Toca el mapa para mover
                      </Tooltip>
                    </Marker>
                  </MapContainer>

                  <div className="cliente-zoom-controles" role="group" aria-label="Zoom del mapa">
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

              {/* Columna 2: Cultivo Actual + Estado del Cultivo + Humedad / Temperatura */}
              <div className="cliente-columna-central">
                {/* Tarjeta Cultivo Actual */}
                <section className="admin-widget-card cliente-cultivo-card">
                  <div className="cliente-cultivo-tope">
                    <div className="cliente-hoja-icono" aria-hidden="true">
                      <svg viewBox="0 0 36 36">
                        <path d="M18 31V16" stroke="#2d6e28" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M18 24C9 24 4 17 5 8c9 0 13 6 13 16z" fill="#68b045" />
                        <path d="M18 20c8 0 13-5 13-13-8 0-13 5-13 13z" fill="#2c7a32" />
                      </svg>
                    </div>
                    <div className="cliente-cultivo-info">
                      <span>Cultivo Actual</span>
                      <div className="cliente-cultivo-selector-fila">
                        <strong>{nombreCultivoActual}</strong>
                        {cultivos.length > 0 && (
                          <select
                            className="cliente-select-rapido"
                            value={codigoActual}
                            aria-label="Cambiar cultivo actual"
                            onChange={(e) => {
                              const nuevoCodigo = e.target.value;
                              const resto = rotacion.slice(1).filter((c) => c !== nuevoCodigo);
                              setRotacion([nuevoCodigo, ...(resto.length ? resto : ['papa'])]);
                            }}
                          >
                            {cultivos.map((c) => (
                              <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                  <IlustracionCultivo nombre={nombreCultivoActual} />
                </section>

                {/* Tarjeta Estado del Cultivo */}
                <section className="admin-widget-card cliente-estado-card">
                  <div className="cliente-estado-fila">
                    <div className="cliente-hoja-chica" aria-hidden="true">
                      <svg viewBox="0 0 32 32">
                        <path d="M16 28V14" stroke="#2d6e28" strokeWidth="2.4" strokeLinecap="round" />
                        <path d="M16 22C8 22 4 16 5 8c8 0 11 5 11 14z" fill="#68b045" />
                        <path d="M16 18c7 0 11-4 11-11-7 0-11 4-11 11z" fill="#358538" />
                      </svg>
                    </div>
                    <div>
                      <span className="cliente-label-chico">Estado del Cultivo</span>
                      <strong className="cliente-porcentaje-grande">{estadoCultivoPorcentaje}%</strong>
                    </div>
                  </div>
                  <div className="cliente-barra-progreso" role="progressbar" aria-valuenow={estadoCultivoPorcentaje} aria-valuemin={0} aria-valuemax={100}>
                    <div style={{ width: `${estadoCultivoPorcentaje}%` }} />
                  </div>
                </section>

                {/* Fila inferior: Humedad del Suelo y Temperatura */}
                <div className="cliente-metricas-par">
                  <article className="admin-widget-card cliente-mini-card">
                    <svg className="cliente-icono-gota" viewBox="0 0 36 36" aria-hidden="true">
                      <path d="M18 4C18 4 7 16.5 7 23.5A11 11 0 0 0 29 23.5C29 16.5 18 4 18 4z" fill="#3a99ec" />
                      <path d="M13 24a5 5 0 0 1-1-3" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                    <div>
                      <span>Humedad del Suelo</span>
                      <strong>{humedadSuelo}%</strong>
                    </div>
                  </article>

                  <article className="admin-widget-card cliente-mini-card">
                    <svg className="cliente-icono-termo" viewBox="0 0 36 36" aria-hidden="true">
                      <path d="M14 7a4 4 0 0 1 8 0v13.2a7 7 0 1 1-8 0V7z" fill="#fff" stroke="#e0483b" strokeWidth="2.4" />
                      <circle cx="18" cy="25" r="4.2" fill="#e0483b" />
                      <rect x="16.5" y="11" width="3" height="12" rx="1.5" fill="#e0483b" />
                      <line x1="24" y1="9" x2="27" y2="9" stroke="#e0483b" strokeWidth="2" strokeLinecap="round" />
                      <line x1="24" y1="13" x2="26" y2="13" stroke="#e0483b" strokeWidth="2" strokeLinecap="round" />
                      <line x1="24" y1="17" x2="27" y2="17" stroke="#e0483b" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <div>
                      <span>Temperatura</span>
                      <strong>{temperaturaMedia} °C</strong>
                    </div>
                  </article>
                </div>
              </div>

              {/* Columna 3: Tarjeta de Recomendación */}
              <section className="cliente-recomendacion-card">
                <div className="cliente-rec-tope">
                  <svg className="cliente-icono-foco" viewBox="0 0 36 36" aria-hidden="true">
                    <path d="M18 5a9 9 0 0 0-5.4 16.2c1 0.8 1.9 2.1 2.1 3.3h6.6c0.2-1.2 1.1-2.5 2.1-3.3A9 9 0 0 0 18 5z" fill="#f9be25" />
                    <rect x="14.5" y="26" width="7" height="2.5" rx="1.2" fill="#d4891c" />
                    <rect x="15.5" y="29.5" width="5" height="2.2" rx="1" fill="#b36c12" />
                    <line x1="18" y1="1" x2="18" y2="3" stroke="#f9be25" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="6" y1="7" x2="8" y2="8.5" stroke="#f9be25" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="30" y1="7" x2="28" y2="8.5" stroke="#f9be25" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                  <h2>Recomendación</h2>
                </div>

                <p className="cliente-rec-texto">{textoRecomendacion}</p>

                <div className="cliente-rec-acciones">
                  <button
                    type="button"
                    className="admin-btn-detalles"
                    onClick={() => {
                      if (!resultado) ejecutarComparacion();
                      setSeccion('comparar');
                    }}
                    disabled={estadoEval.cargando}
                  >
                    <span>{estadoEval.cargando ? 'Calculando…' : 'Ver Detalles'}</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>

                {/* Hojas decorativas en la esquina inferior derecha */}
                <svg className="cliente-rec-hojas" viewBox="0 0 120 90" aria-hidden="true">
                  <path d="M65 88 C65 45, 92 18, 118 8 C116 45, 98 76, 65 88 Z" fill="rgba(56, 128, 54, 0.35)" />
                  <path d="M25 90 C35 58, 62 42, 95 44 C78 72, 54 86, 25 90 Z" fill="rgba(104, 176, 69, 0.42)" />
                </svg>
              </section>
            </div>

            {/* Vistas funcionales detalladas según navegación lateral */}
            {(seccion === 'inicio' || seccion === 'comparar') && (
              <div className="cliente-simulador-bloque">
                <form className="admin-widget-card cliente-form-rotacion" onSubmit={ejecutarComparacion}>
                  <h2>Simulador y Comparador de Rotaciones (NASA POWER)</h2>
                  <p className="suave">Configura tu parcela, orden de cultivos y prioridades para obtener 3 estrategias de rotación.</p>

                  <label className="campo">
                    Nombre de la parcela
                    <input
                      value={nombreParcela}
                      onChange={(e) => setNombreParcela(e.target.value)}
                      placeholder="Ej.: Finca Tiquipaya"
                      maxLength={80}
                    />
                  </label>

                  <div className="campo">
                    <span>Secuencia de rotación (2 a 4 cultivos por campaña)</span>
                    {rotacion.map((codigo, i) => (
                      <div className="fila" key={i}>
                        <select
                          value={codigo}
                          aria-label={`Cultivo ${i + 1}`}
                          onChange={(e) => setRotacion(rotacion.map((c, j) => (j === i ? e.target.value : c)))}
                        >
                          {libres(codigo).map((c) => (
                            <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
                          ))}
                        </select>
                        {rotacion.length > 2 && (
                          <button
                            type="button"
                            className="quitar"
                            aria-label="Quitar cultivo"
                            onClick={() => setRotacion(rotacion.filter((_, j) => j !== i))}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {rotacion.length < 4 && (
                      <button type="button" className="secundario" onClick={agregarCultivo}>
                        + Añadir cultivo a la rotación
                      </button>
                    )}
                  </div>

                  <div className="campo">
                    <span>Prioridades en tu finca (0 a 5)</span>
                    {PRIORIDADES.map(([clave, texto]) => (
                      <label className="deslizador" key={clave}>
                        <span>{texto}</span>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          value={prioridades[clave]}
                          onChange={(e) => setPrioridades({ ...prioridades, [clave]: Number(e.target.value) })}
                        />
                        <b>{prioridades[clave]}</b>
                      </label>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="admin-btn-detalles completo"
                    disabled={estadoEval.cargando || !cultivos.length}
                  >
                    <span>{estadoEval.cargando ? 'Consultando clima y calculando…' : 'Comparar rotaciones y guardar'}</span>
                    <span aria-hidden="true">→</span>
                  </button>

                  {estadoEval.ok && <p className="exito" role="status">{estadoEval.ok}</p>}
                  {estadoEval.error && <p className="error" role="alert">{estadoEval.error}</p>}
                </form>

                <div className="cliente-resultados-columna">
                  {!resultado ? (
                    <div className="admin-widget-card cliente-vacio-eval">
                      <h2>Resultados de Rotación y Clima</h2>
                      <p className="suave">
                        Haz clic en <b>“Comparar rotaciones y guardar”</b> o en el botón <b>“Ver Detalles →”</b> de la tarjeta de recomendación para calcular las 3 estrategias agronómicas de tu parcela con datos de NASA POWER.
                      </p>
                      <button
                        type="button"
                        className="admin-btn-detalles"
                        onClick={() => ejecutarComparacion()}
                        disabled={estadoEval.cargando || !cultivos.length}
                      >
                        <span>Generar análisis ahora</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  ) : (
                    <div className="admin-panel-bloque">
                      {resultado.fuenteClima === 'demo' && (
                        <p className="aviso" role="status">
                          Calculado con climatología referencial de Cochabamba (modo demostración).
                        </p>
                      )}
                      <Clima meses={resultado.clima} fuente={resultado.fuenteClima} />
                      <div className="tarjetas">
                        {resultado.estrategias.map((e) => (
                          <Estrategia key={e.tipo} e={e} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {seccion === 'cultivos' && (
              <div className="admin-widget-card admin-panel-bloque">
                <h2>Ficha de Cultivos Disponibles para tu Rotación</h2>
                <p className="suave">Selecciona cualquiera de estos cultivos como cultivo principal de tu parcela.</p>
                <div className="cliente-grid-cultivos">
                  {cultivos.map((c) => (
                    <article
                      key={c.codigo}
                      className={`cliente-ficha-cultivo ${codigoActual === c.codigo ? 'activo' : ''}`}
                    >
                      <div className="cliente-ficha-tope">
                        <strong>{c.nombre}</strong>
                        <span className="admin-rol-badge">{c.familia}</span>
                      </div>
                      <p className="suave">
                        Ciclo: <b>{c.ciclo_dias} días</b> · Kc: <b>{c.kc.toFixed(2)}</b>
                      </p>
                      <small className="suave">
                        {[c.fija_nitrogeno && 'Fija nitrógeno', c.raiz_profunda && 'Raíz profunda', c.forraje && 'Aporta forraje']
                          .filter(Boolean)
                          .join(' · ') || 'Cultivo comercial'}
                      </small>
                      <button
                        type="button"
                        className="secundario chico"
                        onClick={() => {
                          const resto = rotacion.filter((x) => x !== c.codigo);
                          setRotacion([c.codigo, ...resto.slice(0, 2)]);
                          setSeccion('inicio');
                        }}
                      >
                        {codigoActual === c.codigo ? 'Cultivo actual seleccionado' : 'Usar como cultivo actual'}
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {seccion === 'reportes' && (
              <div className="admin-panel-bloque">
                <div className="admin-kpis">
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-datos">
                      <span className="admin-kpi-titulo">Mis Evaluaciones Guardadas</span>
                      <strong className="admin-kpi-numero">{itemsHistorial.length}</strong>
                      <small className="admin-kpi-sub">Historial completo de rotaciones</small>
                    </div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-datos">
                      <span className="admin-kpi-titulo">Validadas por un Técnico</span>
                      <strong className="admin-kpi-numero">
                        {itemsHistorial.filter((e) => e.estado === 'revisada').length}
                      </strong>
                      <small className="admin-kpi-sub">Con nota y recomendación técnica</small>
                    </div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-datos">
                      <span className="admin-kpi-titulo">Pendientes de Revisión</span>
                      <strong className="admin-kpi-numero">
                        {itemsHistorial.filter((e) => e.estado === 'pendiente').length}
                      </strong>
                      <small className="admin-kpi-sub">En cola del equipo operativo</small>
                    </div>
                  </div>
                </div>

                <div className="dos-columnas">
                  <div className="admin-widget-card">
                    <h2>Historial de Evaluaciones</h2>
                    <ListaEvaluaciones
                      items={itemsHistorial}
                      seleccion={abierta}
                      onAbrir={setAbierta}
                      vacio="Aún no tienes evaluaciones guardadas. Usa el simulador en Inicio para crear la primera."
                    />
                  </div>
                  <div className="admin-widget-card">
                    {abierta ? (
                      <Detalle id={abierta} />
                    ) : (
                      <p className="vacio">Selecciona una evaluación de la lista para ver sus 3 estrategias y la nota del técnico.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {seccion === 'configuracion' && (
              <div className="admin-widget-card admin-panel-bloque">
                <h2>Configuración de Mi Finca</h2>
                <p className="suave">Personaliza el nombre y coordenadas de referencia de tu parcela.</p>
                <div className="dos-columnas">
                  <div>
                    <label className="campo">
                      Nombre de la finca o parcela
                      <input
                        value={nombreParcela}
                        onChange={(e) => setNombreParcela(e.target.value)}
                        maxLength={80}
                      />
                    </label>
                    <label className="campo">
                      Latitud
                      <input
                        type="number"
                        step="0.0001"
                        value={punto[0]}
                        onChange={(e) => setPunto([Number(e.target.value), punto[1]])}
                      />
                    </label>
                    <label className="campo">
                      Longitud
                      <input
                        type="number"
                        step="0.0001"
                        value={punto[1]}
                        onChange={(e) => setPunto([punto[0], Number(e.target.value)])}
                      />
                    </label>
                  </div>
                  <div className="caja">
                    <h3>Ubicaciones rápidas en Cochabamba</h3>
                    <p className="suave">Selecciona una zona agrícola para centrar tu parcela:</p>
                    <div className="fila" style={{ flexWrap: 'wrap', marginTop: 12 }}>
                      {[
                        ['Finca Tiquipaya', [-17.3380, -66.2158]],
                        ['Parcela Valle Bajo', [-17.3975, -66.2815]],
                        ['Chacra Sacaba', [-17.4042, -66.0408]],
                        ['Finca Punata', [-17.5425, -65.8347]],
                      ].map(([nom, coords]) => (
                        <button
                          key={nom}
                          type="button"
                          className="secundario chico"
                          onClick={() => {
                            setNombreParcela(nom);
                            setPunto(coords);
                            setSeccion('inicio');
                          }}
                        >
                          {nom}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
