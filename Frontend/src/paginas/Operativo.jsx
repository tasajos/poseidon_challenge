import { useState } from 'react';
import { api } from '../api.js';
import { Pestanas, ListaEvaluaciones, Detalle, useDatos } from '../componentes.jsx';
import fondoLogin from '../fondo-login.jpg';

const CAMPOS_REFERENCIA = [
  { id: 'valle-bajo', nombre: 'Valle Bajo / Cochabamba', coords: [-17.3975, -66.2815], rotacion: ['papa', 'maiz', 'haba'] },
  { id: 'tiquipaya', nombre: 'Finca Tiquipaya / Norte', coords: [-17.3380, -66.2158], rotacion: ['maiz', 'haba', 'avena'] },
  { id: 'sacaba', nombre: 'Chacra Sacaba / Este', coords: [-17.4042, -66.0408], rotacion: ['papa', 'quinua', 'tarwi'] },
  { id: 'punata', nombre: 'Valle Alto / Punata', coords: [-17.5425, -65.8347], rotacion: ['maiz', 'papa', 'alfalfa'] },
];

const DIAGNOSTICOS = {
  general: { etiqueta: 'Diagnóstico General', porcentaje: 64, serie: [43, 66, 84, 96, 102, 108] },
  plagas: { etiqueta: 'Control de Plagas', porcentaje: 64, serie: [38, 58, 76, 88, 95, 104] },
  dano: { etiqueta: 'Salud Foliar / Sin Daño', porcentaje: 78, serie: [50, 68, 82, 91, 98, 106] },
  otros: { etiqueta: 'Suelo y Humedad', porcentaje: 52, serie: [35, 52, 69, 82, 90, 98] },
};

const MESES_EVOLUCION = ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'];

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

