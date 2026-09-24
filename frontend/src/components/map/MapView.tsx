import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, TILE_LAYER_URL } from '../../lib/map';
import { OPERATION_COLORS } from '../../lib/format';
import type { Property } from '../../types';
import { useClusters, type ClusterFeature } from '../../hooks/useClusters';
import { useFilterStore } from '../../store/useFilterStore';
import { MapLegend } from './MapLegend';
import { MapAttribution } from './MapAttribution';
import { OFICINA } from '../../lib/oficina';

const HOME_ICON_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';

// Estrella: distingue de un vistazo el local de Latorre de las propiedades.
const STAR_ICON_SVG =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

function pinIcon(color: string, selected: boolean) {
  const scale = selected ? 1.18 : 1;
  return L.divIcon({
    className: '',
    html: `
      <div class="marker-enter" style="width:34px;height:34px;transform:scale(${scale});transform-origin:center bottom;">
        <div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);
          box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2.5px solid white;display:flex;align-items:center;justify-content:center;">
          <div style="transform:rotate(45deg);display:flex;">${HOME_ICON_SVG}</div>
        </div>
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
}

/**
 * Pin del local. Es más grande que los de las propiedades y lleva estrella, así
 * que se distingue incluso para alguien que no ve bien los colores.
 */
function oficinaIcon(selected: boolean) {
  const escala = selected ? 1.15 : 1;
  return L.divIcon({
    className: '',
    html: `
      <div class="marker-enter" style="width:40px;height:40px;transform:scale(${escala});transform-origin:center bottom;">
        <div style="width:40px;height:40px;border-radius:50% 50% 50% 0;background:${OFICINA.color};transform:rotate(-45deg);
          box-shadow:0 4px 10px rgba(0,0,0,0.4);border:3px solid white;display:flex;align-items:center;justify-content:center;">
          <div style="transform:rotate(45deg);display:flex;">${STAR_ICON_SVG}</div>
        </div>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
}

function clusterIcon(count: number) {
  const size = Math.min(56, 34 + Math.sqrt(count) * 6);
  return L.divIcon({
    className: '',
    html: `
      <div class="marker-enter" style="width:${size}px;height:${size}px;border-radius:9999px;background:#1B4332;
        border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;
        color:white;font-weight:700;font-size:13px;">
        ${count}
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface MapViewProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onSelectProperty: (property: Property) => void;
  /** Se llama al tocar el pin del local. */
  onSelectOficina: () => void;
  oficinaSeleccionada?: boolean;
  loading?: boolean;
}

export function MapView({
  properties,
  selectedPropertyId,
  onSelectProperty,
  onSelectOficina,
  oficinaSeleccionada = false,
  loading,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const oficinaRef = useRef<L.Marker | null>(null);
  const hasFitBoundsRef = useRef(false);

  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_MAP_ZOOM);
  const [mapReady, setMapReady] = useState(false);

  const { clusters, index } = useClusters(properties, bounds, zoom);

  // Pedido de "moverse a esta zona" desde el filtro de Provincia/Ciudad (ver
  // useFilterStore). Cuando llega uno, el mapa vuela ahí y se limpia el pedido.
  const flyTarget = useFilterStore((s) => s.flyTarget);
  const clearFlyTarget = useFilterStore((s) => s.clearFlyTarget);

  // Inicializa el mapa una sola vez
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      zoomControl: false,
      // La barra de atribución de Leaflet se reemplaza por el botón (i) de
      // MapAttribution, que muestra el crédito a OpenStreetMap al abrirlo.
      attributionControl: false,
    });

    L.tileLayer(TILE_LAYER_URL, { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const updateViewport = () => {
      const b = map.getBounds();
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      setZoom(map.getZoom());
    };

    map.whenReady(() => {
      setMapReady(true);
      updateViewport();
    });
    map.on('moveend', updateViewport);
    map.on('zoomend', updateViewport);

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Encuadra el mapa a las propiedades visibles la primera vez que llegan datos
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || hasFitBoundsRef.current || properties.length === 0) return;

    const bounds = L.latLngBounds(properties.map((p) => [p.publicLatitude, p.publicLongitude] as [number, number]));
    const mapSize = map.getSize();
    const padding = Math.max(32, Math.min(96, Math.round(Math.min(mapSize.x, mapSize.y) * 0.08)));
    map.fitBounds(bounds, { padding: [padding, padding], maxZoom: 15 });
    hasFitBoundsRef.current = true;
  }, [properties, mapReady]);

  // Mueve el mapa cuando el filtro de Provincia/Ciudad pide volar a una zona. Si el
  // usuario solo tocó otros filtros (precio, ambientes, etc.), nunca llega un
  // flyTarget y el mapa se queda tal cual está — es a propósito.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !flyTarget) return;
    map.flyTo([flyTarget.lat, flyTarget.lng], flyTarget.zoom, { duration: 0.85 });
    clearFlyTarget();
  }, [flyTarget, mapReady, clearFlyTarget]);

  // El pin del local va aparte de los clusters a propósito: no se agrupa con las
  // propiedades y no lo tocan los filtros. La oficina está siempre, se busque lo
  // que se busque.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const marcador = L.marker([OFICINA.latitud, OFICINA.longitud], {
      icon: oficinaIcon(false),
      title: `${OFICINA.nombre} — ${OFICINA.direccion}`,
      // Por DEBAJO de las propiedades y de los globos con el número de cada
      // grupo. La sede es una referencia, no lo que la persona vino a buscar:
      // si se superponen, tiene que ganar la propiedad.
      zIndexOffset: -1000,
    });
    marcador.on('click', onSelectOficina);
    marcador.addTo(map);
    oficinaRef.current = marcador;

    return () => {
      marcador.remove();
      oficinaRef.current = null;
    };
  }, [mapReady, onSelectOficina]);

  useEffect(() => {
    oficinaRef.current?.setIcon(oficinaIcon(oficinaSeleccionada));
  }, [oficinaSeleccionada]);

  // Sincroniza los marcadores del DOM con los clusters calculados
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const nextKeys = new Set<string>();

    clusters.forEach((feature: ClusterFeature) => {
      const [lng, lat] = feature.geometry.coordinates;

      if (feature.properties.cluster) {
        // Guardamos los datos del cluster en constantes: dentro del callback del
        // click, TypeScript ya no puede saber que `feature.properties` sigue
        // siendo la variante "cluster" de la unión.
        const clusterId = feature.properties.cluster_id;
        const pointCount = feature.properties.point_count;
        const key = `cluster-${clusterId}`;
        nextKeys.add(key);
        if (!markersRef.current.has(key)) {
          const marker = L.marker([lat, lng], { icon: clusterIcon(pointCount) });
          marker.on('click', () => {
            const expansionZoom = Math.min(index.getClusterExpansionZoom(clusterId), 18);
            map.flyTo([lat, lng], expansionZoom, { duration: 0.45 });
          });
          marker.addTo(map);
          markersRef.current.set(key, marker);
        } else {
          markersRef.current.get(key)!.setLatLng([lat, lng]);
        }
      } else {
        const property = feature.properties.property;
        const key = `property-${property.id}`;
        nextKeys.add(key);
        const selected = property.id === selectedPropertyId;
        const color = OPERATION_COLORS[property.operationType];

        const existing = markersRef.current.get(key);
        if (!existing) {
          const marker = L.marker([lat, lng], { icon: pinIcon(color, selected) });
          marker.on('click', () => onSelectProperty(property));
          marker.addTo(map);
          markersRef.current.set(key, marker);
        } else {
          existing.setLatLng([lat, lng]);
        }
      }
    });

    // Elimina los marcadores que ya no están en el set de clusters actual
    markersRef.current.forEach((marker, key) => {
      if (!nextKeys.has(key)) {
        marker.remove();
        markersRef.current.delete(key);
      }
    });
  }, [clusters, index, mapReady, onSelectProperty, selectedPropertyId]);

  // Refresca sólo el ícono "seleccionado" sin recrear todos los marcadores
  useEffect(() => {
    markersRef.current.forEach((marker, key) => {
      if (!key.startsWith('property-')) return;
      const propertyId = key.replace('property-', '');
      const property = properties.find((p) => p.id === propertyId);
      if (!property) return;
      const isSelected = propertyId === selectedPropertyId;
      marker.setIcon(pinIcon(OPERATION_COLORS[property.operationType], isSelected));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" role="application" aria-label="Mapa interactivo de propiedades" />

      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] sm:bottom-6 sm:left-6">
        <MapLegend />
      </div>

      {/* Al lado de los botones de zoom, que están abajo a la derecha. */}
      <div className="pointer-events-none absolute bottom-4 right-[58px] z-[500] sm:bottom-6">
        <MapAttribution />
      </div>

      {loading && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-[500] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-medium text-latorre-ink/70 shadow-card">
          Actualizando propiedades…
        </div>
      )}
    </div>
  );
}