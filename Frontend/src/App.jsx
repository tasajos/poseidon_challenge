import { useEffect, useState } from 'react';
import { api, hayToken, setToken } from './api.js';
import { Logo, puede } from './componentes.jsx';
import Login from './paginas/Login.jsx';
import Cliente from './paginas/Cliente.jsx';
import Operativo from './paginas/Operativo.jsx';
import Monitoreo from './paginas/Monitoreo.jsx';
import Admin from './paginas/Admin.jsx';
import Alertas from './paginas/Alertas.jsx';
import Glosario from './paginas/Glosario.jsx';
import Comprador from './paginas/Comprador.jsx';
import Ventas from './paginas/Ventas.jsx';
import Campo from './paginas/Campo.jsx';

// Cada vista exige al menos uno de sus permisos (el glosario, ninguno). El menú muestra solo las vistas permitidas;
// el backend vuelve a comprobar cada permiso en cada petición.
const MODULOS = [
  { clave: 'finca', permisos: ['evaluar'], Panel: Cliente, menu: 'Mi finca', titulo: 'Mi finca', bajada: 'Compare rotaciones para su parcela' },
  { clave: 'revision', permisos: ['revisar'], Panel: Operativo, menu: 'Revisión', titulo: 'Revisión técnica', bajada: 'Evaluaciones de los agricultores por validar' },
  { clave: 'monitoreo', permisos: ['reportes'], Panel: Monitoreo, menu: 'Monitoreo', titulo: 'Monitoreo', bajada: 'Reporte regional: parcelas, alertas y actividad' },
  { clave: 'alertas', permisos: ['alertas'], Panel: Alertas, menu: 'Alertas', titulo: 'Alertas climáticas', bajada: 'Avisos de helada y sequía en su teléfono' },
  { clave: 'oferta', permisos: ['comprar'], Panel: Comprador, menu: 'Oferta sostenible', titulo: 'Oferta sostenible', bajada: 'Cosechas de rotaciones que cuidan el suelo y el agua' },
  { clave: 'ventas', permisos: ['ofertar'], Panel: Ventas, menu: 'Mis ventas', titulo: 'Mis ventas', bajada: 'Publique su cosecha y responda a compradores locales' },
  { clave: 'campo', permisos: ['incidencias'], Panel: Campo, menu: 'Plagas en campo', titulo: 'Plagas y enfermedades en campo', bajada: 'Marque incidencias con GPS y fotos desde el teléfono' },
  { clave: 'admin', permisos: ['usuarios', 'respaldos'], Panel: Admin, menu: 'Administración', titulo: 'Administración', bajada: 'Usuarios, permisos, respaldos y sistema' },
  { clave: 'glosario', permisos: [], Panel: Glosario, menu: 'Glosario', titulo: 'Glosario y guía', bajada: 'Los términos científicos explicados con palabras sencillas y ejemplos' },
];
const INICIO = { cliente: 'finca', operativo: 'revision', monitoreo: 'monitoreo', administrador: 'admin', comprador: 'oferta' };

function modulosDe(usuario) {
  const lista = MODULOS.filter((m) => !m.permisos.length || m.permisos.some((p) => puede(usuario, p)));
  const inicio = lista.find((m) => m.clave === INICIO[usuario.rol]);
  return inicio ? [inicio, ...lista.filter((m) => m !== inicio)] : lista;
}

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [listo, setListo] = useState(!hayToken());
  const [activo, setActivo] = useState(null);
  const [pedidoGlosario, setPedidoGlosario] = useState(null); // { id, n }: término que otra vista pidió abrir

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

  function salir() { setToken(null); setUsuario(null); setActivo(null); }
  if (!listo) return <p className="cargando">Cargando…</p>;
  if (!usuario) return <Login onIngreso={(r) => { setToken(r.token); setUsuario(r.usuario); }} />;

  const modulos = modulosDe(usuario);
  const modulo = modulos.find((m) => m.clave === activo) || modulos[0];

  return (
    <div className={`pagina rol-${usuario.rol}`}>
      <header className="cabecera">
        <div className="marca"><Logo /><span>Poseidon</span></div>
        <div className="quien">
          <div><b>{usuario.nombre}</b><span className="insignia">{usuario.rol}</span></div>
          <button className="salir" onClick={salir}>Salir</button>
        </div>
      </header>
      {modulos.length > 1 && (
        <nav className="modulos" aria-label="Secciones">
          <div>
            {modulos.map((m) => (
              <button key={m.clave} className={m === modulo ? 'activa' : ''} aria-current={m === modulo ? 'page' : undefined}
                onClick={() => setActivo(m.clave)}>{m.menu}</button>
            ))}
          </div>
        </nav>
      )}
      {modulo ? (
        <>
          <div className="titulo-panel">
            <h1>{modulo.titulo}</h1>
            <p>{modulo.bajada}</p>
          </div>
          <main><modulo.Panel key={modulo.clave} usuario={usuario}
            pedido={modulo.clave === 'glosario' ? pedidoGlosario : undefined} /></main>
        </>
      ) : (
        <main><p className="vacio">Su rol no tiene vistas asignadas. Pida al administrador que le otorgue permisos.</p></main>
      )}
      <footer>Poseidon apoya la decisión; no reemplaza el criterio del agricultor ni de un técnico local. Datos de clima: NASA POWER.</footer>
    </div>
  );
}
