import { MapPin, Navigation } from 'lucide-react';
import { OFICINA, estadoOficina, linkComoLlegar } from '../../lib/oficina';

/**
 * Franja vertical al costado del mapa, sólo en pantallas anchas (desde 1536px).
 * En un notebook chico el mapa necesita todo el ancho, y en el celular una
 * franja vertical directamente no entra.
 *
 * El problema de diseño es el hueco: mide 340px de ancho por casi toda la
 * altura de la pantalla, o sea algo así como 1 a 4. Ninguna foto tiene esa
 * forma, así que meter una imagen a pantalla completa ahí obliga a recortarle
 * la mitad del ancho y a dejar afuera medio contenido. Por eso la franja es una
 * composición y no una sola imagen:
 *
 * - Arriba la foto, con su proporción original (941x1672). En monitores altos
 *   entra entera, sin recortar a nadie. En pantallas más bajas el tope del 55%
 *   la achica, y ahí sí recorta, pero de arriba y abajo —cielo y vereda— que es
 *   lo que sobra; las caras quedan siempre dentro gracias al punto focal.
 * - Abajo el bloque de marca, que absorbe el alto que queda libre. En un
 *   ultrawide eso son unos 700px: en vez de dejarlos vacíos, llevan el nombre,
 *   la dirección y el estado del local, repartidos con justify-between para que
 *   el espacio sobrante quede entre los dos bloques y no al final.
 */
export function FranjaLateral() {
  const estado = estadoOficina();

  return (
    <aside
      className="hidden w-[var(--franja-lateral)] shrink-0 flex-col overflow-hidden rounded-xl2 bg-latorre-dark text-white shadow-card 2xl:flex"
      aria-label="Latorre Propiedades"
    >
      <div className="relative w-full shrink-0 aspect-[941/1672] max-h-[55%]">
        <img
          src="/familia-latorre.webp"
          alt="Una familia recibiendo las llaves de su casa nueva"
          width={941}
          height={1672}
          /* El punto focal al 38% de la altura deja el intercambio de llaves y
             las caras en el centro del recorte cuando la pantalla es baja. */
          className="h-full w-full object-cover object-[50%_38%]"
        />
        {/* Difumina el corte entre la foto y el bloque de marca. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-latorre-dark" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-6 px-5 pb-6 pt-2">
        <div>
          <h2 className="font-display text-xl font-semibold leading-tight">{OFICINA.nombre}</h2>
          <div className="mt-3 h-px w-10 bg-latorre-gold" />
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Casas, departamentos, locales y campos en Coronel Brandsen y alrededores.
          </p>
        </div>

        <div className="space-y-3">
          <p className="flex items-start gap-2 text-sm text-white/80">
            <MapPin size={15} className="mt-0.5 shrink-0 text-latorre-gold" />
            <span>
              {OFICINA.direccion}
              <br />
              <span className="text-white/55">{OFICINA.localidad}</span>
            </span>
          </p>

          <p className="flex items-center gap-2 text-xs font-medium">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${estado.abierto ? 'bg-emerald-400' : 'bg-white/35'}`}
              aria-hidden="true"
            />
            <span className={estado.abierto ? 'text-emerald-300' : 'text-white/55'}>
              {estado.abierto ? 'Abierto ahora' : 'Cerrado'}
            </span>
            <span className="text-white/40">· {estado.detalle}</span>
          </p>

          <a
            href={linkComoLlegar()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-latorre-gold hover:bg-white/5 active:scale-[0.98]"
          >
            <Navigation size={14} />
            Cómo llegar
          </a>
        </div>
      </div>
    </aside>
  );
}
