import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, LayersControl, CircleMarker, Circle, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { api } from '../api.js';
import { COCHABAMBA, Pestanas, Stat, fechaHora, useDatos } from '../componentes.jsx';
import { comprimir } from '../imagen.js';
import { CAPA_OSM } from '../mapa.jsx';
import 'leaflet/dist/leaflet.css';

// Técnico de campo: marca plagas, enfermedades y deficiencias con GPS y fotos (HU-OPT-02).
const TIPOS = { plaga: 'Plaga', enfermedad: 'Enfermedad', deficiencia: 'Deficiencia' };
const SEVERIDADES = { baja: 'Baja', media: 'Media', alta: 'Alta' };
const COLOR = { baja: '#FAC748', media: '#F28C28', alta: '#7A1F3D' };
const SUGERENCIAS = {
  plaga: ['Gorgojo de los Andes', 'Polilla de la papa', 'Pulgón', 'Gusano cogollero', 'Trips', 'Mosca minadora', 'Nematodo del quiste'],
  enfermedad: ['Tizón tardío', 'Roya', 'Oídio', 'Mancha foliar', 'Pudrición de raíz', 'Carbón'],
  deficiencia: ['Falta de nitrógeno (hojas amarillas)', 'Falta de fósforo (hojas moradas)', 'Falta de potasio (bordes secos)', 'Clorosis por hierro'],
};

export default function Campo() {
  const { datos, error, recargar } = useDatos(api.incidencias);
  const catalogo = useDatos(api.cultivos);
  const [vista, setVista] = useState('nueva');
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="cargando">Cargando…</p>;
  const lista = datos.incidencias;
  const activas = lista.filter((i) => i.estado === 'activa');
  const cultivos = catalogo.datos?.cultivos || [];
  const a = datos.almacen_fotos;

  return (
    <>
      <div className="stats">
        <Stat etiqueta="Incidencias activas" valor={activas.length} tono="naranja" />
        <Stat etiqueta="Severidad alta" valor={activas.filter((i) => i.severidad === 'alta').length} tono="vino" />
        <Stat etiqueta="Controladas" valor={lista.length - activas.length} tono="azul" />
        <Stat etiqueta="Con fotos" valor={lista.filter((i) => i.fotos.length).length} tono="amarillo" />
      </div>
      {a.almacen === 'local' && <p className="aviso">Google Drive no está configurado: las fotos se guardan en el servidor de Poseidon. Pida al administrador configurar la unidad compartida.</p>}
      {a.almacen === 'drive' && !a.ok && <p className="error">Google Drive no responde ({a.detalle}). Las fotos no se podrán subir hasta que se resuelva.</p>}
      <Pestanas valor={vista} onCambiar={setVista}
        opciones={[['nueva', 'Marcar incidencia'], ['registradas', `Registradas (${lista.length})`]]} />
      {vista === 'nueva' && (
        <Nueva cultivos={cultivos} existentes={activas} maxFotos={datos.max_fotos} radio={datos.radio_km} drive={a.almacen === 'drive'}
          onGuardada={recargar} />
      )}
      {vista === 'registradas' && <Registradas lista={lista} cultivos={cultivos} maxFotos={datos.max_fotos} recargar={recargar} />}
    </>
  );
}

// ---------- Mapa ----------
function Clic({ onElegir }) {
  useMapEvents({ click: (e) => onElegir?.(e.latlng) });
  return null;
}

