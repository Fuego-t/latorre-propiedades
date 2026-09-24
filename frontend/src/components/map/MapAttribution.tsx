import { useEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';

/**
 * Atribución del mapa, colapsada detrás de un botón (i).
 *
 * La barra que Leaflet dibuja por defecto ("Leaflet | © OpenStreetMap
 * contributors" con la bandera) ensucia la esquina del mapa, así que se apaga y
 * se reemplaza por esto.
 *
 * El crédito a OpenStreetMap NO se puede sacar: la licencia ODbL lo exige y es
 * la razón por la que los mapas son gratis. Lo que sí permiten sus pautas de
 * atribución es colapsarlo, "siempre que el usuario pueda encontrar la
 * información de licencia si la busca, por ejemplo desde un botón (i) en la
 * esquina del mapa". Por eso el texto se muestra completo y legible al abrirlo,
 * y no en letra chica ni con poco contraste.
 *
 * Lo de Leaflet, en cambio, es una cortesía y no una obligación: va en el panel
 * pero no en la esquina.
 */
export function MapAttribution() {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    function alTocarAfuera(e: MouseEvent) {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    }
    function alPresionarEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false);
    }

    document.addEventListener('mousedown', alTocarAfuera);
    document.addEventListener('keydown', alPresionarEscape);
    return () => {
      document.removeEventListener('mousedown', alTocarAfuera);
      document.removeEventListener('keydown', alPresionarEscape);
    };
  }, [abierto]);

  return (
    <div ref={contenedor} className="pointer-events-auto relative">
      {abierto && (
        <div className="absolute bottom-10 right-0 w-64 rounded-xl2 border border-latorre-dark/10 bg-white p-3 shadow-card-hover">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-latorre-ink/50">Sobre el mapa</p>
            <button
              onClick={() => setAbierto(false)}
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
            <a
              href="https://leafletjs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Leaflet
            </a>
          </p>
        </div>
      )}

      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label="Información y créditos del mapa"
        aria-expanded={abierto}
        title="Créditos del mapa"
        className={`flex h-8 w-8 items-center justify-center rounded-full border border-latorre-dark/10 shadow-card transition ${
          abierto ? 'bg-latorre-dark text-white' : 'bg-white/90 text-latorre-ink/55 hover:bg-white hover:text-latorre-dark'
        }`}
      >
        <Info size={15} />
      </button>
    </div>
  );
}
