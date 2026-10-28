import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useFilterStore } from '../../store/useFilterStore';
import { api } from '../../lib/api';
import type { OperationType, PropertyFilters, PropertyType } from '../../types';
import { OPERATION_LABELS, PROPERTY_TYPE_LABELS } from '../../lib/format';
import { resolveFlyTarget } from '../../data/argentinaCoordenadas';

const OPERATIONS: OperationType[] = ['SALE', 'RESIDENTIAL_RENT', 'COMMERCIAL_RENT'];
const PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[];
const FALLBACK_LOCATIONS = ['Coronel Brandsen', 'Jeppener', 'Gómez'];
const fieldClass = 'min-h-11 w-full rounded-xl border border-latorre-dark/15 bg-white px-3 py-2.5 text-sm text-latorre-ink outline-none transition focus:border-latorre-gold focus:ring-2 focus:ring-latorre-gold/15';

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-latorre-ink/70">{children}</label>;
}

interface FilterPanelProps {
  resultCount: number;
  loading?: boolean;
  error?: boolean;
}

export function FilterPanel(props: FilterPanelProps) {
  const isPanelOpen = useFilterStore((state) => state.isPanelOpen);
  return isPanelOpen ? <FilterDialog {...props} /> : null;
}

function FilterDialog({ resultCount, loading = false, error = false }: FilterPanelProps) {
  const { filters, setFilters, setPanelOpen, requestFlyTo } = useFilterStore();
  const [draft, setDraft] = useState<PropertyFilters>({ ...filters });
  const [locations, setLocations] = useState<string[]>(FALLBACK_LOCATIONS);
  const [dbCoords, setDbCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.locations.list().then(({ locations: available }) => {
      if (cancelled || !available?.length) return;
      setLocations(available.map((location) => location.name));
      setDbCoords(Object.fromEntries(available.map((location) => [location.name, { lat: location.latitude, lng: location.longitude }])));
    }).catch(() => { /* Mantiene localidades habituales si la API no responde. */ });
    return () => { cancelled = true; };
  }, []);

  const setDraftFilter = <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const numericValue = (value: string) => value === '' ? undefined : Number(value);
  const priceError = draft.minPrice != null && draft.maxPrice != null && draft.minPrice > draft.maxPrice;
  const areaError = draft.minArea != null && draft.maxArea != null && draft.minArea > draft.maxArea;
  const needsCurrency = (draft.minPrice != null || draft.maxPrice != null) && !draft.currency;
  const hasDraftFilters = Object.values(draft).some((value) => value !== undefined && value !== '' && value !== false);
  const locationOptions = [...new Set([...locations, ...(draft.location ? [draft.location] : [])])].sort((a, b) => a.localeCompare(b, 'es'));

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (priceError || areaError || needsCurrency) return;
    setFilters(draft);
    const target = resolveFlyTarget(draft.location, '', dbCoords);
    if (target) requestFlyTo(target);
    setPanelOpen(false);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="property-filters-title"
      aria-describedby="property-filters-description"
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none rounded-t-3xl border-0 bg-white p-0 text-latorre-ink shadow-card-hover backdrop:bg-latorre-dark/35 sm:inset-y-0 sm:left-auto sm:right-0 sm:h-[100dvh] sm:max-h-none sm:w-[440px] sm:rounded-none"
      onCancel={(event) => { event.preventDefault(); setPanelOpen(false); }}
      onClick={(event) => { if (event.target === event.currentTarget) setPanelOpen(false); }}
    >
      <form onSubmit={apply} className="flex max-h-[92dvh] flex-col sm:h-full sm:max-h-none">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-latorre-dark/10 px-5 py-5 sm:px-6">
          <div>
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-latorre/80"><SlidersHorizontal size={14} /> Tu búsqueda</p>
            <h2 id="property-filters-title" className="font-display text-2xl font-semibold text-latorre-dark">Encontrá tu propiedad</h2>
            <p id="property-filters-description" className="mt-1.5 text-xs leading-relaxed text-latorre-ink/60">Elegí lo que necesitás y aplicá los filtros para ver las publicaciones.</p>
          </div>
          <button type="button" autoFocus onClick={() => setPanelOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-latorre-ink/60 transition hover:bg-latorre-cream" aria-label="Cerrar filtros sin aplicar cambios"><X size={20} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          <fieldset className="space-y-4">
            <legend className="mb-3 text-sm font-semibold text-latorre-dark">¿Qué estás buscando?</legend>
            <div>
              <FieldLabel htmlFor="filter-operation">Operación</FieldLabel>
              <select id="filter-operation" className={fieldClass} value={draft.operationType ?? ''} onChange={(event) => setDraftFilter('operationType', (event.target.value || undefined) as OperationType | undefined)}>
                <option value="">Todas las operaciones</option>
                {OPERATIONS.map((operation) => <option key={operation} value={operation}>{OPERATION_LABELS[operation]}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
              <div>
                <FieldLabel htmlFor="filter-property-type">Tipo de propiedad</FieldLabel>
                <select id="filter-property-type" className={fieldClass} value={draft.propertyType ?? ''} onChange={(event) => setDraftFilter('propertyType', (event.target.value || undefined) as PropertyType | undefined)}>
                  <option value="">Todos los tipos</option>
                  {PROPERTY_TYPES.map((type) => <option key={type} value={type}>{PROPERTY_TYPE_LABELS[type]}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel htmlFor="filter-location">Localidad</FieldLabel>
                <select id="filter-location" className={fieldClass} value={draft.location ?? ''} onChange={(event) => setDraftFilter('location', event.target.value || undefined)}>
                  <option value="">Todas las localidades</option>
                  {locationOptions.map((location) => <option key={location} value={location}>{location}</option>)}
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 border-t border-latorre-dark/10 pt-5">
            <legend className="float-left mb-3 w-full text-sm font-semibold text-latorre-dark">Tu presupuesto</legend>
            <div className="clear-both">
              <FieldLabel htmlFor="filter-currency">Moneda</FieldLabel>
              <select id="filter-currency" className={fieldClass} value={draft.currency ?? ''} aria-invalid={needsCurrency} aria-describedby={needsCurrency ? 'filter-currency-error' : undefined} onChange={(event) => setDraftFilter('currency', (event.target.value || undefined) as PropertyFilters['currency'])}>
                <option value="">Todas las monedas</option>
                <option value="USD">Dólares (USD)</option>
                <option value="ARS">Pesos (ARS)</option>
              </select>
              {needsCurrency && <p id="filter-currency-error" role="alert" className="mt-1.5 text-xs text-red-700">Elegí una moneda para comparar los precios.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="filter-min-price">Precio desde</FieldLabel>
                <input id="filter-min-price" type="number" inputMode="decimal" min={0} step="any" placeholder="Sin mínimo" className={fieldClass} value={draft.minPrice ?? ''} aria-invalid={priceError} aria-describedby={priceError ? 'filter-price-error' : undefined} onChange={(event) => setDraftFilter('minPrice', numericValue(event.target.value))} />
              </div>
              <div>
                <FieldLabel htmlFor="filter-max-price">Precio hasta</FieldLabel>
                <input id="filter-max-price" type="number" inputMode="decimal" min={0} step="any" placeholder="Sin máximo" className={fieldClass} value={draft.maxPrice ?? ''} aria-invalid={priceError} aria-describedby={priceError ? 'filter-price-error' : undefined} onChange={(event) => setDraftFilter('maxPrice', numericValue(event.target.value))} />
              </div>
            </div>
            {priceError && <p id="filter-price-error" role="alert" className="text-xs text-red-700">El precio máximo debe ser igual o mayor al mínimo.</p>}
            {draft.operationType && draft.operationType !== 'SALE' && <p className="text-xs text-latorre-ink/55">Para alquileres, indicá el precio mensual.</p>}
          </fieldset>

          <fieldset className="border-t border-latorre-dark/10 pt-5">
            <legend className="float-left mb-1 w-full text-sm font-semibold text-latorre-dark">Espacios y superficie</legend>
            <p className="clear-both mb-3 text-xs text-latorre-ink/55">Las cantidades indican el mínimo que necesitás.</p>
            <div className="grid grid-cols-3 gap-2">
              {([['rooms', 'Ambientes'], ['bedrooms', 'Dormitorios'], ['bathrooms', 'Baños']] as const).map(([key, label]) => (
                <div key={key}>
                  <FieldLabel htmlFor={`filter-${key}`}>{label}</FieldLabel>
                  <select id={`filter-${key}`} className={`${fieldClass} !px-2`} value={draft[key] ?? ''} onChange={(event) => setDraftFilter(key, numericValue(event.target.value))}>
                    <option value="">Todos</option>
                    {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count} o más</option>)}
                    {draft[key] != null && draft[key]! > 6 && <option value={draft[key]}>{draft[key]} o más</option>}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="filter-min-area">Superficie desde (m²)</FieldLabel>
                <input id="filter-min-area" type="number" inputMode="decimal" min={0} step="any" placeholder="Sin mínimo" className={fieldClass} value={draft.minArea ?? ''} aria-invalid={areaError} aria-describedby={areaError ? 'filter-area-error' : undefined} onChange={(event) => setDraftFilter('minArea', numericValue(event.target.value))} />
              </div>
              <div>
                <FieldLabel htmlFor="filter-max-area">Superficie hasta (m²)</FieldLabel>
                <input id="filter-max-area" type="number" inputMode="decimal" min={0} step="any" placeholder="Sin máximo" className={fieldClass} value={draft.maxArea ?? ''} aria-invalid={areaError} aria-describedby={areaError ? 'filter-area-error' : undefined} onChange={(event) => setDraftFilter('maxArea', numericValue(event.target.value))} />
              </div>
            </div>
            {areaError && <p id="filter-area-error" role="alert" className="mt-2 text-xs text-red-700">La superficie máxima debe ser igual o mayor a la mínima.</p>}
            <p className="mt-2 text-xs text-latorre-ink/55">Se toma la superficie total de la propiedad.</p>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-latorre-cream p-4 text-sm text-latorre-dark">
            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-latorre-dark" checked={draft.featured ?? false} onChange={(event) => setDraftFilter('featured', event.target.checked || undefined)} />
            <span><span className="block font-medium">Solo propiedades destacadas</span><span className="mt-0.5 block text-xs text-latorre-ink/60">Publicaciones seleccionadas por Latorre.</span></span>
          </label>
        </div>

        <div className="shrink-0 space-y-3 border-t border-latorre-dark/10 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
          <p className="text-center text-xs text-latorre-ink/60">Los cambios se aplican al confirmar.</p>
          <div className="flex items-center gap-3">
            <button type="button" className="btn-secondary flex-1 !px-3 disabled:cursor-default disabled:opacity-40" disabled={!hasDraftFilters} onClick={() => setDraft({})}><RotateCcw size={15} /> Limpiar</button>
            <button type="submit" className="btn-primary flex-[1.5] !px-3 disabled:cursor-not-allowed disabled:opacity-50" disabled={priceError || areaError || needsCurrency}>Aplicar filtros</button>
          </div>
          <p className="text-center text-[11px] text-latorre-ink/50">{loading ? 'Actualizando la búsqueda actual…' : error ? 'No se pudo cargar la búsqueda actual.' : `Búsqueda actual: ${resultCount} ${resultCount === 1 ? 'propiedad' : 'propiedades'}`}</p>
        </div>
      </form>
    </dialog>
  );
}
