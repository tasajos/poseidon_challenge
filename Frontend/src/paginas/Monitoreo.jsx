import { api } from '../api.js';
import { Estado, Mapa, Stat, fecha, useDatos } from '../componentes.jsx';

export default function Monitoreo() {
  const { datos: d, error } = useDatos(api.monitoreo);
  if (error) return <p className="error">{error}</p>;
  if (!d) return <p className="cargando">Cargando…</p>;
  const conAlerta = new Set(d.alertas.map((a) => a.id));
  const nasa = d.fuentes_clima['nasa-power'] || 0;

  return (
    <>
      <div className="stats">
        <Stat etiqueta="Evaluaciones" valor={d.totales.evaluaciones} tono="azul" />
        <Stat etiqueta="Alertas activas" valor={d.totales.alertas} tono="vino" />
        <Stat etiqueta="Pendientes de revisión" valor={d.totales.pendientes} tono="naranja" />
        <Stat etiqueta="Con datos de NASA" valor={`${nasa} de ${d.totales.evaluaciones}`} tono="amarillo" detalle="el resto usa clima de demostración" />
      </div>

      <div className="dos-columnas ancha">
        <div className="caja">
          <h2>Mapa de parcelas</h2>
          <Mapa alto={340} puntos={d.evaluaciones.map((e) => ({
            id: e.id, lat: e.lat, lon: e.lon, alerta: conAlerta.has(e.id), texto: `${e.parcela} · ${e.cliente}`,
          }))} />
          <p className="leyenda"><i className="marca-azul" /> sin alertas <i className="marca-vino" /> con alertas</p>
        </div>
        <div className="caja">
          <h2>Alertas</h2>
          {!d.alertas.length && <p className="suave">Sin alertas por ahora.</p>}
          <ul className="alertas">
            {d.alertas.map((a, i) => (
              <li key={i} className={a.tipo}><b>{a.parcela}</b><span>{a.texto}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="caja">
        <h2>Actividad</h2>
        {!d.evaluaciones.length && <p className="suave">Todavía no hay evaluaciones.</p>}
        {d.evaluaciones.length > 0 && (
          <div className="tabla-scroll">
            <table className="tabla apilable">
              <thead><tr><th>Parcela</th><th>Agricultor</th><th>Rotación actual</th><th>Riego (mm)</th><th>Mejor opción</th><th>Estado</th><th>Fecha</th></tr></thead>
              <tbody>
                {d.evaluaciones.map((e) => (
                  <tr key={e.id}>
                    <td data-t="Parcela"><b>{e.parcela}</b></td><td data-t="Agricultor">{e.cliente}</td>
                    <td data-t="Rotación actual">{e.resumen.actual.nombres.join(' → ')}</td>
                    <td data-t="Riego (mm)" className="num">{e.resumen.deficit_agua_mm}</td>
                    <td data-t="Mejor opción">{e.resumen.mejor.nombres.join(' → ')} ({e.resumen.mejor.puntaje})</td>
                    <td data-t="Estado"><Estado estado={e.estado} /></td><td data-t="Fecha">{fecha(e.creado_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
