import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useFilterStore } from '../../store/useFilterStore';
import { api } from '../../lib/api';
import type { Location, OperationType, PropertyType } from '../../types';
import { OPERATION_LABELS, PROPERTY_TYPE_LABELS } from '../../lib/format';
import { ARGENTINA_LOCALIDADES, ARGENTINA_PROVINCIAS, type ArgentinaProvincia } from '../../data/argentinaLocalidades';
import { resolveFlyTarget } from '../../data/argentinaCoordenadas';

const OPERATIONS: OperationType[] = ['SALE', 'COMMERCIAL_RENT', 'RESIDENTIAL_RENT'];
const PROPERTY_TYPES: PropertyType[] = [
  'HOUSE',
  'APARTMENT',
  'COMMERCIAL_UNIT',
  'OFFICE',
  'LAND',
  'FIELD',
  'COUNTRY_HOUSE',
  'OTHER',
];

const FALLBACK_LOCATIONS = ['Coronel Brandsen', 'Jeppener', 'Gómez'];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latorre-ink/50">{children}</label>;
}

const selectClass =
  'w-full rounded-lg border border-latorre-dark/15 bg-white px-3 py-2 text-sm text-latorre-ink outline-none transition focus:border-latorre-gold';

interface FilterPanelProps {
  resultCount: number;
}

