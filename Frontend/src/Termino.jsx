// Términos del glosario dentro de la interfaz: una palabra con línea punteada que, al tocarla,
// abre un cuadro emergente con la explicación sencilla, un apoyo visual y un ejemplo práctico.
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { termino } from './glosario.js';

// Pide a la aplicación que abra la vista Glosario en este término (App escucha el evento).
export const abrirEnGlosario = (id) => window.dispatchEvent(new CustomEvent('poseidon:glosario', { detail: id }));

const MOVIL = '(max-width: 560px)';

export function Termino({ id, children, soloIcono = false }) {
  const t = termino(id);
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState(null);
  const boton = useRef(null);
  const caja = useRef(null);
  const idCaja = useId();

  const cerrar = (devolverFoco) => {
    setAbierto(false);
    setPos(null);
    if (devolverFoco) boton.current?.focus();
  };

  // Ubica el cuadro junto a la palabra (abajo o arriba, donde haya más lugar). En el teléfono es una hoja inferior.
  useLayoutEffect(() => {
    if (!abierto) return undefined;
    const ubicar = () => {
      if (!boton.current) return;
      if (window.matchMedia(MOVIL).matches) { setPos({ movil: true }); return; }
      const r = boton.current.getBoundingClientRect();
      const ancho = Math.min(400, window.innerWidth - 32);
      const left = Math.min(Math.max(16, r.left + r.width / 2 - ancho / 2), window.innerWidth - ancho - 16);
      const abajo = window.innerHeight - r.bottom - 16;
      const arriba = r.top - 16;
      setPos(abajo >= 340 || abajo >= arriba
        ? { left, width: ancho, top: r.bottom + 8, maxHeight: abajo - 8 }
        : { left, width: ancho, bottom: window.innerHeight - r.top + 8, maxHeight: arriba - 8 });
    };
    ubicar();
    window.addEventListener('resize', ubicar);
    window.addEventListener('scroll', ubicar, true);
    return () => {
      window.removeEventListener('resize', ubicar);
      window.removeEventListener('scroll', ubicar, true);
    };
  }, [abierto]);

  // Foco al abrir; Escape o un toque fuera lo cierran.
  useEffect(() => {
    if (!abierto) return undefined;
    caja.current?.focus({ preventScroll: true });
    const tecla = (e) => { if (e.key === 'Escape') cerrar(true); };
    const fuera = (e) => {
      if (caja.current?.contains(e.target) || boton.current?.contains(e.target)) return;
      cerrar(false);
    };
    document.addEventListener('keydown', tecla);
    document.addEventListener('pointerdown', fuera);
    return () => {
      document.removeEventListener('keydown', tecla);
      document.removeEventListener('pointerdown', fuera);
    };
  }, [abierto]);

  if (!t) return children ?? null;

  const alternar = (e) => {
    e.preventDefault(); // dentro de un <label> no debe cambiar el interruptor
    e.stopPropagation();
    if (abierto) cerrar(false); else setAbierto(true);
  };

  const { movil, ...estilo } = pos || {};
  return (
    <>
      <button ref={boton} type="button" className={`termino ${soloIcono ? 'solo-icono' : ''}`} onClick={alternar}
        aria-haspopup="dialog" aria-expanded={abierto} aria-controls={abierto ? idCaja : undefined}
        aria-label={soloIcono ? `Qué es: ${t.nombre}` : undefined} title={soloIcono ? undefined : 'Toque para ver qué significa'}>
        {!soloIcono && <span className="termino-texto">{children ?? t.nombre}</span>}
        <span className="termino-i" aria-hidden="true">?</span>
      </button>
      {abierto && createPortal(
        <>
          {movil && <div className="termino-fondo" aria-hidden="true" />}
          <div ref={caja} id={idCaja} role="dialog" aria-modal={movil ? 'true' : undefined} aria-labelledby={`${idCaja}-t`} tabIndex={-1}
            className={`termino-cuadro ${movil ? 'hoja' : ''}`} style={pos ? estilo : { visibility: 'hidden' }}
            onClick={(e) => e.stopPropagation()}>
            <button type="button" className="termino-cerrar" aria-label="Cerrar" onClick={() => cerrar(true)}>×</button>
            <FichaTermino t={t} idTitulo={`${idCaja}-t`} />
            <button type="button" className="secundario ancho" onClick={() => { cerrar(false); abrirEnGlosario(t.id); }}>
              Ver en el glosario completo
            </button>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

// Contenido de un término: se usa en el cuadro emergente y en la vista Glosario.
export function FichaTermino({ t, idTitulo, sinCabeza = false }) {
  return (
    <div className="ficha-termino">
      {!sinCabeza && (
        <div className="ficha-termino-cabeza">
          <Icono nombre={t.icono} />
          <div>
            <h3 id={idTitulo}>{t.nombre}{t.sigla && !t.nombre.includes(t.sigla) && <small> ({t.sigla})</small>}</h3>
            <p className="ficha-termino-corto">{t.corto}</p>
          </div>
        </div>
      )}
      {t.noUsado && <p className="ficha-termino-nota">Todavía no se usa en Poseidon: se explica porque es un índice satelital común.</p>}
      {t.visual?.tipo === 'balanza' && <Balanza v={t.visual} />}
      {t.visual?.tipo === 'escala' && <Escala v={t.visual} />}
      <h4>¿Qué significa?</h4>
      <p>{t.explicacion}</p>
      <div className="ficha-termino-ejemplo">
        <h4>Ejemplo práctico</h4>
        <p>{t.ejemplo}</p>
      </div>
      <h4>En Poseidon</h4>
      <p>{t.usoPoseidon}</p>
      <p className="ficha-termino-fuente">Fuente: {t.fuente}</p>
    </div>
  );
}

// ---------- Apoyos visuales ----------
function Balanza({ v }) {
  const max = Math.max(...v.barras.map((b) => b.valor));
  return (
    <figure className="visual">
      <figcaption>{v.titulo}</figcaption>
      <ul className="balanza">
        {v.barras.map((b) => (
          <li key={b.etiqueta}>
            <span>{b.etiqueta}</span>
            <div className="pista"><div className={`relleno c-${b.tono}`} style={{ width: `${Math.max(3, (b.valor / max) * 100)}%` }} /></div>
            <b>{b.valor} {v.unidad}</b>
          </li>
        ))}
      </ul>
      {v.conclusion && <p className="visual-conclusion">{v.conclusion}</p>}
    </figure>
  );
}

function Escala({ v }) {
  const pct = (x) => ((x - v.min) / (v.max - v.min)) * 100;
  const fmt = (x) => x.toLocaleString('es-BO', { minimumFractionDigits: v.decimales, maximumFractionDigits: v.decimales })
    + (v.unidad ? ` ${v.unidad}` : '');
  return (
    <figure className="visual">
      <div className="escala" style={{ background: `linear-gradient(to right, ${v.colores.join(', ')})` }} aria-hidden="true">
        {v.marcas.map((m, i) => <span key={m.etiqueta} className="pin" style={{ left: `${pct(m.valor)}%` }}>{i + 1}</span>)}
      </div>
      <div className="escala-extremos" aria-hidden="true"><span>{fmt(v.min)}</span><span>{fmt(v.max)}</span></div>
      <ol className="escala-marcas">
        {v.marcas.map((m, i) => <li key={m.etiqueta}><span className="pin" aria-hidden="true">{i + 1}</span><b>{fmt(m.valor)}</b> {m.etiqueta}</li>)}
      </ol>
    </figure>
  );
}

const TRAZOS = {
  sol: <><circle cx="16" cy="16" r="6" fill="#fac748" /><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8" stroke="#f28c28" strokeWidth="2.2" strokeLinecap="round" /></>,
  gota: <path d="M16 4c5.5 6.5 8 11 8 15a8 8 0 0 1-16 0c0-4 2.5-8.5 8-15z" fill="#1e4e8c" />,
  termometro: <><path d="M13 6a3 3 0 0 1 6 0v12.5a6 6 0 1 1-6 0z" fill="#eaf1fa" stroke="#1e4e8c" strokeWidth="2" /><circle cx="16" cy="23" r="3.2" fill="#1e4e8c" /><path d="M16 11v11" stroke="#1e4e8c" strokeWidth="2.4" strokeLinecap="round" /></>,
  hoja: <><path d="M7 25C7 13 14 7 26 6c0 12-6 19-17 19z" fill="#2e9e5b" /><path d="M7 25c4-6 8-10 13-13" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" /></>,
  satelite: <><rect x="12" y="12" width="8" height="8" rx="1.5" transform="rotate(45 16 16)" fill="#1e4e8c" /><rect x="3" y="5" width="9" height="5" rx="1" transform="rotate(45 7.5 7.5)" fill="#f28c28" /><rect x="20" y="22" width="9" height="5" rx="1" transform="rotate(45 24.5 24.5)" fill="#f28c28" /><path d="M5 22a7 7 0 0 0 5 5M5 18a11 11 0 0 0 9 9" stroke="#7a1f3d" strokeWidth="1.8" fill="none" strokeLinecap="round" /></>,
  calendario: <><rect x="5" y="7" width="22" height="20" rx="3" fill="#fff" stroke="#1e4e8c" strokeWidth="2" /><path d="M5 13h22" stroke="#1e4e8c" strokeWidth="2" /><path d="M11 4v5M21 4v5" stroke="#7a1f3d" strokeWidth="2.2" strokeLinecap="round" /><circle cx="11" cy="19" r="1.8" fill="#f28c28" /><circle cx="16" cy="19" r="1.8" fill="#f28c28" /><circle cx="21" cy="19" r="1.8" fill="#fac748" /></>,
  suelo: <><path d="M3 18h26v9H3z" fill="#a8774a" /><path d="M3 18c4-2 8-2 13 0s9 2 13 0" fill="none" stroke="#7a4f2a" strokeWidth="2" /><circle cx="9" cy="23" r="1.2" fill="#7a4f2a" /><circle cx="20" cy="24" r="1.2" fill="#7a4f2a" /><path d="M16 17V9m0 3c-3-1-5-3-5-5 3 0 5 2 5 5zm0 0c3-1 5-3 5-5-3 0-5 2-5 5z" fill="#2e9e5b" stroke="#2e9e5b" strokeWidth="1.2" /></>,
};

export function Icono({ nombre }) {
  return <svg className="icono-termino" viewBox="0 0 32 32" aria-hidden="true">{TRAZOS[nombre] || TRAZOS.calendario}</svg>;
}
