// Mapa Leaflet. Se importa de forma diferida (ver Mapa en componentes.jsx): en modo de bajo
// consumo este módulo, Leaflet y sus estilos no se descargan.
import { useEffect } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, GeoJSON, CircleMarker, Polygon, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const COCHABAMBA = [-17.3895, -66.1568];

function Clic({ onElegir }) {
  useMapEvents({ click: (e) => onElegir([e.latlng.lat, e.latlng.lng]) });
  return null;
}

// Lleva el mapa a un punto cuando cambia (búsqueda de zona, coordenadas escritas a mano).
function Recentrar({ centro, zoom }) {
  const mapa = useMap();
  useEffect(() => {
    if (centro) mapa.flyTo(centro, zoom || Math.max(mapa.getZoom(), 14), { duration: 0.6 });
  }, [centro?.[0], centro?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// puntos: [{ id, lat, lon, texto, alerta, color, radio, fijo }]. Con onElegir, el mapa permite marcar.
// perimetro: [[lat, lon], ...] en dibujo. wms: { url, capas, atribucion }. geojson: límites a dibujar.
export default function MapaReal({ puntos = [], onElegir, alto = 240, perimetro, centro, zoom = 10, wms, geojson, onErrorWms, onPunto }) {
  const inicio = centro || (puntos[0] ? [puntos[0].lat, puntos[0].lon] : COCHABAMBA);
  return (
    <MapContainer center={inicio} zoom={zoom} className={`mapa ${onElegir ? 'elegible' : ''}`} style={{ height: alto }}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
      {wms?.url && (
        <WMSTileLayer url={wms.url} layers={wms.capas} format="image/png" transparent attribution={wms.atribucion}
          eventHandlers={{ tileerror: () => onErrorWms?.() }} />
      )}
      {geojson && <GeoJSON data={geojson} style={{ color: '#1E4E8C', weight: 1.5, fillOpacity: 0.04 }} />}
      {onElegir && <Clic onElegir={onElegir} />}
      <Recentrar centro={centro} zoom={zoom > 12 ? zoom : undefined} />
      {perimetro?.length >= 3 && <Polygon positions={perimetro} pathOptions={{ color: '#1E4E8C', weight: 2, fillOpacity: 0.15 }} />}
      {perimetro?.length === 2 && <Polyline positions={perimetro} pathOptions={{ color: '#1E4E8C', weight: 2 }} />}
      {perimetro?.map((p, i) => (
        <CircleMarker key={`v${i}`} center={p} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#F28C28', fillOpacity: 1 }}>
          <Tooltip>Punto {i + 1}</Tooltip>
        </CircleMarker>
      ))}
      {puntos.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lon]} radius={p.radio || 9}
          pathOptions={{ color: '#fff', weight: 2, fillColor: p.color || (p.alerta ? '#7A1F3D' : '#1E4E8C'), fillOpacity: 1 }}
          eventHandlers={onPunto ? { click: () => onPunto(p.id) } : undefined}>
          {p.texto && <Tooltip permanent={Boolean(p.fijo)} direction="top" offset={[0, -8]}>{p.texto}</Tooltip>}
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
