import { useEffect, useState } from 'react';
import { api, hayToken, setToken } from './api.js';
import { Logo } from './componentes.jsx';
import Login from './paginas/Login.jsx';
import Cliente from './paginas/Cliente.jsx';
import Operativo from './paginas/Operativo.jsx';
import Monitoreo from './paginas/Monitoreo.jsx';
import Admin from './paginas/Admin.jsx';

const PANELES = {
  administrador: { Panel: Admin, titulo: 'Administración', bajada: 'Usuarios, catálogo y estado del sistema' },
  operativo: { Panel: Operativo, titulo: 'Revisión técnica', bajada: 'Evaluaciones de los agricultores por validar' },
  cliente: { Panel: Cliente, titulo: 'Mi finca', bajada: 'Compare rotaciones para su parcela' },
  monitoreo: { Panel: Monitoreo, titulo: 'Monitoreo', bajada: 'Parcelas, alertas y actividad' },
};

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [listo, setListo] = useState(!hayToken());

  useEffect(() => {
    if (!hayToken()) return;
    api.yo().then(setUsuario).catch(() => setToken(null)).finally(() => setListo(true));
  }, []);

  const salir = () => { setToken(null); setUsuario(null); };
  if (!listo) return <p className="cargando">Cargando…</p>;
  if (!usuario) return <Login onIngreso={(r) => { setToken(r.token); setUsuario(r.usuario); }} />;

  const { Panel, titulo, bajada } = PANELES[usuario.rol];
  return (
    <div className={`pagina rol-${usuario.rol}`}>
      <header className="cabecera">
        <div className="marca"><Logo /><span>Poseidon</span></div>
        <div className="quien">
          <div><b>{usuario.nombre}</b><span className="insignia">{usuario.rol}</span></div>
          <button className="salir" onClick={salir}>Salir</button>
        </div>
      </header>
      <div className="titulo-panel">
        <h1>{titulo}</h1>
        <p>{bajada}</p>
      </div>
      <main><Panel usuario={usuario} /></main>
      <footer>Poseidon apoya la decisión; no reemplaza el criterio del agricultor ni de un técnico local. Datos de clima: NASA POWER.</footer>
    </div>
  );
}