function Centrar({ punto }) {
  const mapa = useMap();
  useEffect(() => {
    if (punto?.origen === 'gps') mapa.flyTo([punto.lat, punto.lon], Math.max(mapa.getZoom(), 17), { duration: 0.8 });
  }, [punto?.lat, punto?.lon]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function MapaCampo({ punto, onElegir, incidencias = [], alto = 320, onAbrir }) {
  const centro = punto ? [punto.lat, punto.lon] : incidencias[0] ? [incidencias[0].lat, incidencias[0].lon] : COCHABAMBA;
  return (
    <MapContainer center={centro} zoom={punto ? 17 : 11} className={`mapa ${onElegir ? 'elegible' : ''}`} style={{ height: alto }}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Mapa">
          <TileLayer {...CAPA_OSM} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satélite">
          <TileLayer attribution="Imágenes &copy; Esri, Maxar, Earthstar Geographics" referrerPolicy={CAPA_OSM.referrerPolicy}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
        </LayersControl.BaseLayer>
      </LayersControl>
      <Clic onElegir={onElegir} />
      <Centrar punto={punto} />
      {incidencias.map((i) => (
        <CircleMarker key={i.id} center={[i.lat, i.lon]} radius={punto ? 6 : 9}
          pathOptions={{ color: '#fff', weight: 2, fillColor: COLOR[i.severidad], fillOpacity: i.estado === 'activa' ? 0.95 : 0.35 }}
          eventHandlers={onAbrir ? { click: () => onAbrir(i.id) } : undefined}>
          <Tooltip>{TIPOS[i.tipo]}: {i.agente} · {SEVERIDADES[i.severidad].toLowerCase()}</Tooltip>
        </CircleMarker>
      ))}
      {punto?.precision > 0 && (
        <Circle center={[punto.lat, punto.lon]} radius={punto.precision} pathOptions={{ color: '#1E4E8C', weight: 1, fillOpacity: 0.12 }} />
      )}
      {punto && (
        <CircleMarker center={[punto.lat, punto.lon]} radius={11} pathOptions={{ color: '#fff', weight: 3, fillColor: '#1E4E8C', fillOpacity: 1 }}>
          <Tooltip permanent direction="top" offset={[0, -10]}>Incidencia</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}

// ---------- Nueva incidencia ----------
const FORM_VACIO = { tipo: 'plaga', agente: '', cultivo: '', severidad: 'media', nota: '' };

function Nueva({ cultivos, existentes, maxFotos, radio, drive, onGuardada }) {
  const [punto, setPunto] = useState(null); // { lat, lon, precision (m) o null, origen: 'gps' | 'mapa' }
  const [gps, setGps] = useState({ buscando: false, error: '' });
  const [f, setF] = useState(FORM_VACIO);
  const [fotos, setFotos] = useState([]); // [{ clave, archivo, vista }]
  const [estado, setEstado] = useState({ cargando: '', error: '', ok: '' });
  const entrada = useRef(null);
  const vistas = useRef([]);
  vistas.current = fotos.map((x) => x.vista);
  useEffect(() => () => vistas.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function ubicar() {
    if (!('geolocation' in navigator)) { setGps({ buscando: false, error: 'Este navegador no tiene GPS. Marque el punto tocando el mapa.' }); return; }
    if (!window.isSecureContext) { setGps({ buscando: false, error: 'El GPS del navegador necesita una conexión segura (https o localhost). Marque el punto tocando el mapa.' }); return; }
    setGps({ buscando: true, error: '' });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPunto({ lat: p.coords.latitude, lon: p.coords.longitude, precision: Math.round(p.coords.accuracy), origen: 'gps' });
        setGps({ buscando: false, error: '' });
      },
      (e) => setGps({
        buscando: false,
        error: e.code === 1
          ? 'No dio permiso de ubicación. Actívelo en la configuración del sitio o marque el punto tocando el mapa.'
          : 'No se pudo obtener la ubicación. Pruebe al aire libre o marque el punto tocando el mapa.',
      }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  function agregarFotos(e) {
    const nuevas = [...e.target.files].slice(0, maxFotos - fotos.length)
      .map((archivo) => ({ clave: `${archivo.name}-${archivo.lastModified}-${Math.random()}`, archivo, vista: URL.createObjectURL(archivo) }));
    setFotos([...fotos, ...nuevas]);
    e.target.value = '';
  }
  function quitarFoto(clave) {
    const x = fotos.find((y) => y.clave === clave);
    if (x) URL.revokeObjectURL(x.vista);
    setFotos(fotos.filter((y) => y.clave !== clave));
  }

  async function guardar(e) {
    e.preventDefault();
    if (!punto) { setEstado({ cargando: '', error: 'Falta la ubicación: use el GPS o toque el mapa.', ok: '' }); return; }
    setEstado({ cargando: 'Guardando incidencia…', error: '', ok: '' });
    let id;
    try {
      ({ id } = await api.registrarIncidencia({
        ...f, cultivo: f.cultivo || null, lat: punto.lat, lon: punto.lon, precision_m: punto.origen === 'gps' ? punto.precision : null,
      }));
    } catch (err) { setEstado({ cargando: '', error: err.message, ok: '' }); return; }

    const fallas = [];
    for (const [n, x] of fotos.entries()) {
      setEstado({ cargando: `Subiendo foto ${n + 1} de ${fotos.length}${drive ? ' a Google Drive' : ''}…`, error: '', ok: '' });
      try { await api.subirFoto(id, await comprimir(x.archivo)); } catch (err) { fallas.push(err.message); }
    }
    fotos.forEach((x) => URL.revokeObjectURL(x.vista));
    setFotos([]);
    setF(FORM_VACIO);
    setPunto(null);
    setEstado({
      cargando: '',
      ok: `Incidencia registrada${fotos.length ? ` con ${fotos.length - fallas.length} de ${fotos.length} fotos` : ''}. `
        + `Ya cuenta para las rotaciones que se evalúen a menos de ${radio} km.`,
      error: fallas.length ? `Fotos sin subir: ${fallas.join(' · ')}. Puede agregarlas desde “Registradas”.` : '',
    });
    onGuardada();
  }

  const poner = (k, v) => setF({ ...f, [k]: v });
  return (
    <form className="campo-nueva" onSubmit={guardar}>
      <div className="caja">
        <h2>1. ¿Dónde está?</h2>
        <button type="button" className="principal gps" onClick={ubicar} disabled={gps.buscando}>
          {gps.buscando ? 'Buscando señal GPS…' : punto?.origen === 'gps' ? 'Volver a tomar mi ubicación' : 'Usar mi ubicación (GPS)'}
        </button>
        {gps.error && <p className="aviso">{gps.error}</p>}
        <MapaCampo punto={punto} incidencias={existentes}
          onElegir={(ll) => setPunto({ lat: ll.lat, lon: ll.lng, precision: null, origen: 'mapa' })} />
        <p className="suave coordenadas">
          {punto
            ? <>{punto.lat.toFixed(6)}, {punto.lon.toFixed(6)} · {punto.origen === 'gps' ? `GPS, precisión ±${punto.precision} m` : 'marcado a mano en el mapa'}</>
            : 'Toque el mapa para marcar o corregir el punto exacto. Use la capa “Satélite” para ver los surcos.'}
        </p>
      </div>

      <div className="caja">
        <h2>2. ¿Qué encontró?</h2>
        <div className="chips grandes" role="group" aria-label="Tipo">
          {Object.entries(TIPOS).map(([k, t]) => (
            <button key={k} type="button" aria-pressed={f.tipo === k} className={f.tipo === k ? 'activa' : ''} onClick={() => poner('tipo', k)}>{t}</button>
          ))}
        </div>
        <label className="campo">Nombre
          <input list="sugerencias-agente" required minLength={3} maxLength={80} value={f.agente}
            onChange={(e) => poner('agente', e.target.value)} placeholder={SUGERENCIAS[f.tipo][0]} />
          <datalist id="sugerencias-agente">{SUGERENCIAS[f.tipo].map((s) => <option key={s} value={s} />)}</datalist>
        </label>
        <label className="campo">Cultivo afectado
          <select value={f.cultivo} onChange={(e) => poner('cultivo', e.target.value)}>
            <option value="">No sé / otro cultivo</option>
            {cultivos.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre} ({c.familia})</option>)}
          </select>
        </label>
        {f.tipo !== 'deficiencia' && !f.cultivo && <p className="suave">Indique el cultivo para que la incidencia oriente las rotaciones de la zona.</p>}
        <p className="etiqueta-campo">Severidad</p>
        <div className="chips grandes severidad" role="group" aria-label="Severidad">
          {Object.entries(SEVERIDADES).map(([k, t]) => (
            <button key={k} type="button" aria-pressed={f.severidad === k} className={`sev-${k} ${f.severidad === k ? 'activa' : ''}`}
              onClick={() => poner('severidad', k)}>{t}</button>
          ))}
        </div>
        <label className="campo">Nota breve (opcional)
          <textarea rows={2} maxLength={500} value={f.nota} onChange={(e) => poner('nota', e.target.value)}
            placeholder="Ej.: 30 % de plantas con galerías, borde norte de la parcela" />
        </label>
      </div>

      <div className="caja">
        <h2>3. Fotos <small>{fotos.length} de {maxFotos}</small></h2>
        <p className="suave">{drive ? 'Se guardan en la unidad compartida de Google Drive del equipo.' : 'Se guardan en el servidor de Poseidon.'} Se reducen antes de subir para gastar menos datos.</p>
        {fotos.length > 0 && (
          <ul className="miniaturas">
            {fotos.map((x) => (
              <li key={x.clave}>
                <img src={x.vista} alt="" />
                <button type="button" aria-label="Quitar foto" onClick={() => quitarFoto(x.clave)}>×</button>
              </li>
            ))}
          </ul>
        )}
        {fotos.length < maxFotos && (
          <>
            <input ref={entrada} type="file" accept="image/*" capture="environment" multiple hidden onChange={agregarFotos} />
            <button type="button" className="secundario ancho" onClick={() => entrada.current.click()}>+ Tomar o elegir foto</button>
          </>
        )}
        <button className="principal" disabled={Boolean(estado.cargando)}>{estado.cargando || 'Registrar incidencia'}</button>
        {estado.ok && <p className="exito" role="status">{estado.ok}</p>}
        {estado.error && <p className="error" role="alert">{estado.error}</p>}
      </div>
    </form>
  );
}

// ---------- Incidencias registradas ----------
function Registradas({ lista, cultivos, maxFotos, recargar }) {
  const [filtro, setFiltro] = useState('activa');
  const [abierta, setAbierta] = useState(null);
  const nombre = (k) => cultivos.find((c) => c.codigo === k)?.nombre || k;
  const items = lista.filter((i) => !filtro || i.estado === filtro);

  function abrir(id) {
    setAbierta(id);
    requestAnimationFrame(() => document.getElementById(`incidencia-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }

  return (
    <div className="dos-columnas ancha">
      <div className="caja">
        <MapaCampo incidencias={items} alto={380} onAbrir={abrir} />
        <p className="leyenda">
          <i style={{ background: COLOR.baja, borderRadius: '50%' }} /> baja <i style={{ background: COLOR.media, borderRadius: '50%' }} /> media
          <i style={{ background: COLOR.alta, borderRadius: '50%' }} /> alta · toque un punto para ver el detalle
        </p>
      </div>
      <section>
        <div className="chips" role="group" aria-label="Estado">
          {[['activa', 'Activas'], ['controlada', 'Controladas'], ['', 'Todas']].map(([k, t]) => (
            <button key={k} type="button" aria-pressed={filtro === k} className={filtro === k ? 'activa' : ''} onClick={() => setFiltro(k)}>{t}</button>
          ))}
        </div>
        {!items.length && <p className="vacio">No hay incidencias {filtro === 'activa' ? 'activas' : filtro === 'controlada' ? 'controladas' : 'registradas'}.</p>}
        <ul className="incidencias">
          {items.map((i) => (
            <Incidencia key={i.id} i={i} nombre={nombre} maxFotos={maxFotos} recargar={recargar} resaltada={abierta === i.id} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function Incidencia({ i, nombre, maxFotos, recargar, resaltada }) {
  const [estado, setEstado] = useState({ cargando: '', error: '' });
  const entrada = useRef(null);

  async function accion(fn, texto) {
    setEstado({ cargando: texto, error: '' });
    try { await fn(); setEstado({ cargando: '', error: '' }); recargar(); }
    catch (err) { setEstado({ cargando: '', error: err.message }); }
  }
  const subir = (e) => {
    const archivos = [...e.target.files].slice(0, maxFotos - i.fotos.length);
    e.target.value = '';
    accion(async () => { for (const a of archivos) await api.subirFoto(i.id, await comprimir(a)); }, 'Subiendo…');
  };

  return (
    <li id={`incidencia-${i.id}`} className={`incidencia sev-${i.severidad} ${i.estado} ${resaltada ? 'resaltada' : ''}`}>
      <div className="solicitud-cabeza">
        <b>{TIPOS[i.tipo]}: {i.agente}</b>
        <span className={`estado-solicitud ${i.estado === 'activa' ? 'pendiente' : 'retirada'}`}>{i.estado === 'activa' ? 'Activa' : 'Controlada'}</span>
      </div>
      <p className="suave">
        Severidad {SEVERIDADES[i.severidad].toLowerCase()}{i.cultivo && ` · ${nombre(i.cultivo)}`} · {i.tecnico} · {fechaHora(i.creado_en)}
      </p>
      <p className="suave coordenadas">{i.lat.toFixed(6)}, {i.lon.toFixed(6)}{i.precision_m !== null && i.precision_m !== undefined && ` · ±${i.precision_m} m`}</p>
      {i.nota && <p className="mensaje">{i.nota}</p>}
      {i.fotos.length > 0 && (
        <ul className="miniaturas">
          {i.fotos.map((f) => (
            <li key={f.id}>
              <FotoSegura incidencia={i.id} foto={f} />
              {f.enlace && <a className="en-drive" href={f.enlace} target="_blank" rel="noreferrer">Drive</a>}
            </li>
          ))}
        </ul>
      )}
      <div className="fila-botones">
        {i.fotos.length < maxFotos && (
          <>
            <input ref={entrada} type="file" accept="image/*" capture="environment" multiple hidden onChange={subir} />
            <button type="button" className="secundario chico" disabled={Boolean(estado.cargando)} onClick={() => entrada.current.click()}>+ Foto</button>
          </>
        )}
        <button type="button" className="secundario chico" disabled={Boolean(estado.cargando)}
          onClick={() => accion(() => api.estadoIncidencia(i.id, i.estado === 'activa' ? 'controlada' : 'activa'), 'Guardando…')}>
          {i.estado === 'activa' ? 'Marcar como controlada' : 'Reactivar'}
        </button>
        {estado.cargando && <span className="suave">{estado.cargando}</span>}
      </div>
      {estado.error && <p className="error" role="alert">{estado.error}</p>}
    </li>
  );
}

// Las fotos exigen sesión: se descargan con el token y se muestran como blob.
function FotoSegura({ incidencia, foto }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let vivo = true, creada = null;
    api.foto(incidencia, foto.id)
      .then((b) => { creada = URL.createObjectURL(b); if (vivo) setUrl(creada); else URL.revokeObjectURL(creada); })
      .catch((e) => vivo && setError(e.message));
    return () => { vivo = false; if (creada) URL.revokeObjectURL(creada); };
  }, [incidencia, foto.id]);
  if (error) return <span className="foto-falla" title={error}>Sin foto</span>;
  if (!url) return <span className="foto-cargando" aria-label="Cargando foto" />;
  return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Foto de la incidencia" loading="lazy" /></a>;
}
