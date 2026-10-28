import { useEffect, useState, type FormEvent } from 'react';
import { Building2, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../../lib/api';
import { OPERATION_LABELS, PROPERTY_TYPE_LABELS } from '../../lib/format';
import { resolveFlyTarget } from '../../data/argentinaCoordenadas';
import { useFilterStore } from '../../store/useFilterStore';
import type { Location, OperationType, PropertyType } from '../../types';

const fieldClass = 'min-h-11 w-full min-w-0 rounded-xl border border-latorre-dark/15 bg-white px-3 text-sm text-latorre-ink outline-none transition focus:border-latorre-gold';
const fallbackLocations: Location[] = [
  { id: 'brandsen', name: 'Coronel Brandsen', latitude: -35.168, longitude: -58.235 },
  { id: 'jeppener', name: 'Jeppener', latitude: -35.279, longitude: -58.199 },
  { id: 'gomez', name: 'Gómez', latitude: -35.077, longitude: -58.299 },
];

interface SearchToolbarProps {
  searchTerm: string;
  onSearch: (value: string) => void;
  compact?: boolean;
}

export function SearchToolbar({ searchTerm, onSearch, compact = false }: SearchToolbarProps) {
  const { filters, setFilters, setPanelOpen, activeCount, requestFlyTo } = useFilterStore();
  const [operation, setOperation] = useState(filters.operationType ?? '');
  const [location, setLocation] = useState(filters.location ?? '');
  const [propertyType, setPropertyType] = useState(filters.propertyType ?? '');
  const [query, setQuery] = useState(searchTerm);
  const [locations, setLocations] = useState<Location[]>(fallbackLocations);

  useEffect(() => {
    let cancelled = false;
    api.locations.list().then((res) => {
      if (!cancelled && res.locations?.length) setLocations(res.locations);
    }).catch(() => { /* Las localidades habituales siguen disponibles sin conexión. */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setOperation(filters.operationType ?? '');
    setLocation(filters.location ?? '');
    setPropertyType(filters.propertyType ?? '');
  }, [filters.operationType, filters.location, filters.propertyType]);

  useEffect(() => setQuery(searchTerm), [searchTerm]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!compact) {
      setFilters({
        ...filters,
        operationType: (operation || undefined) as OperationType | undefined,
        location: location || undefined,
        propertyType: (propertyType || undefined) as PropertyType | undefined,
      });
    }
    onSearch(query.trim());
    const coords = Object.fromEntries(locations.map((item) => [item.name, { lat: item.latitude, lng: item.longitude }]));
    const target = resolveFlyTarget(compact ? filters.location : location || undefined, '', coords);
    if (target) requestFlyTo(target);
  }

  const names = [...new Set([...locations.map((item) => item.name), ...(filters.location ? [filters.location] : [])])]
    .sort((a, b) => a.localeCompare(b, 'es'));

  if (compact) {
    return (
      <form role="search" aria-label="Buscar propiedades" onSubmit={handleSubmit} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5 rounded-xl border border-latorre-dark/10 bg-white/95 p-1.5 shadow-sm sm:gap-2">
        <label htmlFor="map-search-query" className="sr-only">Palabra clave</label>
        <input
          id="map-search-query"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Localidad, barrio o código"
          className={`${fieldClass} !border-transparent !bg-latorre-cream/60 !px-2.5 sm:!px-3`}
        />
        <button type="submit" aria-label="Buscar" className="btn-primary min-h-11 min-w-11 !rounded-lg !px-3 sm:!px-4">
          <Search size={17} aria-hidden="true" />
          <span className="hidden sm:inline">Buscar</span>
        </button>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label="Más filtros"
          aria-haspopup="dialog"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-latorre-dark/15 px-2.5 text-sm font-semibold text-latorre-dark transition hover:border-latorre-gold hover:bg-latorre-cream sm:gap-2 sm:px-3"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span className="sm:hidden">Filtros</span>
          <span className="hidden sm:inline">Más filtros</span>
          {activeCount() > 0 && <span className="rounded-full bg-latorre-dark px-1.5 py-0.5 text-[10px] text-white">{activeCount()}</span>}
        </button>
      </form>
    );
  }

  return (
    <form role="search" aria-label="Buscar propiedades" onSubmit={handleSubmit} className="rounded-2xl border border-latorre-dark/10 bg-white p-3 shadow-card sm:p-4">
      <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[1fr_1.2fr_1fr_auto]">
        <div className="min-w-0">
          <label htmlFor="search-operation" className="mb-1.5 block text-xs font-semibold text-latorre-dark">¿Qué querés hacer?</label>
          <select id="search-operation" aria-label="Operación" className={fieldClass} value={operation} onChange={(event) => setOperation(event.target.value as OperationType | '')}>
            <option value="">Comprar o alquilar</option>
            {Object.entries(OPERATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor="search-location" className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-latorre-dark"><MapPin size={12} aria-hidden="true" /> Localidad</label>
          <select id="search-location" className={fieldClass} value={location} onChange={(event) => setLocation(event.target.value)}>
            <option value="">Todas las localidades</option>
            {names.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor="search-type" className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-latorre-dark"><Building2 size={12} aria-hidden="true" /> Tipo de propiedad</label>
          <select id="search-type" className={fieldClass} value={propertyType} onChange={(event) => setPropertyType(event.target.value as PropertyType | '')}>
            <option value="">Todos los tipos</option>
            {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary min-h-11 !rounded-xl lg:px-7"><Search size={17} aria-hidden="true" /> Buscar</button>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-latorre-dark/10 pt-3">
        <div className="min-w-0 basis-28 flex-1 sm:basis-44">
          <label htmlFor="search-query" className="sr-only">Palabra clave</label>
          <div className="relative">
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-latorre-ink/45" />
            <input id="search-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título, barrio o código de publicación" className={`${fieldClass} !bg-latorre-cream/50 !pl-9`} />
          </div>
        </div>
        <button type="button" onClick={() => setPanelOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-latorre-dark/20 px-4 text-sm font-semibold text-latorre-dark transition hover:border-latorre-gold hover:bg-latorre-cream" aria-haspopup="dialog">
          <SlidersHorizontal size={16} aria-hidden="true" /> Más filtros
          {activeCount() > 0 && <span className="rounded-full bg-latorre-dark px-1.5 py-0.5 text-[10px] text-white">{activeCount()}</span>}
        </button>
        <p className="hidden text-xs text-latorre-ink/55 xl:block xl:pb-3">Precio, moneda, ambientes y superficie</p>
      </div>
    </form>
  );
}
