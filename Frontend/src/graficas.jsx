// Gráficas de Poseidon. Colores validados con el verificador de paletas (contraste, daltonismo):
// --serie-1 #2a6fbf y --serie-2 #cf6f14 para dos series; un solo tono para magnitudes.
// El texto usa siempre la tinta del sitio; el color lo llevan las marcas.
import { useState } from 'react';

const num = (v, dec = 2) => (v === null || v === undefined ? 'sin dato' : Number(v).toLocaleString('es-BO', { minimumFractionDigits: dec, maximumFractionDigits: dec }));

const SERIES = [
  { clave: 'humeda', nombre: 'Época húmeda (ene-mar)', corto: 'Húmeda', color: 'var(--serie-1)' },
  { clave: 'seca', nombre: 'Época seca (jul-sep)', corto: 'Seca', color: 'var(--serie-2)' },
];

// NDVI medio por año en las dos épocas. resumen: [{ anio, humeda, seca }]. umbral: bajo él, suelo desnudo.
export function GraficaNdvi({ resumen, umbral = 0.2 }) {
  const [activo, setActivo] = useState(null);
  if (!resumen.length) return null;
  const W = 560, H = 250, m = { izq: 38, der: 96, arr: 14, aba: 30 };
  const ancho = W - m.izq - m.der, alto = H - m.arr - m.aba;
  const valores = resumen.flatMap((r) => [r.humeda, r.seca]).filter((v) => v !== null);
  const tope = Math.max(0.8, Math.ceil(Math.max(...valores, umbral) * 5) / 5);
  const x = (i) => m.izq + (resumen.length === 1 ? ancho / 2 : (i * ancho) / (resumen.length - 1));
  const y = (v) => m.arr + alto - (Math.max(0, v) / tope) * alto;
  const marcas = Array.from({ length: Math.round(tope / 0.2) + 1 }, (_, i) => Math.round(i * 2) / 10);
  const puntos = (clave) => resumen.map((r, i) => (r[clave] === null ? null : [x(i), y(r[clave])]));
  const trazo = (clave) => puntos(clave).reduce((d, p, i, todos) => (p ? `${d}${todos[i - 1] ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}` : d), '');
  // Etiquetas directas al final de cada línea; si quedarían encimadas, la leyenda y la tabla bastan.
  const ultimos = SERIES.map((s) => ({ ...s, v: resumen.at(-1)[s.clave] })).filter((s) => s.v !== null);
  const separadas = ultimos.length < 2 || Math.abs(y(ultimos[0].v) - y(ultimos[1].v)) >= 16;

  const alMover = (ev) => {
    const caja = ev.currentTarget.getBoundingClientRect();
    const px = ((ev.clientX - caja.left) / caja.width) * W;
    setActivo(resumen.reduce((mejor, _, i) => (Math.abs(x(i) - px) < Math.abs(x(mejor) - px) ? i : mejor), 0));
  };
  const r = activo === null ? null : resumen[activo];
  return (
    <figure className="viz">
      <ul className="viz-leyenda">
        {SERIES.map((s) => <li key={s.clave}><span className="viz-trazo" style={{ background: s.color }} />{s.nombre}</li>)}
      </ul>
      <div className="viz-lienzo">
        <svg viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`NDVI de la parcela por año. ${resumen.map((a) => `${a.anio}: húmeda ${num(a.humeda)}, seca ${num(a.seca)}`).join('; ')}`}
          onPointerMove={alMover} onPointerLeave={() => setActivo(null)}>
          {marcas.map((t) => (
            <g key={t}>
              <line x1={m.izq} x2={m.izq + ancho} y1={y(t)} y2={y(t)} className="viz-rejilla" />
              <text x={m.izq - 8} y={y(t) + 4} textAnchor="end" className="viz-eje">{num(t, 1)}</text>
            </g>
          ))}
          <line x1={m.izq} x2={m.izq + ancho} y1={y(umbral)} y2={y(umbral)} className="viz-umbral" />
          <text x={m.izq + 4} y={y(umbral) - 5} className="viz-eje">Bajo {num(umbral, 1)}: suelo casi desnudo</text>
          {resumen.map((a, i) => <text key={a.anio} x={x(i)} y={H - 8} textAnchor="middle" className="viz-eje">{a.anio}</text>)}
          {activo !== null && <line x1={x(activo)} x2={x(activo)} y1={m.arr} y2={m.arr + alto} className="viz-cruz" />}
          {SERIES.map((s) => (
            <g key={s.clave}>
              <path d={trazo(s.clave)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {puntos(s.clave).map((p, i) => p && <circle key={i} cx={p[0]} cy={p[1]} r={activo === i ? 5.5 : 4} fill={s.color} stroke="var(--papel)" strokeWidth="2" />)}
            </g>
          ))}
          {separadas && ultimos.map((s) => (
            <text key={s.clave} x={x(resumen.length - 1) + 12} y={y(s.v) + 4} className="viz-etiqueta">{s.corto} <tspan className="viz-valor">{num(s.v)}</tspan></text>
          ))}
          {/* Un área por año para el teclado: muestra el mismo detalle que el cursor */}
          {resumen.map((a, i) => (
            <rect key={a.anio} x={x(i) - 16} y={m.arr} width="32" height={alto} fill="transparent" tabIndex={0}
              aria-label={`${a.anio}: época húmeda ${num(a.humeda)}, época seca ${num(a.seca)}`}
              onFocus={() => setActivo(i)} onBlur={() => setActivo(null)} />
          ))}
        </svg>
        {r && (
          <div className="viz-tooltip" style={{ left: `${(x(activo) / W) * 100}%` }} role="status">
            <b>{r.anio}</b>
            {SERIES.map((s) => (
              <span key={s.clave}><span className="viz-trazo" style={{ background: s.color }} /><strong>{num(r[s.clave])}</strong> {s.corto.toLowerCase()}</span>
            ))}
          </div>
        )}
      </div>
      <details className="viz-tabla">
        <summary>Ver los valores en una tabla</summary>
        <table>
          <thead><tr><th>Año</th><th>Época húmeda</th><th>Época seca</th></tr></thead>
          <tbody>{resumen.map((a) => <tr key={a.anio}><th>{a.anio}</th><td>{num(a.humeda)}</td><td>{num(a.seca)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

// Lista de medidores: un nombre, una barra y una cifra por fila, todas sobre la misma escala.
// filas: [{ nombre, valor (0-max) o null, cifra (texto), detalle }]
export function ListaMedidores({ filas, max = 100, vacio = 'Sin datos todavía.' }) {
  if (!filas.length) return <p className="suave">{vacio}</p>;
  return (
    <ul className="medidores">
      {filas.map((f) => (
        <li key={f.nombre} title={`${f.nombre}: ${f.cifra}${f.detalle ? ` · ${f.detalle}` : ''}`}>
          <span className="medidor-nombre">{f.nombre}{f.detalle && <small>{f.detalle}</small>}</span>
          <span className="medidor-pista" aria-hidden="true">
            {f.valor !== null && f.valor > 0 && <span className="medidor-relleno" style={{ width: `${Math.max(1.5, Math.min(100, (f.valor / max) * 100))}%` }} />}
          </span>
          <b className="medidor-cifra">{f.cifra}</b>
        </li>
      ))}
    </ul>
  );
}
