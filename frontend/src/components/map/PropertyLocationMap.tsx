import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_LAYER_URL } from '../../lib/map';
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
      // El crédito del mapa está en el botón "Acerca de" del encabezado.
      attributionControl: false,
    });

    L.tileLayer(TILE_LAYER_URL, { maxZoom: 19 }).addTo(map);

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
    <div className="relative">
      <div ref={containerRef} className="h-72 w-full sm:h-80" role="application" aria-label="Ubicación de la propiedad en el mapa" />
      {/* Esta página se desplaza, así que el crédito va como texto debajo del
          mapa en vez de flotando encima: no tapa nada y se lee sin tener que
          abrir nada. */}
      <p className="px-1 pt-1.5 text-[11px] text-latorre-ink/40">
        Datos del mapa ©{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-latorre-ink/70"
        >
          OpenStreetMap
        </a>{' '}
        y sus colaboradores
      </p>
    </div>
  );
}
