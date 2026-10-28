import { MapPin, Navigation } from 'lucide-react';
import { OFICINA, estadoOficina, linkComoLlegar } from '../../lib/oficina';

/** La foto conserva su proporción completa dentro del alto disponible del mapa. */
export function FranjaLateral() {
  const estado = estadoOficina();

  return (
    <aside
      className="relative isolate hidden min-h-0 w-[var(--franja-lateral)] shrink-0 flex-col overflow-hidden rounded-xl2 border border-white/10 bg-latorre-dark text-white shadow-card lg:flex"
      aria-label="Latorre Propiedades"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-20 -z-10 h-64 w-64 rounded-full border border-latorre-gold/15" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 -right-12 -z-10 h-48 w-48 rounded-full border border-latorre-gold/10" />

      <div className="relative min-h-0 flex-1 px-3 pt-3">
        <div
          className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(228, 200, 107, 0.18) 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
        >
          <img
            src="/familia-latorre.webp"
            alt="Una familia recibiendo las llaves de su casa nueva"
            width={941}
            height={1672}
            className="h-full w-full object-contain"
          />
          <span aria-hidden="true" className="pointer-events-none absolute left-2 top-2 h-5 w-5 rounded-tl-lg border-l border-t border-latorre-gold/65" />
          <span aria-hidden="true" className="pointer-events-none absolute bottom-2 right-2 h-5 w-5 rounded-br-lg border-b border-r border-latorre-gold/65" />
        </div>
      </div>

      <div className="relative shrink-0 space-y-3 px-4 py-4">
        <div>
          <div aria-hidden="true" className="mb-2 flex items-center gap-2">
            <span className="h-px w-7 bg-latorre-gold" />
            <span className="h-1 w-1 rounded-full bg-latorre-gold/80" />
          </div>
          <h2 className="font-display text-base font-semibold leading-tight 2xl:text-lg">{OFICINA.nombre}</h2>
        </div>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-white/80">
          <MapPin size={14} className="mt-0.5 shrink-0 text-latorre-gold" aria-hidden="true" />
          <span>{OFICINA.direccion}<br /><span className="text-white/60">{OFICINA.localidad}</span></span>
        </p>

        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-4">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${estado.abierto ? 'bg-emerald-400' : 'bg-white/40'}`} aria-hidden="true" />
          <span className={estado.abierto ? 'font-medium text-emerald-300' : 'font-medium text-white/65'}>{estado.abierto ? 'Abierto ahora' : 'Cerrado'}</span>
          <span className="text-white/50">· {estado.detalle}</span>
        </p>

        <a
          href={linkComoLlegar()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-full border border-latorre-gold/40 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:border-latorre-gold hover:bg-white/10 active:scale-[0.98]"
        >
          <Navigation size={13} aria-hidden="true" /> Cómo llegar
        </a>
      </div>
    </aside>
  );
}
