import { Clock, MapPin, Navigation, X } from 'lucide-react';
import { HORARIOS_TEXTO, OFICINA, estadoOficina, linkComoLlegar } from '../../lib/oficina';
import { WHATSAPP_NUMBERS, buildGeneralWhatsAppLink } from '../../lib/whatsapp';

interface OficinaCardProps {
  onClose: () => void;
}

/**
 * Lo que se abre al tocar el pin rojo del local. Es la contraparte de
 * PropertyPreviewCard —misma posición y mismo marco— pero en vez de precio y
 * metros muestra la foto del frente, los horarios y cómo llegar.
 */
export function OficinaCard({ onClose }: OficinaCardProps) {
  const estado = estadoOficina();
  const hoy = new Date().getDay();
  const filaDeHoy = hoy === 0 ? 2 : hoy === 6 ? 1 : 0;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1000] pb-safe-bottom sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[380px] lg:left-8 2xl:left-[calc(var(--franja-foto)+4.5rem)]"
      role="dialog"
      aria-label="Nuestra oficina"
    >
      <div className="mx-auto max-h-[78vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-card-hover sm:max-h-[calc(100vh-8rem)] sm:rounded-xl2">
        <div className="relative">
          <img
            src={OFICINA.foto}
            alt={`Frente de ${OFICINA.nombre} en ${OFICINA.direccion}`}
            className="h-44 w-full object-cover"
            width={1000}
            height={544}
          />

          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/70"
          >
            <X size={16} />
          </button>

          <span
            className="absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white"
            style={{ backgroundColor: OFICINA.color }}
          >
            {OFICINA.bajada}
          </span>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <h3 className="font-display text-base font-semibold leading-snug text-latorre-dark">{OFICINA.nombre}</h3>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-latorre-ink/70">
              <MapPin size={14} className="mt-0.5 shrink-0 text-latorre-ink/40" />
              <span>
                {OFICINA.direccion} <span className="text-latorre-ink/50">({OFICINA.entreCalles})</span>
                <br />
                {OFICINA.localidad}
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-latorre-dark/10 bg-latorre-cream/60 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Clock size={14} className="text-latorre-ink/45" />
              <span className="text-xs font-semibold uppercase tracking-wide text-latorre-ink/50">Horarios</span>
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  estado.abierto ? 'bg-emerald-100 text-emerald-800' : 'bg-latorre-dark/10 text-latorre-ink/70'
                }`}
              >
                {estado.abierto ? 'Abierto ahora' : 'Cerrado'} · {estado.detalle}
              </span>
            </div>

            <dl className="space-y-1">
              {HORARIOS_TEXTO.map((fila, i) => (
                <div
                  key={fila.dias}
                  className={`flex justify-between gap-3 text-xs ${
                    i === filaDeHoy ? 'font-semibold text-latorre-dark' : 'text-latorre-ink/70'
                  }`}
                >
                  <dt>{fila.dias}</dt>
                  <dd className="text-right">{fila.horas}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <a href={linkComoLlegar()} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
              <Navigation size={15} />
              Cómo llegar
            </a>
            <div className="grid grid-cols-2 gap-2">
              {WHATSAPP_NUMBERS.map((numero) => (
                <a
                  key={numero.id}
                  href={buildGeneralWhatsAppLink(numero.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp w-full !px-3 text-xs"
                >
                  {numero.display}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