export default function Operativo({ usuario, onSalir }) {
  const { datos, error, recargar } = useDatos(api.evaluaciones);
  const [seccion, setSeccion] = useState('inicio');
  const [menuUsuario, setMenuUsuario] = useState(false);

  const [indiceCampo, setIndiceCampo] = useState(0);
  const [diagnosticoActivo, setDiagnosticoActivo] = useState('general');
  const [vistaCola, setVistaCola] = useState('pendiente');
  const [abierta, setAbierta] = useState(null);
  const [creandoDemo, setCreandoDemo] = useState(false);

  const todas = datos || [];
  const pendientes = todas.filter((e) => e.estado === 'pendiente');
  const revisadas = todas.filter((e) => e.estado === 'revisada');
  const itemsLista = todas.filter((e) => e.estado === vistaCola);

  // Si hay una evaluación seleccionada, mostramos el nombre de esa parcela en "Campo Seleccionado"
  const evalSeleccionada = todas.find((e) => e.id === abierta);
  const campoActual = CAMPOS_REFERENCIA[indiceCampo];
  const nombreCampoMostrado = evalSeleccionada
    ? `${evalSeleccionada.parcela} (${evalSeleccionada.cliente})`
    : campoActual.nombre;

  const diag = DIAGNOSTICOS[diagnosticoActivo];
  const porcentajeDonut = evalSeleccionada
    ? evalSeleccionada.resumen?.mejor?.puntaje || diag.porcentaje
    : diag.porcentaje;

  // Número de incidencias pendientes (muestra las evaluaciones pendientes reales o 2 como referencia inicial)
  const numeroIncidencias = todas.length > 0 ? pendientes.length : 2;

  // Geometría del gráfico de anillo (Donut bicolor: verde oscuro + amarillo ámbar)
  const radio = 42;
  const circunferencia = 2 * Math.PI * radio;
  const arcoVerde = (porcentajeDonut / 100) * circunferencia;
  const arcoAmbar = circunferencia * 0.34;

  // Geometría del gráfico de Evolución del Cultivo (SVG ancho completo)
  const serieEvolucion = diag.serie;
  const coordsPuntos = serieEvolucion.map((valor, idx) => {
    const x = 68 + idx * 102;
    const y = 132 - (Math.min(valor, 110) / 110) * 102;
    return { x, y, valor, mes: MESES_EVOLUCION[idx] };
  });
  const polilinea = coordsPuntos.map((p) => `${p.x},${p.y}`).join(' ');
  const poligonoArea = `${coordsPuntos[0].x},134 ${polilinea} ${coordsPuntos[coordsPuntos.length - 1].x},134`;

  async function crearEvaluacionMuestra() {
    setCreandoDemo(true);
    try {
      const c = CAMPOS_REFERENCIA[indiceCampo];
      const nueva = await api.evaluar({
        nombre: c.nombre.split(' / ')[0],
        lat: c.coords[0],
        lon: c.coords[1],
        rotacion: c.rotacion,
        prioridades: { agua: 4, suelo: 4, clima: 3, ingreso: 3, forraje: 2 },
      });
      await recargar();
      setVistaCola('pendiente');
      setAbierta(nueva.id);
    } catch {
      // Si falla, mantiene el estado actual
    } finally {
      setCreandoDemo(false);
    }
  }

  function irAReporteIncidencias() {
    setVistaCola('pendiente');
    if (pendientes.length > 0) {
      setAbierta(pendientes[0].id);
    }
    setSeccion('revisiones');
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
      id: 'revisiones',
      texto: 'Revisiones',
      icono: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.2 3.8a4.8 4.8 0 0 0-4.4 6.6l-7.6 7.6a1.9 1.9 0 1 0 2.7 2.7l7.6-7.6a4.8 4.8 0 0 0 6.6-4.4c0-.5-.1-.9-.2-1.3l-2.8 2.8-2.4-.6-.6-2.4 2.8-2.8c-.4-.1-.8-.2-1.3-.2z" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'diagnostico',
      texto: 'Diagnóstico',
      icono: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
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

        <nav className="admin-nav" aria-label="Menú del técnico operativo">
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
              <h1>3. Panel Operativo - Revisión Técnica</h1>
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
                <span>{usuario?.nombre || 'Técnico Demo'}</span>
                <svg className="admin-chevron" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5 7.5L10 12.5L15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {menuUsuario && (
                <div className="admin-perfil-menu" role="menu">
                  <div className="admin-perfil-info">
                    <strong>{usuario?.nombre || 'Técnico Demo'}</strong>
                    <small>{usuario?.email || 'operativo@poseidon.test'}</small>
                    <span className="admin-rol-badge">Operativo / Técnico</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuUsuario(false);
                      setSeccion('revisiones');
                    }}
                  >
                    Por revisar ({pendientes.length})
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

          {/* Cuerpo del Panel Operativo */}
          <div className="admin-cuerpo">
            {/* Fila superior de 3 tarjetas de la maqueta */}
            <div className="operativo-fila-superior">
              {/* Tarjeta 1: Campo Seleccionado */}
              <section className="admin-widget-card operativo-campo-card">
                <div className="operativo-campo-tope">
                  <div>
                    <h2>Campo Seleccionado</h2>
                    <button
                      type="button"
                      className="operativo-ubicacion-btn"
                      onClick={() => {
                        setAbierta(null);
                        setIndiceCampo((i) => (i + 1) % CAMPOS_REFERENCIA.length);
                      }}
                      title="Haz clic para cambiar de campo en Cochabamba"
                    >
                      <svg viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M10 1.5C6.4 1.5 3.5 4.4 3.5 8c0 4.8 6.5 10.5 6.5 10.5S16.5 12.8 16.5 8c0-3.6-2.9-6.5-6.5-6.5zm0 9a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" fill="#1b5936" />
                      </svg>
                      <span>{nombreCampoMostrado}</span>
                    </button>
                  </div>
                </div>

                <div
                  className="operativo-campo-foto"
                  style={{ backgroundImage: `url(${fondoLogin})` }}
                  role="img"
                  aria-label={`Vista panorámica de ${nombreCampoMostrado}`}
                />
              </section>

              {/* Tarjeta 2: Diagnóstico de Campo */}
              <section className="admin-widget-card operativo-diagnostico-card">
                <div className="admin-widget-cabecera">
                  <h2>Diagnóstico de Campo</h2>
                </div>

                <div className="operativo-diagnostico-centro">
                  <div className="admin-donut-wrap">
                    <svg className="admin-donut" viewBox="0 0 110 110">
                      <circle
                        cx="55"
                        cy="55"
                        r={radio}
                        fill="none"
                        stroke="#e1eae3"
                        strokeWidth="13"
                      />
                      {/* Segmento amarillo/ámbar (Plagas / Otros) */}
                      <circle
                        cx="55"
                        cy="55"
                        r={radio}
                        fill="none"
                        stroke="#f3b324"
                        strokeWidth="13"
                        strokeDasharray={`${arcoAmbar} ${circunferencia}`}
                        strokeDashoffset={circunferencia * 0.42}
                        strokeLinecap="round"
                      />
                      {/* Segmento verde principal */}
                      <circle
                        cx="55"
                        cy="55"
                        r={radio}
                        fill="none"
                        stroke="#195c32"
                        strokeWidth="13"
                        strokeDasharray={`${arcoVerde * 0.66} ${circunferencia}`}
                        strokeDashoffset={-circunferencia * 0.08}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="admin-donut-texto">
                      <strong>{porcentajeDonut}%</strong>
                    </div>
                  </div>

                  <ul className="operativo-leyenda" role="tablist" aria-label="Categorías de diagnóstico">
                    {[
                      ['plagas', 'Plagas', 'dot-ambar'],
                      ['dano', 'Daño', 'dot-verde-osc'],
                      ['otros', 'Otros', 'dot-dorado'],
                    ].map(([clave, texto, claseDot]) => (
                      <li key={clave}>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={diagnosticoActivo === clave}
                          className={`admin-recurso-tab ${diagnosticoActivo === clave ? 'activo' : ''}`}
                          onClick={() => setDiagnosticoActivo(diagnosticoActivo === clave ? 'general' : clave)}
                        >
                          <i className={claseDot} />
                          <span>{texto}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Tarjeta 3: Incidencias */}
              <section className="admin-widget-card operativo-incidencias-card">
                <h2>Incidencias</h2>

                <div className="operativo-incidencias-centro">
                  <svg className="operativo-alerta-triangulo" viewBox="0 0 44 40" aria-hidden="true">
                    <path
                      d="M20.1 3.2L2.4 33.8c-.9 1.5.2 3.4 1.9 3.4h35.4c1.7 0 2.8-1.9 1.9-3.4L23.9 3.2c-.8-1.5-3-1.5-3.8 0z"
                      fill="#dc392a"
                    />
                    <rect x="20.2" y="13" width="3.6" height="11" rx="1.8" fill="#fff" />
                    <circle cx="22" cy="29.5" r="2.2" fill="#fff" />
                  </svg>
                  <div className="operativo-incidencias-num">
                    <strong>{numeroIncidencias}</strong>
                    <span>Pendientes</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="admin-btn-detalles"
                  onClick={irAReporteIncidencias}
                >
                  <span>Ver Reporte</span>
                  <span aria-hidden="true">→</span>
                </button>
              </section>
            </div>

            {/* Segunda fila: Evolución del Cultivo (gráfico lineal ancho completo) */}
            <section className="admin-widget-card operativo-evolucion-card">
              <div className="operativo-evolucion-tope">
                <h2>Evolución del Cultivo</h2>
                <span className="suave">{diag.etiqueta} · {nombreCampoMostrado}</span>
              </div>

              <div className="operativo-grafico-wrap">
                <svg viewBox="0 0 620 165" className="operativo-svg-evolucion" role="img" aria-label="Gráfico de evolución mensual del cultivo de abril a septiembre">
                  <defs>
                    <linearGradient id="gradEvolucion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3c8e40" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="#3c8e40" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {/* Líneas guía horizontales y etiquetas del eje Y */}
                  {[
                    [100, 38],
                    [75, 62],
                    [50, 86],
                    [25, 110],
                    [0, 134],
                  ].map(([etiqueta, y]) => (
                    <g key={etiqueta}>
                      <text x="38" y={y + 4} textAnchor="end" className="operativo-eje-texto">
                        {etiqueta}
                      </text>
                      <line x1="50" y1={y} x2="595" y2={y} stroke="#e3ece5" strokeWidth="1.2" />
                    </g>
                  ))}

                  {/* Líneas verticales suaves por mes */}
                  {coordsPuntos.map((p) => (
                    <line key={`v-${p.mes}`} x1={p.x} y1="30" x2={p.x} y2="134" stroke="#edf3ee" strokeWidth="1" />
                  ))}

                  {/* Área sombreada y curva de evolución */}
                  <polygon points={poligonoArea} fill="url(#gradEvolucion)" />
                  <polyline
                    fill="none"
                    stroke="#287a37"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polilinea}
                  />

                  {/* Puntos de datos y etiquetas del eje X */}
                  {coordsPuntos.map((p) => (
                    <g key={p.mes}>
                      <circle cx={p.x} cy={p.y} r="5.2" fill="#1e6b30" stroke="#fff" strokeWidth="1.8">
                        <title>{`${p.mes}: ${p.valor}`}</title>
                      </circle>
                      <text x={p.x} y="154" textAnchor="middle" className="operativo-mes-texto">
                        {p.mes}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </section>

            {/* Espacio de trabajo funcional de Revisión Técnica */}
            {(seccion === 'inicio' || seccion === 'revisiones') && (
              <div className="admin-panel-bloque">
                <div className="admin-widget-card">
                  <div className="admin-cabecera-tabla">
                    <div>
                      <h2>Cola de Validación Técnica de Evaluaciones</h2>
                      <p className="suave">
                        Revisa las simulaciones de rotación de los agricultores y registra tu recomendación agronómica en campo.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="secundario chico"
                      onClick={crearEvaluacionMuestra}
                      disabled={creandoDemo}
                    >
                      {creandoDemo ? 'Generando…' : '+ Crear evaluación de campo para revisar'}
                    </button>
                  </div>

                  {error && <p className="error">{error}</p>}

                  <Pestanas
                    valor={vistaCola}
                    onCambiar={(v) => {
                      setVistaCola(v);
                      setAbierta(null);
                    }}
                    opciones={[
                      ['pendiente', `Por revisar (${pendientes.length})`],
                      ['revisada', `Revisadas (${revisadas.length})`],
                    ]}
                  />

                  <div className="dos-columnas">
                    <ListaEvaluaciones
                      items={itemsLista}
                      seleccion={abierta}
                      onAbrir={setAbierta}
                      conCliente
                      vacio={
                        vistaCola === 'pendiente'
                          ? 'No hay evaluaciones pendientes. Puedes pulsar "+ Crear evaluación de campo para revisar" para generar una prueba.'
                          : 'Aún no hay evaluaciones revisadas.'
                      }
                    />
                    <div>
                      {abierta ? (
                        <Detalle id={abierta} key={abierta}>
                          {(e) =>
                            e.estado === 'pendiente' && (
                              <FormularioRevision
                                id={e.id}
                                onLista={() => {
                                  setAbierta(null);
                                  recargar();
                                }}
                              />
                            )
                          }
                        </Detalle>
                      ) : (
                        itemsLista.length > 0 && (
                          <p className="vacio">Selecciona una evaluación de la lista izquierda para inspeccionar sus 3 estrategias y registrar tu nota técnica.</p>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {seccion === 'diagnostico' && (
              <div className="admin-widget-card admin-panel-bloque">
                <h2>Resumen de Diagnóstico de Campo por Criterio</h2>
                <p className="suave">Haz clic en cualquier indicador para actualizar el gráfico de evolución superior.</p>
                <div className="admin-kpis">
                  {Object.entries(DIAGNOSTICOS).map(([clave, item]) => (
                    <article
                      key={clave}
                      className="admin-kpi-card"
                      onClick={() => setDiagnosticoActivo(clave)}
                    >
                      <div className="admin-kpi-datos">
                        <span className="admin-kpi-titulo">{item.etiqueta}</span>
                        <strong className="admin-kpi-numero">{item.porcentaje}%</strong>
                        <small className="admin-kpi-sub">Índice en {nombreCampoMostrado}</small>
                      </div>
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
                      <span className="admin-kpi-titulo">Por Revisar</span>
                      <strong className="admin-kpi-numero">{pendientes.length}</strong>
                      <small className="admin-kpi-sub">Evaluaciones pendientes</small>
                    </div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-datos">
                      <span className="admin-kpi-titulo">Revisadas</span>
                      <strong className="admin-kpi-numero">{revisadas.length}</strong>
                      <small className="admin-kpi-sub">Con dictamen técnico</small>
                    </div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-datos">
                      <span className="admin-kpi-titulo">Déficit Hídrico Alto</span>
                      <strong className="admin-kpi-numero">
                        {todas.filter((e) => e.resumen.deficit_agua_mm > 400).length}
                      </strong>
                      <small className="admin-kpi-sub">Más de 400 mm por campaña</small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {seccion === 'configuracion' && (
              <div className="admin-widget-card admin-panel-bloque">
                <h2>Selección de Zona Operativa</h2>
                <p className="suave">Cambia la zona agrícola prioritaria asignada a tu supervisión técnica:</p>
                <div className="fila" style={{ flexWrap: 'wrap' }}>
                  {CAMPOS_REFERENCIA.map((c, idx) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`secundario chico ${indiceCampo === idx ? 'activar' : ''}`}
                      onClick={() => {
                        setAbierta(null);
                        setIndiceCampo(idx);
                        setSeccion('inicio');
                      }}
                    >
                      {c.nombre}
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

function FormularioRevision({ id, onLista }) {
  const [nota, setNota] = useState('');
  const [estado, setEstado] = useState({ cargando: false, error: '' });

  async function guardar(e) {
    e.preventDefault();
    setEstado({ cargando: true, error: '' });
    try {
      await api.revisar(id, nota);
      onLista();
    } catch (err) {
      setEstado({ cargando: false, error: err.message });
    }
  }

  return (
    <form className="caja revision" onSubmit={guardar}>
      <h2>Nota técnica para el agricultor</h2>
      <p className="suave">Indica qué estrategia de rotación recomiendas y qué aspectos verificar en campo.</p>
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        rows={4}
        maxLength={2000}
        required
        aria-label="Nota técnica"
        placeholder="Ej.: Recomiendo incorporar haba en media parcela esta campaña para fijar nitrógeno y reducir el déficit hídrico…"
      />
      <button type="submit" className="admin-btn-detalles completo" disabled={estado.cargando}>
        <span>{estado.cargando ? 'Guardando revisión…' : 'Marcar como revisada'}</span>
        <span aria-hidden="true">✓</span>
      </button>
      {estado.error && <p className="error" role="alert">{estado.error}</p>}
    </form>
  );
}
