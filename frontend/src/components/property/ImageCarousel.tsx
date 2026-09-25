import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import type { PropertyImage } from '../../types';
import { ANCHO, encuadre, urlFoto } from '../../lib/imagenes';

interface ImageCarouselProps {
  images: PropertyImage[];
  /** Se llama con el índice de la foto visible al tocar la imagen (para abrir la galería). */
  onOpen?: (index: number) => void;
  /** Avisa qué foto quedó visible, para mantener sincronizadas las miniaturas de afuera. */
  onIndexChange?: (index: number) => void;
  /** Índice a mostrar desde afuera (al tocar una miniatura). */
  activeIndex?: number;
  className?: string;
  alt?: string;
}

/**
 * Carrusel deslizable. Usa scroll-snap nativo, así que en el celular se desliza con el
 * dedo con la inercia del sistema (y con trackpad en la compu), sin librerías ni handlers
 * de touch propios. Las flechas y los puntos son la versión "clickeable" de lo mismo.
 */
export function ImageCarousel({
  images,
  onOpen,
  onIndexChange,
  activeIndex,
  className = '',
  alt = 'Foto de la propiedad',
}: ImageCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const scrollTo = useCallback((target: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: track.clientWidth * target, behavior: 'smooth' });
  }, []);

  const go = useCallback(
    (delta: number) => {
      // Circular: desde la primera, "anterior" lleva a la última.
      scrollTo((index + delta + images.length) % images.length);
    },
    [index, images.length, scrollTo]
  );

  // El índice se deduce del scroll, no al revés: así queda igual de exacto cuando
  // se llega deslizando con el dedo que cuando se toca una flecha.
  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const current = Math.min(Math.max(Math.round(track.scrollLeft / track.clientWidth), 0), images.length - 1);
    setIndex((prev) => {
      if (prev === current) return prev;
      onIndexChange?.(current);
      return current;
    });
  }

  // Al cambiar de propiedad (otro pin del mapa) volvemos a la primera foto.
  // La dependencia es la lista de URLs y no el array: el padre puede recrear el array
  // en cada render, y con `[images]` el carrusel se volvía solo a la foto 1 mientras
  // el usuario deslizaba.
  const signature = images.map((img) => img.url).join('|');
  useEffect(() => {
    setIndex(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [signature]);

  // Cuando el índice lo maneja el padre (miniaturas), seguimos lo que pida.
  useEffect(() => {
    if (activeIndex === undefined || activeIndex === index) return;
    scrollTo(activeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  if (images.length === 0) return null;

  const multiple = images.length > 1;

  return (
    <div
      className={`group/carousel relative ${className}`}
      role="group"
      aria-roledescription="carrusel"
      aria-label={`${images.length} fotos de la propiedad`}
      onKeyDown={(e) => {
        if (!multiple) return;
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          go(1);
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          go(-1);
        }
        if ((e.key === 'Enter' || e.key === ' ') && e.target === trackRef.current) {
          e.preventDefault();
          onOpen?.(index);
        }
      }}
    >
      <div
        ref={trackRef}
        onScroll={handleScroll}
        tabIndex={multiple ? 0 : -1}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth outline-none scrollbar-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-latorre-gold"
      >
        {images.map((img, i) => (
          <button
            key={img.publicId ?? `${img.url}-${i}`}
            type="button"
            tabIndex={-1}
            onClick={() => onOpen?.(i)}
            aria-label={`Ampliar foto ${i + 1} de ${images.length}`}
            className="block h-full w-full shrink-0 grow-0 basis-full snap-center snap-always"
          >
            <img
              src={urlFoto(img.url, ANCHO.tarjeta)}
              alt={`${alt} ${i + 1}`}
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
              className="h-full w-full object-cover"
              style={{ objectPosition: encuadre(img) }}
            />
          </button>
        ))}
      </div>

      {multiple && (
        <>
          {/* Flechas: siempre visibles en pantallas chicas (donde el pulgar es el mouse),
              y sobre la imagen en desktop. El área táctil es de 44px aunque el círculo sea menor. */}
          <CarouselArrow side="left" onClick={() => go(-1)} />
          <CarouselArrow side="right" onClick={() => go(1)} />

          <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
            {index + 1}/{images.length}
          </span>

          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {images.map((img, i) => (
              <span
                key={`dot-${img.publicId ?? i}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/55'
                }`}
              />
            ))}
          </div>

          {onOpen && (
            <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/55 p-1.5 text-white opacity-0 transition group-hover/carousel:opacity-100">
              <Expand size={13} />
            </span>
          )}
        </>
      )}
    </div>
  );
}

function CarouselArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const isLeft = side === 'left';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isLeft ? 'Foto anterior' : 'Foto siguiente'}
      className={`absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-white transition sm:opacity-0 sm:group-hover/carousel:opacity-100 sm:focus-visible:opacity-100 ${
        isLeft ? 'left-0' : 'right-0'
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm transition hover:bg-black/70">
        {isLeft ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </span>
    </button>
  );
}
