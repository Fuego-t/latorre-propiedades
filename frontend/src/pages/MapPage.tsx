import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, LayoutGrid, Loader2, Map as MapIcon, RefreshCw, SearchX } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { MapView } from '../components/map/MapView';
import { FilterPanel } from '../components/filters/FilterPanel';
import { SearchToolbar } from '../components/filters/SearchToolbar';
import { ActiveFilters } from '../components/filters/ActiveFilters';
import { PropertyCard } from '../components/property/PropertyCard';
import { PropertyPreviewCard } from '../components/property/PropertyPreviewCard';
import { PropertyCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { OficinaCard } from '../components/map/OficinaCard';
import { FranjaLateral } from '../components/map/FranjaLateral';
import { useFilterStore } from '../store/useFilterStore';
import { useProperties } from '../hooks/useProperties';
import type { Property } from '../types';

type ViewMode = 'list' | 'map';
type SortOrder = 'recommended' | 'newest' | 'price-asc' | 'price-desc';

function initialView(): ViewMode {
  try { return localStorage.getItem('latorre-property-view') === 'map' ? 'map' : 'list'; }
  catch { return 'list'; }
}

function initialSearch(): string {
  try { return sessionStorage.getItem('latorre-property-search') ?? ''; }
  catch { return ''; }
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

export function MapPage() {
  const filters = useFilterStore((s) => s.filters);
  const clearFilters = useFilterStore((s) => s.clearFilters);
  const setPanelOpen = useFilterStore((s) => s.setPanelOpen);
  const { properties, loading, error, demorado, retry } = useProperties(filters);
  const [view, setView] = useState<ViewMode>(initialView);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [sort, setSort] = useState<SortOrder>('recommended');
  const [selected, setSelected] = useState<Property | null>(null);
  const [oficinaAbierta, setOficinaAbierta] = useState(false);
  const hasFilters = Object.values(filters).some((value) => value !== undefined && value !== '' && value !== false) || !!searchTerm;

  useEffect(() => {
    try { localStorage.setItem('latorre-property-view', view); } catch { /* La elección también funciona sin almacenamiento. */ }
    setSelected(null);
    setOficinaAbierta(false);
  }, [view]);

  useEffect(() => {
    try { sessionStorage.setItem('latorre-property-search', searchTerm); } catch { /* Búsqueda disponible igualmente. */ }
  }, [searchTerm]);

  useEffect(() => {
    if (!filters.currency && (sort === 'price-asc' || sort === 'price-desc')) setSort('recommended');
  }, [filters.currency, sort]);

  const visibleProperties = useMemo(() => {
    const words = normalize(searchTerm).split(/\s+/).filter(Boolean);
    const result = properties.filter((property) => {
      const text = normalize([property.title, property.code, property.location, property.neighborhood].filter(Boolean).join(' '));
      return words.every((word) => text.includes(word));
    });
    return result.sort((a, b) => {
      if (sort === 'price-asc' || sort === 'price-desc') {
        if (a.price == null) return b.price == null ? 0 : 1;
        if (b.price == null) return -1;
        return sort === 'price-asc' ? Number(a.price) - Number(b.price) : Number(b.price) - Number(a.price);
      }
      if (sort === 'recommended' && a.featured !== b.featured) return a.featured ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [properties, searchTerm, sort]);

  useEffect(() => {
    if (loading || error || (selected && !visibleProperties.some((property) => property.id === selected.id))) setSelected(null);
  }, [loading, error, visibleProperties, selected]);

  const abrirPropiedad = useCallback((property: Property) => {
    setOficinaAbierta(false);
    setSelected(property);
  }, []);
  const abrirOficina = useCallback(() => {
    setSelected(null);
    setOficinaAbierta(true);
  }, []);

  function clearSearch() { clearFilters(); setSearchTerm(''); }

  const status = loading
    ? 'Buscando propiedades…'
    : error
      ? 'No se pudieron cargar las publicaciones'
      : `${visibleProperties.length} ${visibleProperties.length === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}`;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-latorre-cream">
      <Header />
      <main className="app-shell flex flex-1 flex-col px-4 pb-6 sm:px-6 lg:px-8">
        <section className="pb-5 pt-4 sm:pt-7" aria-labelledby="search-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5 sm:gap-4">
            <div>
              <p className="mb-1.5 hidden text-xs font-bold uppercase tracking-[0.18em] text-latorre-dark/65 sm:block">Latorre Propiedades · Brandsen y alrededores</p>
              <h1 id="search-heading" className="font-display text-2xl font-semibold leading-tight text-latorre-dark sm:text-3xl lg:text-4xl">Encontrá tu próxima propiedad</h1>
              <p className="mt-2 hidden text-sm text-latorre-ink/65 sm:block">Explorá las publicaciones o buscá por ubicación en el mapa.</p>
            </div>
            <div className="w-full shrink-0 sm:w-auto">
              <p className="sr-only text-xs font-medium text-latorre-ink/60 sm:not-sr-only sm:mb-1.5">Elegí cómo explorar</p>
              <div role="group" aria-label="Vista de propiedades" className="inline-flex w-full gap-1 rounded-xl border border-latorre-dark/15 bg-white p-1 sm:w-auto">
                {([['list', LayoutGrid, 'Publicaciones'], ['map', MapIcon, 'Mapa']] as const).map(([mode, Icon, label]) => (
                  <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition sm:flex-none ${view === mode ? 'bg-latorre-dark text-white shadow-sm' : 'text-latorre-dark hover:bg-latorre-cream'}`}>
                    <Icon size={17} aria-hidden="true" /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <SearchToolbar searchTerm={searchTerm} onSearch={setSearchTerm} />
          <ActiveFilters searchTerm={searchTerm} onClearSearch={() => setSearchTerm('')} />
        </section>

        <section aria-labelledby="results-heading" aria-busy={loading} className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="results-heading" className="font-display text-xl font-semibold text-latorre-dark sm:text-2xl">{hasFilters ? 'Resultados de tu búsqueda' : 'Propiedades recomendadas'}</h2>
              <p role="status" aria-live="polite" className="mt-1 text-xs text-latorre-ink/60">{status}</p>
            </div>
            {view === 'list' && (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="property-order" className="text-xs text-latorre-ink/65">Ordenar por</label>
                <select id="property-order" aria-label="Ordenar publicaciones" value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} className="min-h-10 max-w-full rounded-lg border border-latorre-dark/15 bg-white px-3 text-sm text-latorre-dark">
                  <option value="recommended">Recomendadas</option>
                  <option value="newest">Más recientes</option>
                  {filters.currency && <option value="price-asc">Menor precio ({filters.currency})</option>}
                  {filters.currency && <option value="price-desc">Mayor precio ({filters.currency})</option>}
                </select>
              </div>
            )}
          </div>

          {demorado && !error && (
            <div role="status" className="mb-4 flex items-center gap-3 rounded-xl border border-latorre-gold/30 bg-white p-4 text-sm text-latorre-dark">
              <Loader2 size={19} className="shrink-0 animate-spin" aria-hidden="true" />
              <p>Estamos cargando las publicaciones. Puede tardar unos segundos; van a aparecer automáticamente.</p>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-white p-5">
              <p className="font-semibold text-latorre-dark">No pudimos cargar las propiedades</p>
              <p className="mt-1 text-sm text-latorre-ink/65">Revisá tu conexión y volvé a intentar.</p>
              <button type="button" onClick={retry} className="btn-secondary mt-4"><RefreshCw size={16} aria-hidden="true" /> Reintentar</button>
            </div>
          )}

          {!loading && !error && visibleProperties.length === 0 && (
            <div className="mb-4">
              <EmptyState icon={SearchX} title={hasFilters ? 'No encontramos propiedades con esta búsqueda' : 'Todavía no hay publicaciones disponibles'} description={hasFilters ? 'Probá otra localidad, ampliá el precio o quitá alguno de los filtros.' : 'Volvé a visitarnos pronto para conocer las nuevas propiedades.'} action={hasFilters ? <button type="button" onClick={clearSearch} className="btn-primary">Limpiar búsqueda</button> : undefined} />
            </div>
          )}

          {view === 'list' ? (
            <>
              {!hasFilters && sort === 'recommended' && !loading && !error && visibleProperties.length > 0 && <p className="mb-4 hidden text-xs text-latorre-ink/60 sm:block">Destacadas primero, seguidas de las publicaciones más recientes.</p>}
              <div className="grid grid-cols-1 gap-5 min-[540px]:grid-cols-2 lg:grid-cols-3 min-[1700px]:grid-cols-4 min-[2300px]:grid-cols-5">
                {loading ? Array.from({ length: 6 }, (_, index) => <PropertyCardSkeleton key={index} />) : !error && visibleProperties.map((property) => <PropertyCard key={property.id} property={property} />)}
              </div>
              {!loading && !error && visibleProperties.length > 0 && (
                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-latorre-dark/10 bg-white px-4 py-4 sm:px-5">
                  <p className="text-sm text-latorre-ink/70">¿Preferís elegir por zona?</p>
                  <button type="button" onClick={() => setView('map')} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-latorre-dark">Ver estas propiedades en el mapa <ArrowRight size={16} aria-hidden="true" /></button>
                </div>
              )}
              {!filters.currency && <button type="button" onClick={() => setPanelOpen(true)} className="mt-4 min-h-10 text-xs text-latorre-ink/60 underline underline-offset-4">Elegí una moneda en Más filtros para ordenar por precio.</button>}
            </>
          ) : (
            <div className="relative flex h-[65dvh] min-h-[360px] gap-4 lg:h-[calc(100dvh-22rem)] lg:min-h-[420px]">
              <FranjaLateral />
              <div className="relative h-full min-w-0 flex-1 overflow-hidden rounded-xl2 border border-latorre-dark/10 shadow-card">
                <MapView properties={loading || error ? [] : visibleProperties} selectedPropertyId={selected?.id ?? null} onSelectProperty={abrirPropiedad} onSelectOficina={abrirOficina} oficinaSeleccionada={oficinaAbierta} loading={loading} />
              </div>
            </div>
          )}
        </section>
      </main>

      <FilterPanel resultCount={error ? 0 : visibleProperties.length} loading={loading} error={!!error} />
      {view === 'map' && selected && <PropertyPreviewCard property={selected} onClose={() => setSelected(null)} />}
      {view === 'map' && oficinaAbierta && <OficinaCard onClose={() => setOficinaAbierta(false)} />}
    </div>
  );
}
