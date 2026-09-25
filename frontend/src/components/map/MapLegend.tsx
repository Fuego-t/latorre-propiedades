import { useEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import { OPERATION_COLORS, OPERATION_LABELS } from '../../lib/format';
import { OFICINA } from '../../lib/oficina';
import type { OperationType } from '../../types';

const ITEMS: OperationType[] = ['SALE', 'COMMERCIAL_RENT', 'RESIDENTIAL_RENT'];

export function MapLegend() {
  const [creditos, setCreditos] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!creditos) return;
    function alTocarAfuera(e: MouseEvent) {
      if (!contenedor.current?.contains(e.target as Node)) setCreditos(false);
    }
    function alPresionarEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setCreditos(false);
    }
    document.addEventListener('mousedown', alTocarAfuera);
    document.addEventListener('keydown', alPresionarEscape);
    return () => {
      document.removeEventListener('mousedown', alTocarAfuera);
      document.removeEventListener('keydown', alPresionarEscape);
    };
  }, [creditos]);

  return (
    <div ref={contenedor} className="pointer-events-auto relative">
      {/* Los créditos del mapa viven acá, junto a la leyenda, porque son
          información del mapa. En el encabezado quedaban compitiendo con los
          botones que la gente sí usa.

          El crédito a OpenStreetMap no se puede omitir —lo exige su licencia
          ODbL, que es la razón por la que los mapas salen gratis—, pero sus
          pautas aceptan que esté colapsado mientras el usuario pueda encontrarlo
          si lo busca, "por ejemplo desde un botón (i) en la esquina del mapa".
          Esto es exactamente eso. */}
      {creditos && (
        <div className="absolute bottom-full left-0 mb-2 w-60 rounded-xl2 border border-latorre-dark/10 bg-white p-3 shadow-card-hover">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-latorre-ink/50">Sobre el mapa</p>
            <button
              onClick={() => setCreditos(false)}
              aria-label="Cerrar"
              className="-mr-1 -mt-1 rounded p-1 text-latorre-ink/40 transition hover:text-latorre-ink"
            >
              <X size={13} />
            </button>
          </div>
          <p className="text-sm leading-snug text-latorre-ink">
            Datos del mapa ©{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-latorre-dark underline underline-offset-2"
            >
              OpenStreetMap
            </a>{' '}
            y sus colaboradores.
          </p>
          <p className="mt-1.5 text-xs text-latorre-ink/50">
            Visor:{' '}
            <a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              Leaflet
            </a>
          </p>
        </div>
      )}

      <div className="card-surface flex flex-col gap-1.5 px-3.5 py-3 text-xs">
        {ITEMS.map((op) => (
          <div key={op} className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-black/10"
              style={{ backgroundColor: OPERATION_COLORS[op] }}
            />
            <span className="text-latorre-ink/75">{OPERATION_LABELS[op]}</span>
          </div>
        ))}

        <div className="mt-0.5 flex items-center gap-2 border-t border-latorre-dark/10 pt-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full border border-black/10"
            style={{ backgroundColor: OFICINA.color }}
          />
          <span className="font-medium text-latorre-ink/75">{OFICINA.bajada}</span>

          <button
            onClick={() => setCreditos((v) => !v)}
            aria-label="Créditos del mapa"
            aria-expanded={creditos}
            title="Sobre el mapa"
            className={`ml-auto -mr-1 rounded-full p-1 transition ${
              creditos ? 'text-latorre-dark' : 'text-latorre-ink/30 hover:text-latorre-dark'
            }`}
          >
            <Info size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
