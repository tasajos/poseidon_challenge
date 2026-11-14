// Piezas compartidas de la oferta sostenible (HU-CLI-02) y las solicitudes (HU-CLI-03).
import { Termino } from './Termino.jsx';

export const PRACTICAS_CORTAS = {
  leguminosa: 'Leguminosa en la rotación',
  alterna_familias: 'Alterna familias de cultivos',
  cobertura: 'Suelo cubierto casi todo el año',
  raiz_profunda: 'Cultivos de raíz profunda',
};
const NIVEL = { alta: 'Alto', media: 'Medio', baja: 'Bajo' };
const UNIDAD = { kg: 'kg', qq: 'quintales', t: 'toneladas' };
export const unidad = (u, n) => (u === 'qq' && n === 1 ? 'quintal' : u === 't' && n === 1 ? 'tonelada' : UNIDAD[u] || u);
export const cantidadTexto = (n, u) => `${Number(n).toLocaleString('es-BO')} ${unidad(u, Number(n))}`;

// "2027-04" → "abril de 2027"
export const mesLegible = (am) => {
  const [a, m] = String(am).split('-').map(Number);
  return a && m ? new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('es-BO', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : am;
};

export function SelloAgua({ agua }) {
  return (
    <div className={`sello-agua nivel-${agua.nivel}`}>
      <b>{agua.indice}</b>
      <span>
        <strong><Termino id="indice-agua">Uso eficiente del agua</Termino>: {NIVEL[agua.nivel]}</strong>
        {agua.riego_mm !== null && (
          <small>Riego estimado {agua.riego_mm} mm por campaña{agua.lluvia_pct !== null && ` · la lluvia cubre el ${agua.lluvia_pct} % de lo que necesita`}</small>
        )}
      </span>
    </div>
  );
}

// o: oferta tal como la entrega la API (vistaOferta). children: acciones al pie.
export function TarjetaOferta({ o, children, extra }) {
  return (
    <article className="oferta">
      <div className="oferta-cabeza">
        <div>
          <h3>{o.cultivo_nombre} <span>· {cantidadTexto(o.cantidad, o.unidad)}</span></h3>
          <p className="suave">{o.zona} · desde {mesLegible(o.disponible_desde)} · {o.productor}</p>
        </div>
        {o.verificada
          ? <span className="etiqueta verificada">Verificada <Termino id="verificada" soloIcono /></span>
          : <span className="etiqueta sin-verificar">Sin verificar <Termino id="verificada" soloIcono /></span>}
      </div>
      {extra}
      <SelloAgua agua={o.agua} />
      <h4><Termino id="practicas-rotacion">Prácticas de rotación</Termino></h4>
      <ul className="practicas">
        {Object.entries(PRACTICAS_CORTAS).map(([k, texto]) => (
          <li key={k} className={o.practicas[k] ? 'si' : 'no'}>
            <span aria-hidden="true">{o.practicas[k] ? '✓' : '–'}</span>
            {texto}<span className="sr-only">{o.practicas[k] ? ': sí' : ': no'}</span>
          </li>
        ))}
      </ul>
      <p className="oferta-rotacion"><b>Rotación:</b> {o.rotacion.join(' → ')}</p>
      {o.nota && <p className="oferta-nota">“{o.nota}”</p>}
      {children}
    </article>
  );
}

const ESTADOS = { pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada', retirada: 'Retirada' };
export const EstadoSolicitud = ({ estado }) => <span className={`estado-solicitud ${estado}`}>{ESTADOS[estado] || estado}</span>;

// Datos de contacto compartidos al aceptar.
export function Contacto({ contacto, nombre }) {
  if (!contacto) return null;
  return (
    <div className="contacto">
      <b>Contacto de {nombre}</b>
      <a href={`mailto:${contacto.email}`}>{contacto.email}</a>
      {contacto.telefono && <a href={`tel:${contacto.telefono}`}>{contacto.telefono}</a>}
    </div>
  );
}
