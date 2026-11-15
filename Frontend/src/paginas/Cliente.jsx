import { useState } from 'react';
import { api } from '../api.js';
import {
  Clima, Estrategia, Mapa, Pestanas, Stat, ListaEvaluaciones, Detalle, TablaComparativa, useDatos, useLigero, fecha, COCHABAMBA, NO_DISPONIBLE,
} from '../componentes.jsx';
import FichaParcela, { CamposParcela, EtiquetaErosion } from '../Ficha.jsx';

const PRIORIDADES = [
  ['agua', 'Ahorrar agua'], ['suelo', 'Mejorar el suelo'], ['clima', 'Evitar heladas'],
  ['ingreso', 'Ingreso'], ['forraje', 'Forraje'],
];

// Superficie aproximada de un perímetro [[lat, lon], ...] en hectáreas (el servidor la vuelve a calcular al guardar).
function superficieHa(perimetro) {
  if (perimetro.length < 3) return 0;
  const lat0 = perimetro.reduce((s, p) => s + p[0], 0) / perimetro.length;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180), ky = 110574;
  let doble = 0;
  for (let i = 0; i < perimetro.length; i++) {
    const [la1, lo1] = perimetro[i], [la2, lo2] = perimetro[(i + 1) % perimetro.length];
    doble += lo1 * kx * la2 * ky - lo2 * kx * la1 * ky;
  }
  return Math.abs(doble) / 2 / 10000;
}

export default function Cliente() {
  const ligero = useLigero();
  const [vista, setVista] = useState(ligero ? 'resumen' : 'parcelas');
  const [abierta, setAbierta] = useState(null);
  const [aComparar, setAComparar] = useState(null);
  const parcelas = useDatos(() => api.parcelas());
  const catalogo = useDatos(api.cultivos);
  const historial = useDatos(api.misEvaluaciones);
  const items = historial.datos || [];
  const lista = parcelas.datos?.parcelas || [];
  const cultivos = catalogo.datos?.cultivos || [];
  const actual = vista === 'resumen' && !ligero ? 'parcelas' : vista;
  const recargar = () => { parcelas.recargar(); historial.recargar(); };

  return (
    <>
      <div className="stats">
        <Stat etiqueta="Parcelas registradas" valor={lista.length} tono="azul" />
        <Stat etiqueta="Comparaciones" valor={items.length} tono="amarillo" />
        <Stat etiqueta="Revisadas por un técnico" valor={items.filter((e) => e.estado === 'revisada').length} tono="naranja" />
      </div>
      <Pestanas valor={actual} onCambiar={(v) => { setVista(v); setAbierta(null); }}
        opciones={[...(ligero ? [['resumen', 'Resumen rápido']] : []), ['parcelas', 'Mis parcelas'], ['comparar', 'Comparar rotaciones'], ['historial', 'Mis evaluaciones']]} />
      {actual === 'resumen' && <ResumenLigero onComparar={(id) => { setAComparar(id); setVista('comparar'); }} />}
      {actual === 'parcelas' && (
        <Parcelas datos={parcelas} cultivos={cultivos} onCambio={recargar}
          onComparar={(id) => { setAComparar(id); setVista('comparar'); }} />
      )}
      {actual === 'comparar' && (parcelas.datos
        ? <Comparador key={aComparar ?? 'libre'} cultivos={cultivos} parcelas={lista} inicial={aComparar} onGuardada={recargar} />
        : <p className="cargando">Cargando…</p>)}
      {actual === 'historial' && (
        <div className="dos-columnas">
          <ListaEvaluaciones items={items} seleccion={abierta} onAbrir={setAbierta}
            vacio="Aún no tiene evaluaciones. Use “Comparar rotaciones” para crear la primera." />
          <div>{abierta ? <Detalle id={abierta} key={abierta} adoptar /> : items.length > 0 && <p className="vacio">Elija una evaluación para ver el detalle.</p>}</div>
        </div>
      )}
    </>
  );
}

// ---------- Modo de bajo consumo (HU-USR-06): solo números ----------
// El último resumen visto se guarda en la sesión (se borra al salir): al volver a abrir la aplicación con
// poca señal, la tabla aparece de inmediato y se actualiza cuando el servidor responde.
const CLAVE_RESUMEN = 'poseidon_resumen';
function resumenGuardado() {
  try { return JSON.parse(sessionStorage.getItem(CLAVE_RESUMEN)); } catch { return null; }
}

