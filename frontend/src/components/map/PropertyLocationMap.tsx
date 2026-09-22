import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_LAYER_ATTRIBUTION, TILE_LAYER_URL } from '../../lib/map';
import { OPERATION_COLORS } from '../../lib/format';
import type { OperationType } from '../../types';

interface PropertyLocationMapProps {
  latitude: number;
  longitude: number;
  operationType: OperationType;
}

export function PropertyLocationMap({ latitude, longitude, operationType }: PropertyLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer(TILE_LAYER_URL, { attribution: TILE_LAYER_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:${OPERATION_COLORS[operationType]};
        transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    L.marker([latitude, longitude], { icon }).addTo(map);

    // Las llaves importan: map.remove() devuelve el mapa, y la función de
    // limpieza de useEffect no puede devolver nada.
    return () => {
      map.remove();
    };
  }, [latitude, longitude, operationType]);

  return (
    <div ref={containerRef} className="h-72 w-full sm:h-80" role="application" aria-label="Ubicación de la propiedad en el mapa" />
  );
}
