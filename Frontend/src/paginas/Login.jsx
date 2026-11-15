import { useState } from 'react';
import { api } from '../api.js';
import { Logo } from '../componentes.jsx';

export default function Login({ onIngreso }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [estado, setEstado] = useState({ cargando: false, error: '' });

  async function ingresar(e) {
    e.preventDefault();
    setEstado({ cargando: true, error: '' });
    try { onIngreso(await api.login(email, password)); }
    catch (err) { setEstado({ cargando: false, error: err.message }); }
  }

  return (
    <div className="login">
      <section className="login-arte">
        <div className="marca grande"><Logo /><span>Poseidon</span></div>
        <h1>Rotaciones de cultivo más resistentes, con datos de NASA</h1>
        <ul>
          <li><i className="punto azul" />Agricultores comparan tres rotaciones para su parcela</li>
          <li><i className="punto naranja" />Técnicos revisan y validan cada recomendación</li>
          <li><i className="punto amarillo" />Monitoreo sigue parcelas y alertas de agua y heladas</li>
        </ul>
      </section>
      <form className="login-form" onSubmit={ingresar}>
        <h2>Ingresar</h2>
        <label className="campo">Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label className="campo">Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        <button className="principal" disabled={estado.cargando}>{estado.cargando ? 'Ingresando…' : 'Ingresar'}</button>
        {estado.error && <p className="error" role="alert">{estado.error}</p>}
        <p className="suave">Lo que verá depende de su rol: agricultor, técnico de campo, comprador, monitoreo o administrador. ¿No tiene cuenta? Pídala al administrador de Poseidon.</p>
      </form>
    </div>
  );
}