export function FilterPanel({ resultCount }: FilterPanelProps) {
  const { filters, setFilter, clearFilters, isPanelOpen, setPanelOpen, activeCount, requestFlyTo } = useFilterStore();
  const [locations, setLocations] = useState<string[]>(FALLBACK_LOCATIONS);
  // Coordenadas reales de las localidades ya cargadas en la base de datos (Location),
  // indexadas por nombre. Se usan para mover el mapa con precisión cuando la ciudad
  // elegida es una de las que ya conocemos (ej: Coronel Brandsen, Jeppener, Gómez).
  const [dbCoords, setDbCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  // Provincia elegida en el filtro. No se manda al backend: solo se usa acá, del lado
  // del cliente, para decidir qué ciudades mostrar en el segundo desplegable. Lo que
  // efectivamente filtra las propiedades sigue siendo `filters.location` (el nombre de
  // la ciudad/localidad), exactamente como antes.
  const [province, setProvince] = useState<string>('');

  useEffect(() => {
    api.locations
      .list()
      .then((res) => {
        if (res.locations?.length) {
          setLocations(res.locations.map((l: Location) => l.name));
          const coords: Record<string, { lat: number; lng: number }> = {};
          res.locations.forEach((l: Location) => {
            coords[l.name] = { lat: l.latitude, lng: l.longitude };
          });
          setDbCoords(coords);
        }
      })
      .catch(() => {
        /* mantiene el fallback si la API todavía no está levantada */
      });
  }, []);

  // Ciudades a mostrar en el segundo desplegable:
  // - Sin provincia elegida: la lista de localidades que ya tenía el sitio (las cargadas
  //   en la base de datos / el fallback), para no cambiar el comportamiento por defecto.
  // - Con una provincia elegida: la lista completa de esa provincia (ver
  //   src/data/argentinaLocalidades.ts). Para Buenos Aires, además se suman las
  //   localidades que ya están cargadas en la base de datos, por si hay alguna que no
  //   esté en la lista armada a mano.
  const citiesForProvince = useMemo(() => {
    if (!province) return locations;
    const base = ARGENTINA_LOCALIDADES[province as ArgentinaProvincia] ?? [];
    const extra = province === 'Buenos Aires' ? locations : [];
    return Array.from(new Set([...base, ...extra])).sort((a, b) => a.localeCompare(b, 'es'));
  }, [province, locations]);

  if (!isPanelOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent" onClick={() => setPanelOpen(false)} />

      <aside
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl bg-white pb-safe-bottom shadow-card-hover sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-24 sm:max-h-[calc(100vh-7rem)] sm:w-96 sm:rounded-xl2 sm:border sm:border-latorre-dark/10 lg:right-8"
        role="dialog"
        aria-label="Filtros de búsqueda"
      >
        <div className="flex items-center justify-between border-b border-latorre-dark/8 px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-latorre-dark">Filtros</h2>
          <button
            onClick={() => setPanelOpen(false)}
            className="rounded-full p-1.5 text-latorre-ink/50 transition hover:bg-latorre-dark/5 hover:text-latorre-dark"
            aria-label="Cerrar filtros"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <FieldLabel>Operación</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {OPERATIONS.map((op) => (
                <button
                  key={op}
                  onClick={() => setFilter('operationType', filters.operationType === op ? undefined : op)}
                  className={`chip transition ${
                    filters.operationType === op ? '!border-latorre-gold !bg-latorre-dark !text-white' : ''
                  }`}
                >
                  {OPERATION_LABELS[op]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Provincia</FieldLabel>
            <select
              className={selectClass}
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                // Al cambiar de provincia, la ciudad elegida antes puede ya no
                // corresponder — se limpia para evitar un filtro inconsistente.
                setFilter('location', undefined);
              }}
            >
              <option value="">Todas las provincias</option>
              {ARGENTINA_PROVINCIAS.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Ciudad</FieldLabel>
            <select
              className={selectClass}
              value={filters.location ?? ''}
              onChange={(e) => setFilter('location', e.target.value || undefined)}
            >
              <option value="">Todas las localidades</option>
              {citiesForProvince.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Tipo de propiedad</FieldLabel>
            <select
              className={selectClass}
              value={filters.propertyType ?? ''}
              onChange={(e) => setFilter('propertyType', (e.target.value || undefined) as PropertyType | undefined)}
            >
              <option value="">Todos los tipos</option>
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PROPERTY_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Precio</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="Mínimo"
                className={selectClass}
                value={filters.minPrice ?? ''}
                onChange={(e) => setFilter('minPrice', e.target.value ? Number(e.target.value) : undefined)}
              />
              <input
                type="number"
                placeholder="Máximo"
                className={selectClass}
                value={filters.maxPrice ?? ''}
                onChange={(e) => setFilter('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
              />
              <select
                className={selectClass}
                value={filters.currency ?? ''}
                onChange={(e) => setFilter('currency', (e.target.value || undefined) as 'USD' | 'ARS' | undefined)}
              >
                <option value="">USD/ARS</option>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <FieldLabel>Ambientes</FieldLabel>
              <input
                type="number"
                min={0}
                className={selectClass}
                value={filters.rooms ?? ''}
                onChange={(e) => setFilter('rooms', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div>
              <FieldLabel>Dormitorios</FieldLabel>
              <input
                type="number"
                min={0}
                className={selectClass}
                value={filters.bedrooms ?? ''}
                onChange={(e) => setFilter('bedrooms', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div>
              <FieldLabel>Baños</FieldLabel>
              <input
                type="number"
                min={0}
                className={selectClass}
                value={filters.bathrooms ?? ''}
                onChange={(e) => setFilter('bathrooms', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Superficie (m²)</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Mínima"
                className={selectClass}
                value={filters.minArea ?? ''}
                onChange={(e) => setFilter('minArea', e.target.value ? Number(e.target.value) : undefined)}
              />
              <input
                type="number"
                placeholder="Máxima"
                className={selectClass}
                value={filters.maxArea ?? ''}
                onChange={(e) => setFilter('maxArea', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-latorre-ink">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-latorre-dark/30 text-latorre-gold focus:ring-latorre-gold"
              checked={filters.featured ?? false}
              onChange={(e) => setFilter('featured', e.target.checked || undefined)}
            />
            Sólo propiedades destacadas
          </label>
        </div>

        <div className="border-t border-latorre-dark/8 px-5 py-4">
          <p className="mb-3 text-center text-sm font-medium text-latorre-ink/70">
            {resultCount} {resultCount === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={clearFilters} disabled={activeCount() === 0}>
              Limpiar filtros
            </button>
            <button
              className="btn-primary flex-1"
              onClick={() => {
                // Solo mueve el mapa si hay una ciudad elegida (con o sin provincia
                // puntual). Si lo único que se usó fueron otros filtros (precio,
                // ambientes, destacadas, etc.), acá nunca se llama a requestFlyTo y el
                // mapa se queda exactamente donde estaba.
                const target = resolveFlyTarget(filters.location, province, dbCoords);
                if (target) requestFlyTo(target);
                setPanelOpen(false);
              }}
            >
              Ver resultados
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}