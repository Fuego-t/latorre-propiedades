import { X } from 'lucide-react';
import { formatPrice, OPERATION_LABELS, PROPERTY_TYPE_LABELS } from '../../lib/format';
import { useFilterStore } from '../../store/useFilterStore';
import type { PropertyFilters } from '../../types';

export function ActiveFilters({ searchTerm, onClearSearch }: { searchTerm: string; onClearSearch: () => void }) {
  const { filters, setFilter, clearFilters } = useFilterStore();
  const chips: Array<{ key: keyof PropertyFilters; label: string }> = [];
  if (filters.operationType) chips.push({ key: 'operationType', label: OPERATION_LABELS[filters.operationType] });
  if (filters.location) chips.push({ key: 'location', label: filters.location });
  if (filters.propertyType) chips.push({ key: 'propertyType', label: PROPERTY_TYPE_LABELS[filters.propertyType] });
  if (filters.currency) chips.push({ key: 'currency', label: filters.currency === 'USD' ? 'Dólares (USD)' : 'Pesos (ARS)' });
  for (const [key, prefix] of [['minPrice', 'Desde'], ['maxPrice', 'Hasta']] as const) {
    const value = filters[key];
    if (value != null) chips.push({ key, label: `${prefix} ${filters.currency ? formatPrice(value, filters.currency) : new Intl.NumberFormat('es-AR').format(value)}` });
  }
  for (const [key, label] of [['rooms', 'ambientes'], ['bedrooms', 'dormitorios'], ['bathrooms', 'baños']] as const) {
    if (filters[key] != null) chips.push({ key, label: `${filters[key]}+ ${label}` });
  }
  if (filters.minArea != null) chips.push({ key: 'minArea', label: `Desde ${filters.minArea} m²` });
  if (filters.maxArea != null) chips.push({ key: 'maxArea', label: `Hasta ${filters.maxArea} m²` });
  if (filters.featured) chips.push({ key: 'featured', label: 'Sólo destacadas' });
  if (!chips.length && !searchTerm) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Filtros activos">
      <span className="mr-1 text-xs font-medium text-latorre-ink/60">Tu búsqueda:</span>
      {searchTerm && (
        <button type="button" className="chip min-h-9 max-w-full !border-latorre-dark/15" aria-label={`Quitar búsqueda: ${searchTerm}`} onClick={onClearSearch}>
          <span className="truncate">“{searchTerm}”</span> <X size={13} aria-hidden="true" className="shrink-0" />
        </button>
      )}
      {chips.map(({ key, label }) => (
        <button key={key} type="button" className="chip min-h-9 !border-latorre-dark/15" aria-label={`Quitar filtro: ${label}`} onClick={() => setFilter(key, undefined)}>
          {label} <X size={13} aria-hidden="true" className="shrink-0" />
        </button>
      ))}
      <button type="button" className="min-h-9 px-2 text-xs font-semibold text-latorre-dark underline underline-offset-4" onClick={() => { clearFilters(); onClearSearch(); }}>Limpiar búsqueda</button>
    </div>
  );
}