function ResumenLigero({ onComparar }) {
  const [previo] = useState(resumenGuardado);
  const { datos: frescos, error } = useDatos(() => api.resumen().then((r) => {
    try { sessionStorage.setItem(CLAVE_RESUMEN, JSON.stringify(r)); } catch { /* sin almacenamiento */ }
    return r;
  }));
  const datos = frescos || previo;
  if (error && !datos) return <p className="error">{error}</p>;
  if (!datos) return <p className="cargando">Cargando…</p>;
  if (!datos.length) return <p className="vacio">Aún no tiene parcelas. Regístrela en “Mis parcelas”.</p>;
  // La respuesta compacta se adapta a la forma que espera la tabla comparativa.
  const completa = (s) => ({
    ...s, evidencia: { deficit_agua_mm: s.riego_mm, meses_suelo_desnudo: s.suelo_desnudo, ahorro_agua_pct: s.ahorro_agua_pct },
    riesgos: { length: s.riesgos },
  });
  const aviso = !frescos && (error
    ? <p className="aviso" role="status">Sin conexión: se muestra el último resumen que vio en esta sesión.</p>
    : <p className="suave" role="status">Actualizando…</p>);
  return [aviso && <div key="aviso">{aviso}</div>, ...datos.map((p) => (
    <section key={p.id} className="resumen-ligero">
      <h2>{p.nombre} <small>{p.codigo} · {p.zona}</small></h2>
      {p.evaluacion ? (
        <>
          <p className="suave">Última comparación: {fecha(p.evaluacion.creado_en)}{p.evaluacion.fuente_clima === 'demo' ? ' · con clima de demostración' : ''}</p>
          <TablaComparativa estrategias={p.evaluacion.estrategias.map(completa)} adoptada={p.evaluacion.adoptada} />
        </>
      ) : <p className="suave">Esta parcela aún no tiene una comparación de rotaciones.</p>}
      <button type="button" className="secundario" onClick={() => onComparar(p.id)}>{p.evaluacion ? 'Volver a comparar' : 'Comparar rotaciones'}</button>
    </section>
  ))];
}

