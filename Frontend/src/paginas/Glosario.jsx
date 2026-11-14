import { useEffect, useState } from 'react';
import { CATEGORIAS, buscarTerminos } from '../glosario.js';
import { FichaTermino, Icono, Termino } from '../Termino.jsx';

// Guía interactiva y glosario científico simplificado (HU-USR-04). Visible para todos los roles.
// pedido: { id, n } cuando otra vista pidió abrir un término (n cambia en cada pedido).
export default function Glosario({ pedido }) {
  const [texto, setTexto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [abiertos, setAbiertos] = useState(() => new Set(pedido ? [pedido.id] : []));
  const lista = buscarTerminos(texto, categoria);

  // Al llegar desde un cuadro emergente: se limpia el filtro, se abre el término y se lleva a la vista.
  useEffect(() => {
    if (!pedido) return;
    setTexto('');
    setCategoria('');
    setAbiertos((a) => new Set(a).add(pedido.id));
    requestAnimationFrame(() => {
      const el = document.getElementById(`termino-${pedido.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el?.querySelector('button')?.focus({ preventScroll: true });
    });
  }, [pedido?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  const alternar = (id) => setAbiertos((a) => {
    const b = new Set(a);
    if (b.has(id)) b.delete(id); else b.add(id);
    return b;
  });

  return (
    <div className="dos-columnas">
      <aside>
        <div className="caja guia">
          <h2>Guía rápida: cómo leer su comparación</h2>
          <p className="suave">En toda la plataforma, las palabras con línea punteada y <span className="termino-i" aria-hidden="true">?</span> se pueden tocar para ver qué significan.</p>
          <ol className="pasos-guia">
            <li>
              <b>De dónde vienen los datos.</b> El <Termino id="climatologia">clima típico</Termino> de su parcela sale
              de <Termino id="nasa-power">NASA POWER</Termino>: lo que suele pasar cada mes, no un pronóstico.
            </li>
            <li>
              <b>Compare lo que entra y lo que sale.</b> Si la <Termino id="lluvia">lluvia</Termino> es mucho menor que
              la <Termino id="evapotranspiracion">evapotranspiración</Termino>, es un <Termino id="mes-seco">mes seco</Termino> y
              habrá que regar.
            </li>
            <li>
              <b>Busque el frío.</b> Una <Termino id="temperatura-minima">mínima</Termino> promedio baja avisa que muchas
              noches de ese mes pueden helar.
            </li>
            <li>
              <b>Lea cada estrategia.</b> Compare el <Termino id="riego">riego necesario</Termino>, los meses
              de <Termino id="suelo-desnudo">suelo desnudo</Termino> y el <Termino id="puntaje">puntaje</Termino>.
              Las <Termino id="leguminosa">leguminosas</Termino> y cambiar de <Termino id="familia">familia</Termino> mejoran el suelo.
            </li>
          </ol>
        </div>
      </aside>

      <section>
        <div className="caja">
          <label className="campo" style={{ marginTop: 0 }}>Buscar un término
            <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej.: helada, NDVI, riego" />
          </label>
          <div className="chips" role="group" aria-label="Filtrar por tema">
            {[['', 'Todos'], ...Object.entries(CATEGORIAS)].map(([clave, nombre]) => (
              <button key={clave} type="button" className={categoria === clave ? 'activa' : ''} aria-pressed={categoria === clave}
                onClick={() => setCategoria(clave)}>{nombre}</button>
            ))}
          </div>
        </div>

        {!lista.length && <p className="vacio">No encontramos “{texto}”. Pruebe con otra palabra.</p>}
        <ul className="glosario">
          {lista.map((t) => {
            const abierto = abiertos.has(t.id);
            return (
              <li key={t.id} id={`termino-${t.id}`} className={`termino-tarjeta ${abierto ? 'abierta' : ''}`}>
                <button type="button" className="termino-tarjeta-cabeza" aria-expanded={abierto} aria-controls={`ficha-${t.id}`}
                  onClick={() => alternar(t.id)}>
                  <Icono nombre={t.icono} />
                  <span>
                    <b>{t.nombre}</b>
                    {t.noUsado && <span className="etiqueta">aún no se usa</span>}
                    <small>{t.corto}</small>
                  </span>
                  <span className="flecha" aria-hidden="true">{abierto ? '−' : '+'}</span>
                </button>
                {abierto && <div id={`ficha-${t.id}`}><FichaTermino t={t} sinCabeza /></div>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
