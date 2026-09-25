import { Loader2 } from 'lucide-react';

/**
 * Aviso para la espera larga de la primera visita del día.
 *
 * El backend corre en el plan gratuito de Render, que apaga el servicio cuando
 * pasa un rato sin visitas y tarda cerca de un minuto en volver a encenderse.
 * Sin este cartel, quien entra primero ve un mapa vacío y piensa que no hay
 * propiedades o que el sitio está roto.
 *
 * No aparece siempre: sólo si la espera se estira. Cuando el servidor está
 * despierto —que es casi siempre— las propiedades llegan en menos de un segundo
 * y esto no se muestra nunca.
 */
export function ServidorDespertando() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-[600] flex justify-center px-4 sm:top-6">
      <div className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl2 border border-latorre-gold/30 bg-white px-4 py-3 shadow-card-hover">
        <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-latorre-gold" />
        <div>
          <p className="text-sm font-semibold text-latorre-dark">Conectando con el servidor…</p>
          <p className="mt-0.5 text-xs leading-snug text-latorre-ink/65">
            Puede demorar unos 15 segundos. Las propiedades van a aparecer solas, no hace falta recargar.
          </p>
        </div>
      </div>
    </div>
  );
}