// ---------- Mis parcelas (HU-USR-01) ----------
function Parcelas({ datos: { datos, error }, cultivos, onCambio, onComparar }) {
  const [abierta, setAbierta] = useState(null); // id de parcela, 'nueva' o null
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="cargando">Cargando…</p>;
  const { parcelas } = datos;
  return (
    <div className="dos-columnas">
      <div>
        <button type="button" className="principal sin-margen" onClick={() => setAbierta('nueva')}>+ Registrar parcela</button>
        {!parcelas.length && abierta !== 'nueva' && <p className="vacio">Registre su parcela para que las recomendaciones usen su ubicación, su cultivo y su terreno.</p>}
        <ul className="lista con-margen">
          {parcelas.map((p) => (
            <li key={p.id}>
              <button className={`item ${abierta === p.id ? 'activo' : ''}`} onClick={() => setAbierta(p.id)}>
                <span className="item-cabeza"><b>{p.nombre}</b><span className="codigo">{p.codigo}</span></span>
                <span className="item-rotacion">{p.cultivo_nombre || `Cultivo: ${NO_DISPONIBLE.toLowerCase()}`}{p.etapa_texto ? ` · ${p.etapa_texto}` : ''}</span>
                <span className="item-pie">{p.zona}{p.superficie_ha ? ` · ${p.superficie_ha.toLocaleString('es-BO')} ha` : ''}{p.pendiente_pct !== null ? ` · pendiente ${p.pendiente_pct.toLocaleString('es-BO')} %` : ''}</span>
                {p.erosion && p.erosion !== 'bajo' && <EtiquetaErosion riesgo={p.erosion} />}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        {abierta === 'nueva' && <Registro cultivos={cultivos} opciones={datos} onCancelar={() => setAbierta(null)} onGuardada={onCambio} onVer={setAbierta} onComparar={onComparar} />}
        {typeof abierta === 'number' && <FichaParcela key={abierta} id={abierta} propia cultivos={cultivos} opciones={datos} onComparar={onComparar} onCambio={onCambio} />}
        {abierta === null && parcelas.length > 0 && <p className="vacio">Elija una parcela para ver su ficha, su pendiente y su historial.</p>}
      </div>
    </div>
  );
}

const DATOS_VACIOS = { nombre: '', cultivo_actual: '', superficie_ha: '', etapa: '', riego: '' };
const numero = (t) => (String(t).trim() === '' ? NaN : Number(String(t).replace(',', '.')));

function Registro({ cultivos, opciones, onCancelar, onGuardada, onVer, onComparar }) {
  const ligero = useLigero();
  const [paso, setPaso] = useState('ubicacion');
  const [modo, setModo] = useState('punto');
  const [coord, setCoord] = useState({ lat: '', lon: '' });
  const [perimetro, setPerimetro] = useState([]);
  const [centro, setCentro] = useState(null);
  const [v, setV] = useState(DATOS_VACIOS);
  const [resumen, setResumen] = useState(null);
  const [guardada, setGuardada] = useState(null);
  const [estado, setEstado] = useState({ cargando: false, error: '', gps: '' });

  const lat = numero(coord.lat), lon = numero(coord.lon);
  const puntoValido = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  const area = superficieHa(perimetro);
  const ubicacionLista = modo === 'punto' ? puntoValido : perimetro.length >= 3;
  const cuerpo = () => ({
    ...v, superficie_ha: v.superficie_ha === '' ? null : Number(v.superficie_ha),
    ...(modo === 'perimetro' ? { perimetro } : { lat, lon }),
  });
  const alTocar = ([la, lo]) => {
    if (modo === 'punto') setCoord({ lat: la.toFixed(6), lon: lo.toFixed(6) });
    else if (perimetro.length < 60) setPerimetro([...perimetro, [Number(la.toFixed(6)), Number(lo.toFixed(6))]]);
  };
  function gps() {
    if (!('geolocation' in navigator) || !window.isSecureContext) { setEstado({ ...estado, gps: 'El GPS del navegador necesita https o localhost. Escriba las coordenadas o toque el mapa.' }); return; }
    setEstado({ ...estado, gps: 'Buscando señal GPS…' });
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoord({ lat: p.coords.latitude.toFixed(6), lon: p.coords.longitude.toFixed(6) }); setCentro([p.coords.latitude, p.coords.longitude]); setModo('punto'); setEstado({ ...estado, gps: `Ubicación tomada (±${Math.round(p.coords.accuracy)} m).` }); },
      () => setEstado({ ...estado, gps: 'No se pudo obtener la ubicación. Escriba las coordenadas o toque el mapa.' }),
      { enableHighAccuracy: true, timeout: 20000 },
    );
  }
  async function pedir(fn, alTerminar) {
    setEstado({ cargando: true, error: '', gps: '' });
    try { alTerminar(await fn()); setEstado({ cargando: false, error: '', gps: '' }); }
    catch (err) { setEstado({ cargando: false, error: err.message, gps: '' }); }
  }
  const revisar = (e) => { e.preventDefault(); pedir(() => api.validarParcela(cuerpo()), (r) => { setResumen(r); setPaso('resumen'); }); };
  const guardar = () => pedir(() => api.registrarParcela(cuerpo()), (r) => { setGuardada(r); setPaso('guardada'); onGuardada(); });

  if (paso === 'guardada') {
    const p = guardada.parcela;
    return (
      <div className="caja">
        <h2>Parcela registrada</h2>
        <p className="exito" role="status">Su parcela quedó guardada con el identificador <b>{guardada.codigo}</b>. Úselo para consultar sus análisis.</p>
        <Mapa alto={200} zoom={15} centro={[p.lat, p.lon]} perimetro={p.perimetro || undefined} puntos={p.perimetro ? [] : [{ id: 'p', lat: p.lat, lon: p.lon, texto: p.nombre }]} />
        <dl className="ficha">
          <dt>Ubicación</dt><dd>{p.zona} · {p.lat.toFixed(5)}, {p.lon.toFixed(5)}</dd>
          <dt>Técnico asignado</dt><dd>{p.tecnico || 'Aún sin asignar'}</dd>
          {p.pendiente_pct !== null && <><dt>Pendiente</dt><dd>{p.pendiente_pct.toLocaleString('es-BO')} % <EtiquetaErosion riesgo={p.erosion} /></dd></>}
        </dl>
        {guardada.avisos.map((a) => <p key={a} className="aviso">{a}</p>)}
        <p className="suave">{guardada.nota}</p>
        <div className="fila-botones">
          <button type="button" className="secundario" onClick={() => onVer(guardada.id)}>Ver la ficha</button>
          <button type="button" className="principal" onClick={() => onComparar(guardada.id)}>Comparar rotaciones</button>
        </div>
      </div>
    );
  }

  return (
    <div className="caja registro">
      <ol className="pasos-registro" aria-label="Pasos del registro">
        {[['ubicacion', 'Ubicación'], ['datos', 'Datos'], ['resumen', 'Confirmar']].map(([k, t], i) => (
          <li key={k} className={paso === k ? 'actual' : ''} aria-current={paso === k ? 'step' : undefined}><span className="paso">{i + 1}</span>{t}</li>
        ))}
      </ol>

      {paso === 'ubicacion' && (
        <>
          <h2>¿Dónde está su parcela?</h2>
          <label className="campo">Buscar su zona
            <select value="" onChange={(e) => { const z = opciones.zonas.find((x) => x.nombre === e.target.value); if (z) setCentro([z.lat, z.lon]); }}>
              <option value="">Elija un municipio para acercar el mapa…</option>
              {opciones.zonas.map((z) => <option key={z.nombre} value={z.nombre}>{z.nombre}</option>)}
            </select>
          </label>
          <div className="chips grandes" role="group" aria-label="Cómo marcar la parcela">
            <button type="button" aria-pressed={modo === 'punto'} className={modo === 'punto' ? 'activa' : ''} onClick={() => setModo('punto')}>Marcar un punto</button>
            <button type="button" aria-pressed={modo === 'perimetro'} className={modo === 'perimetro' ? 'activa' : ''} disabled={ligero} onClick={() => setModo('perimetro')}>Dibujar el perímetro</button>
          </div>
          <p className="suave">
            {modo === 'punto' ? 'Toque el mapa en el centro de su parcela, use el GPS o escriba las coordenadas.' : 'Toque el mapa en cada esquina de la parcela, en orden, dando la vuelta.'}
          </p>
          <Mapa alto={300} zoom={centro ? 15 : 11} centro={centro || (puntoValido && modo === 'punto' ? [lat, lon] : undefined)} onElegir={alTocar}
            perimetro={modo === 'perimetro' ? perimetro : undefined}
            puntos={modo === 'punto' && puntoValido ? [{ id: 'p', lat, lon, texto: 'Su parcela', fijo: true }] : []} />
          {modo === 'punto' ? (
            <>
              <div className="fila">
                <label className="campo crece">Latitud
                  <input inputMode="decimal" value={coord.lat} onChange={(e) => setCoord({ ...coord, lat: e.target.value })} placeholder="-17.3895" />
                </label>
                <label className="campo crece">Longitud
                  <input inputMode="decimal" value={coord.lon} onChange={(e) => setCoord({ ...coord, lon: e.target.value })} placeholder="-66.1568" />
                </label>
              </div>
              {(coord.lat !== '' || coord.lon !== '') && !puntoValido && <p className="error" role="alert">Coordenadas no válidas: la latitud va de -90 a 90 y la longitud de -180 a 180 (en Cochabamba, cerca de -17,4 y -66,2).</p>}
              <button type="button" className="secundario" onClick={gps}>Usar mi ubicación (GPS)</button>
              {estado.gps && <p className="suave" role="status">{estado.gps}</p>}
            </>
          ) : (
            <>
              <p className="medida" role="status">
                {perimetro.length < 3 ? `${perimetro.length} de al menos 3 puntos marcados.` : `${perimetro.length} puntos · unas ${area.toLocaleString('es-BO', { maximumFractionDigits: 2 })} hectáreas`}
              </p>
              <div className="fila-botones">
                <button type="button" className="secundario chico" disabled={!perimetro.length} onClick={() => setPerimetro(perimetro.slice(0, -1))}>Deshacer el último punto</button>
                <button type="button" className="secundario chico" disabled={!perimetro.length} onClick={() => setPerimetro([])}>Borrar el dibujo</button>
              </div>
            </>
          )}
          <div className="fila-botones">
            <button type="button" className="secundario" onClick={onCancelar}>Cancelar</button>
            <button type="button" className="principal" disabled={!ubicacionLista}
              onClick={() => { if (modo === 'perimetro' && v.superficie_ha === '') setV({ ...v, superficie_ha: area.toFixed(2) }); setPaso('datos'); }}>Continuar</button>
          </div>
        </>
      )}

      {paso === 'datos' && (
        <form onSubmit={revisar}>
          <h2>Datos de la parcela</h2>
          <p className="suave">Solo el nombre es obligatorio. Lo que no sepa déjelo como “{NO_DISPONIBLE.toLowerCase()}”: podrá completarlo después.</p>
          <CamposParcela v={v} poner={(k) => (e) => setV({ ...v, [k]: e.target.value })} cultivos={cultivos} opciones={opciones} />
          {modo === 'perimetro' && <p className="suave">Superficie medida en su dibujo: unas {area.toLocaleString('es-BO', { maximumFractionDigits: 2 })} ha. Corríjala si conoce el valor exacto.</p>}
          <div className="fila-botones">
            <button type="button" className="secundario" onClick={() => setPaso('ubicacion')}>Volver a la ubicación</button>
            <button className="principal" disabled={estado.cargando}>{estado.cargando ? 'Revisando…' : 'Revisar antes de guardar'}</button>
          </div>
        </form>
      )}

      {paso === 'resumen' && resumen && (
        <>
          <h2>Revise antes de guardar</h2>
          <dl className="ficha">
            <dt>Nombre</dt><dd>{resumen.resumen.nombre}</dd>
            <dt>Ubicación</dt><dd>{resumen.resumen.zona} · {resumen.resumen.lat.toFixed(5)}, {resumen.resumen.lon.toFixed(5)}{resumen.resumen.perimetro ? ` · perímetro de ${resumen.resumen.perimetro.length} puntos` : ' · punto'}</dd>
            <dt>Superficie</dt><dd>{resumen.resumen.superficie_ha ? `${resumen.resumen.superficie_ha.toLocaleString('es-BO')} ha` : NO_DISPONIBLE}</dd>
            <dt>Cultivo actual</dt><dd>{resumen.resumen.cultivo_nombre || NO_DISPONIBLE}</dd>
            <dt>Etapa</dt><dd>{resumen.resumen.etapa_texto || NO_DISPONIBLE}</dd>
            <dt>Riego</dt><dd>{resumen.resumen.riego_texto || NO_DISPONIBLE}</dd>
          </dl>
          {resumen.avisos.map((a) => <p key={a} className="aviso">{a}</p>)}
          <div className="fila-botones">
            <button type="button" className="secundario" onClick={() => setPaso('ubicacion')}>Corregir ubicación</button>
            <button type="button" className="secundario" onClick={() => setPaso('datos')}>Corregir datos</button>
            <button type="button" className="principal" disabled={estado.cargando} onClick={guardar}>{estado.cargando ? 'Guardando…' : 'Guardar parcela'}</button>
          </div>
        </>
      )}
      {estado.error && <p className="error" role="alert">{estado.error}</p>}
    </div>
  );
}

// ---------- Comparar rotaciones ----------
function Comparador({ cultivos, parcelas, inicial, onGuardada }) {
  const ligero = useLigero();
  const [destino, setDestino] = useState(inicial ?? (parcelas[0]?.id ?? 'punto')); // id de parcela registrada o 'punto'
  const [punto, setPunto] = useState(COCHABAMBA);
  const [nombre, setNombre] = useState('');
  const [rotacion, setRotacion] = useState(['papa', 'maiz']);
  const [prioridades, setPrioridades] = useState({ agua: 4, suelo: 3, clima: 2, ingreso: 2, forraje: 0 });
  const [resultado, setResultado] = useState(null);
  const [adoptada, setAdoptada] = useState(null);
  const [estado, setEstado] = useState({ cargando: false, error: '' });

  const libres = (actual) => cultivos.filter((c) => c.codigo === actual || !rotacion.includes(c.codigo));
  const agregar = () => {
    const libre = cultivos.find((c) => !rotacion.includes(c.codigo));
    if (libre) setRotacion([...rotacion, libre.codigo]);
  };
  const registrada = destino !== 'punto' ? parcelas.find((p) => p.id === Number(destino)) : null;

  async function comparar(e) {
    e.preventDefault();
    setEstado({ cargando: true, error: '' });
    try {
      const lugar = registrada ? { parcela_id: registrada.id } : { nombre, lat: punto[0], lon: punto[1] };
      setResultado(await api.evaluar({ ...lugar, rotacion, prioridades }));
      setAdoptada(null);
      setEstado({ cargando: false, error: '' });
      onGuardada();
    } catch (err) { setEstado({ cargando: false, error: err.message }); }
  }
  const adoptar = (tipo) => api.adoptar(resultado.id, tipo).then(() => { setAdoptada(tipo); onGuardada(); })
    .catch((err) => setEstado({ cargando: false, error: err.message }));

  return (
    <div className="comparador">
      <form className="caja" onSubmit={comparar}>
        <h2><span className="paso">1</span>¿Qué parcela?</h2>
        <label className="campo">Parcela
          <select value={destino} onChange={(e) => setDestino(e.target.value === 'punto' ? 'punto' : Number(e.target.value))}>
            {parcelas.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.codigo}</option>)}
            <option value="punto">Otro lugar (sin registrar)</option>
          </select>
        </label>
        {registrada ? (
          <p className="suave">{registrada.zona}{registrada.pendiente_pct !== null ? ` · pendiente ${registrada.pendiente_pct.toLocaleString('es-BO')} %` : ''}. Las comparaciones quedan en el historial de la parcela.</p>
        ) : (
          <>
            <p className="suave">{ligero ? 'Escriba las coordenadas del lugar.' : 'Toque el mapa para marcar el lugar.'} Para guardar el historial, registre la parcela en “Mis parcelas”.</p>
            <Mapa puntos={[{ id: 'p', lat: punto[0], lon: punto[1] }]} onElegir={setPunto} alto={220} />
            {ligero && (
              <div className="fila">
                <label className="campo crece">Latitud<input type="number" step="any" min="-90" max="90" required value={punto[0]} onChange={(e) => setPunto([Number(e.target.value), punto[1]])} /></label>
                <label className="campo crece">Longitud<input type="number" step="any" min="-180" max="180" required value={punto[1]} onChange={(e) => setPunto([punto[0], Number(e.target.value)])} /></label>
              </div>
            )}
            <label className="campo">Nombre del lugar
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Chacra Tiquipaya" maxLength={80} />
            </label>
          </>
        )}

        <h2><span className="paso">2</span>¿Qué siembra hoy?</h2>
        <p className="suave">Un cultivo por campaña, en orden.</p>
        {rotacion.map((codigo, i) => (
          <div className="fila" key={i}>
            <select value={codigo} aria-label={`Cultivo ${i + 1}`}
              onChange={(e) => setRotacion(rotacion.map((c, j) => (j === i ? e.target.value : c)))}>
              {libres(codigo).map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
            </select>
            {rotacion.length > 2 && (
              <button type="button" className="quitar" aria-label="Quitar cultivo"
                onClick={() => setRotacion(rotacion.filter((_, j) => j !== i))}>×</button>
            )}
          </div>
        ))}
        {rotacion.length < 4 && <button type="button" className="secundario" onClick={agregar}>+ Añadir cultivo</button>}

        <h2><span className="paso">3</span>¿Qué le importa más?</h2>
        {PRIORIDADES.map(([clave, texto]) => (
          <label className="deslizador" key={clave}>
            <span>{texto}</span>
            <input type="range" min="0" max="5" value={prioridades[clave]}
              onChange={(e) => setPrioridades({ ...prioridades, [clave]: Number(e.target.value) })} />
            <b>{prioridades[clave]}</b>
          </label>
        ))}
        <button className="principal" disabled={estado.cargando || !cultivos.length}>
          {estado.cargando ? 'Consultando datos…' : 'Comparar rotaciones'}
        </button>
        {estado.error && <p className="error" role="alert">{estado.error}</p>}
      </form>

      <section>
        {!resultado && <p className="vacio">Elija su parcela, indique su rotación y pulse “Comparar rotaciones”.</p>}
        {resultado && (
          <>
            {resultado.fuenteClima === 'demo' && (
              <p className="aviso" role="status">Sin conexión con NASA POWER: se usa un clima de demostración para Cochabamba, no datos de NASA.</p>
            )}
            {resultado.terreno && resultado.terreno.riesgo !== 'bajo' && (
              <p className="aviso" role="status">
                Su parcela está en ladera (pendiente de {resultado.terreno.pendiente_pct.toLocaleString('es-BO')} %): la comparación da más valor a las raíces profundas y al suelo cubierto.
              </p>
            )}
            <TablaComparativa estrategias={resultado.estrategias} adoptada={adoptada} onAdoptar={ligero ? adoptar : undefined} />
            {!ligero && <Clima meses={resultado.clima} fuente={resultado.fuenteClima} />}
            {!ligero && <div className="tarjetas">{resultado.estrategias.map((e) => <Estrategia key={e.tipo} e={e} adoptada={adoptada} onAdoptar={adoptar} />)}</div>}
            <p className="suave">Un técnico revisará esta evaluación; verá su nota en “Mis evaluaciones”.</p>
          </>
        )}
      </section>
    </div>
  );
}
