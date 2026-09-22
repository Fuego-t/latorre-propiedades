import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search } from 'lucide-react';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, TILE_LAYER_ATTRIBUTION, TILE_LAYER_URL } from '../../lib/map';
import { searchAddress, type GeoSuggestion, type SearchResult } from '../../lib/geocoding';

interface LocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  /** Localidad cargada en el formulario: se usa como contexto de la búsqueda. */
  city?: string;
  /** Dirección exacta del formulario, para ofrecer buscarla con un clic. */
  address?: string;
}

export function LocationPickerMap({ latitude, longitude, onChange, city, address }: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Zoom a aplicar en el próximo reposicionamiento (lo fija la búsqueda)
  const nextZoomRef = useRef<number | null>(null);

  // Número de la última búsqueda pedida. Sirve para descartar respuestas viejas
  // sin depender de que el AbortController haya alcanzado a cancelarlas.
  const requestIdRef = useRef(0);
  // Texto ya elegido de la lista: no hay que volver a buscarlo.
  const selectedRef = useRef<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState<'idle' | 'empty' | 'offline'>('idle');
  // Georef no encontró nada: ofrecemos buscar en OpenStreetMap con un clic.
  const [canRetryWithOsm, setCanRetryWithOsm] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const hasCoords = latitude != null && longitude != null;
    const initialCenter: [number, number] = hasCoords ? [latitude, longitude] : DEFAULT_MAP_CENTER;

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: hasCoords ? 16 : DEFAULT_MAP_ZOOM,
    });

    L.tileLayer(TILE_LAYER_URL, { attribution: TILE_LAYER_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    const marker = L.marker(initialCenter, {
      draggable: true,
      icon: L.divIcon({
        className: '',
        html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#C9A227;
          transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);"></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      }),
    }).addTo(map);

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      onChange(lat, lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onChange(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si las coordenadas cambian desde afuera (al cargar una propiedad existente o
  // al elegir un resultado de la búsqueda), reposiciona el pin. No hace nada si
  // el pin ya está ahí, para no re-encuadrar el mapa en cada clic o arrastre.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || latitude == null || longitude == null) return;

    const current = marker.getLatLng();
    if (Math.abs(current.lat - latitude) < 1e-7 && Math.abs(current.lng - longitude) < 1e-7) return;

    marker.setLatLng([latitude, longitude]);
    map.flyTo([latitude, longitude], nextZoomRef.current ?? Math.max(map.getZoom(), 16));
    nextZoomRef.current = null;
  }, [latitude, longitude]);

  const runSearch = useCallback(
    async (text: string, allowOsm = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const requestId = ++requestIdRef.current;
      setSearching(true);

      let found: SearchResult;
      try {
        found = await searchAddress(text, { city, allowOsm, signal: controller.signal });
      } catch {
        found = { suggestions: [], unreachable: true, canRetryWithOsm: false };
      }

      // Llegó tarde: ya hay otra búsqueda en curso y manda esa.
      if (requestId !== requestIdRef.current) return;

      // El estado de "buscando" se apaga SIEMPRE para la búsqueda vigente. Antes se
      // salteaba cuando la consulta había sido cancelada, y bastaba que la última
      // quedara cancelada para que el cartel "Buscando…" no se fuera más.
      setSearching(false);
      setResults(found.suggestions);
      setCanRetryWithOsm(found.canRetryWithOsm);
      setStatus(found.unreachable ? 'offline' : found.suggestions.length === 0 ? 'empty' : 'idle');
    },
    [city]
  );

  // Sugerencias mientras se escribe.
  useEffect(() => {
    const text = query.trim();

    if (text.length < 3 || text === selectedRef.current) {
      // Cancelamos lo que estuviera en curso: si no, una respuesta vieja repone
      // resultados de un texto que el usuario ya borró.
      abortRef.current?.abort();
      requestIdRef.current++;
      setSearching(false);
      setResults([]);
      setStatus('idle');
      setCanRetryWithOsm(false);
      return;
    }

    // Mientras se escribe, sólo Georef (gratis y sin límite de consultas).
    const timer = setTimeout(() => void runSearch(query), 550);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  // Al desmontar (cambiar de paso del formulario) no dejamos pedidos colgados.
  useEffect(() => () => abortRef.current?.abort(), []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 3) return;
    selectedRef.current = null;
    // La búsqueda pedida a mano sí puede ir a OpenStreetMap.
    void runSearch(query, true);
  }

  function selectResult(result: GeoSuggestion) {
    nextZoomRef.current = 17;
    onChange(result.lat, result.lng);
    setResults([]);
    setStatus('idle');
    selectedRef.current = result.label.trim();
    setQuery(result.label);
  }

  const suggestedQuery = address?.trim();
  const showSuggestedQuery = Boolean(suggestedQuery) && suggestedQuery !== query.trim();

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setResults([]);
          }}
          placeholder="Buscar dirección (ej: calle 8 e/ 39 y 40, La Plata)"
          className="w-full rounded-lg border border-latorre-dark/15 bg-white px-3 py-2 pr-10 text-sm outline-none focus:border-latorre-gold"
        />
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-latorre-ink/40 hover:text-latorre-dark">
          <Search size={16} />
        </button>

        {results.length > 0 && (
          <ul className="absolute z-[500] mt-1 w-full overflow-hidden rounded-lg border border-latorre-dark/10 bg-white shadow-card">
            {results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => selectResult(result)}
                  className="block w-full px-3 py-2 text-left hover:bg-latorre-cream"
                >
                  <span className="flex items-center gap-1.5 text-sm text-latorre-ink">
                    {result.label}
                    {result.approximate && (
                      <span className="rounded-full bg-latorre-gold/20 px-1.5 py-0.5 text-[10px] font-semibold text-latorre-dark">
                        aprox.
                      </span>
                    )}
                  </span>
                  {result.detail && <span className="block text-xs text-latorre-ink/45">{result.detail}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {searching && <p className="text-xs text-latorre-ink/40">Buscando…</p>}

      {!searching && status === 'empty' && (
        <p className="text-xs text-latorre-ink/50">
          {canRetryWithOsm ? (
            <>
              El buscador oficial no tiene esa dirección.{' '}
              <button
                type="button"
                onClick={() => void runSearch(query, true)}
                className="font-medium text-latorre-gold underline underline-offset-2"
              >
                Buscarla en OpenStreetMap
              </button>
              , probá con la esquina más cercana (ej: <span className="font-medium">8 y 39</span>) o ubicá el pin a mano.
            </>
          ) : (
            <>
              Sin resultados. Probá con la esquina más cercana (ej: <span className="font-medium">8 y 39</span>), revisá
              la localidad, o ubicá el pin a mano en el mapa.
            </>
          )}
        </p>
      )}

      {!searching && status === 'offline' && (
        <p className="text-xs text-red-600">
          No se pudo conectar con el buscador de direcciones (sin respuesta o sin internet).{' '}
          <button type="button" onClick={() => void runSearch(query)} className="font-medium underline underline-offset-2">
            Reintentar
          </button>{' '}
          o ubicá el pin a mano en el mapa.
        </p>
      )}

      {results.some((result) => result.approximate) && (
        <p className="text-xs text-latorre-ink/50">
          El punto marcado «aprox.» es de la calle, no de la altura exacta: después movelo al lugar justo arrastrando el
          pin.
        </p>
      )}

      {showSuggestedQuery && (
        <button
          type="button"
          onClick={() => setQuery(suggestedQuery as string)}
          className="text-xs text-latorre-gold underline-offset-2 hover:underline"
        >
          Buscar «{suggestedQuery}»
        </button>
      )}

      <div className="overflow-hidden rounded-lg border border-latorre-dark/10">
        <div ref={containerRef} className="h-64 w-full sm:h-80" />
      </div>

      <p className="text-xs text-latorre-ink/45">
        Escribí la dirección como se usa acá —<span className="font-medium"> calle 8 e/ 39 y 40</span>,
        <span className="font-medium"> 8 y 39</span> o <span className="font-medium">calle 8 3950</span>— y elegí un
        resultado. También podés arrastrar el pin dorado o hacer clic en el mapa para ajustarlo.
        {latitude != null && longitude != null && (
          <span className="ml-1 font-mono text-latorre-ink/60">
            ({latitude.toFixed(5)}, {longitude.toFixed(5)})
          </span>
        )}
      </p>
    </div>
  );
}
