import { useCallback, useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { IntroSplash } from '../components/layout/IntroSplash';
import { MapView } from '../components/map/MapView';
import { FilterPanel } from '../components/filters/FilterPanel';
import { PropertyPreviewCard } from '../components/property/PropertyPreviewCard';
import { OficinaCard } from '../components/map/OficinaCard';
import { ServidorDespertando } from '../components/map/ServidorDespertando';
import { FranjaVideo } from '../components/map/FranjaVideo';
import { useFilterStore } from '../store/useFilterStore';
import { useProperties } from '../hooks/useProperties';
import type { Property } from '../types';

export function MapPage() {
  const filters = useFilterStore((s) => s.filters);
  const { properties, loading, error, demorado } = useProperties(filters);
  const [selected, setSelected] = useState<Property | null>(null);
  const [oficinaAbierta, setOficinaAbierta] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Una tarjeta por vez: abrir una cierra la otra.
  const abrirPropiedad = useCallback((property: Property) => {
    setOficinaAbierta(false);
    setSelected(property);
  }, []);

  const abrirOficina = useCallback(() => {
    setSelected(null);
    setOficinaAbierta(true);
  }, []);

  useEffect(() => {
    const introTimeout = window.setTimeout(() => setShowIntro(false), 1850);
    return () => window.clearTimeout(introTimeout);
  }, []);

  // El aviso de "conectando" recién sale si la espera se estira, y de eso se
  // encarga `demorado` dentro de useProperties: ahí es donde se sabe cuánto
  // viene tardando el pedido de verdad.

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-latorre-cream">
      <Header />

      <main className="app-shell relative flex flex-1 gap-4 overflow-hidden px-0 sm:px-4 sm:pb-4 lg:px-6">
        {/* Hermana del mapa y no encima: el mapa se angosta y sus controles
            siguen quedando adentro. */}
        <FranjaVideo />

        <div className="relative h-full min-w-0 flex-1 overflow-hidden sm:rounded-xl2 sm:shadow-card">
          <MapView
            properties={properties}
            selectedPropertyId={selected?.id ?? null}
            onSelectProperty={abrirPropiedad}
            onSelectOficina={abrirOficina}
            oficinaSeleccionada={oficinaAbierta}
            loading={loading}
          />

          <div className="pointer-events-none absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
            <span className="pointer-events-auto rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-latorre-ink/70 shadow-card">
              {loading
                ? 'Buscando…'
                : `${properties.length} ${properties.length === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}`}
            </span>
          </div>

          {demorado && !error && <ServidorDespertando />}

          {error && (
            <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center px-4">
              <span className="pointer-events-auto rounded-full bg-red-50 px-4 py-2 text-xs font-medium text-red-700 shadow-card">
                No pudimos conectar con el servidor. {error}
              </span>
            </div>
          )}
        </div>
      </main>

      <FilterPanel resultCount={properties.length} />

      {selected && <PropertyPreviewCard property={selected} onClose={() => setSelected(null)} />}
      {oficinaAbierta && <OficinaCard onClose={() => setOficinaAbierta(false)} />}
      {showIntro && <IntroSplash />}
    </div>
  );
}
