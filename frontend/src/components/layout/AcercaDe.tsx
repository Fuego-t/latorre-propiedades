import { useEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';

/**
 * Botón "Acerca de" del encabezado: guarda los créditos del mapa.
 *
 * Vive acá y no sobre el mapa para que la esquina quede limpia. El crédito a
 * OpenStreetMap no se puede omitir —su licencia ODbL lo exige, y es la razón por
 * la que los mapas salen gratis—, pero sus pautas de atribución aceptan que esté
 * colapsado "siempre que el usuario pueda encontrar la información de licencia
 * si la busca, por ejemplo desde un botón (i) en la esquina del mapa o una
 * opción 'Acerca de' en un menú". Esto último es exactamente este botón.
 *
 * Lo que las pautas sí prohíben es que el texto quede tapado o ilegible, así que
 * al abrirlo se muestra completo y con contraste normal.
 */
export function AcercaDe() {
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
    <div ref={contenedor} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label="Acerca de este sitio y créditos del mapa"
        aria-expanded={abierto}
        title="Acerca de"
        className={`inline-flex items-center justify-center rounded-full p-2 transition ${
          abierto ? 'bg-latorre-dark/5 text-latorre-dark' : 'text-latorre-ink/30 hover:bg-latorre-dark/5 hover:text-latorre-dark'
        }`}
      >
        {/* El ícono es chico a propósito, pero el relleno se mantiene: así se ve
            discreto sin que el área para tocarlo con el dedo quede minúscula. */}
        <Info size={14} />
      </button>

      {abierto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl2 border border-latorre-dark/10 bg-white p-3.5 shadow-card-hover">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-latorre-ink/50">Acerca de</p>
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

          <p className="mt-2 text-xs text-latorre-ink/50">
            Visor:{' '}
            <a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              Leaflet
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
