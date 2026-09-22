import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { PropertyImage } from '../../types';

interface GalleryProps {
  images: PropertyImage[];
  initialIndex?: number;
  /** Recibe la foto en la que quedó el usuario, para no perder el lugar al cerrar. */
  onClose: (lastIndex: number) => void;
}

// Deslizamiento mínimo (en px) para que cuente como cambio de foto y no como un toque.
const SWIPE_THRESHOLD = 50;

export function Gallery({ images, initialIndex = 0, onClose }: GalleryProps) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const indexRef = useRef(index);
  indexRef.current = index;

  const goNext = () => setIndex((i) => (i + 1) % images.length);
  const goPrev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const close = () => onClose(indexRef.current);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  if (images.length === 0) return null;
  const current = images[index];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 pt-safe-top"
      role="dialog"
      aria-modal="true"
      aria-label="Galería de imágenes"
      onClick={close}
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
          {index + 1} de {images.length}
        </span>
        <button
          onClick={close}
          aria-label="Cerrar galería"
          className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <X size={22} />
        </button>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center px-2 pb-safe-bottom"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || images.length < 2) return;
          const delta = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(delta) < SWIPE_THRESHOLD) return;
          // Deslizar hacia la derecha muestra la foto anterior.
          if (delta > 0) goPrev();
          else goNext();
        }}
      >
        {images.length > 1 && (
          <button
            onClick={goPrev}
            aria-label="Imagen anterior"
            className="absolute left-2 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:left-4 sm:p-3"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <img
          src={current.url}
          alt={`Foto ${index + 1} de ${images.length}`}
          draggable={false}
          className="max-h-[80vh] max-w-full select-none rounded-lg object-contain shadow-2xl"
        />

        {images.length > 1 && (
          <button
            onClick={goNext}
            aria-label="Imagen siguiente"
            className="absolute right-2 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:right-4 sm:p-3"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {images.map((img, i) => (
            <button
              key={img.publicId ?? `${img.url}-${i}`}
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
              }}
              aria-label={`Ir a la imagen ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-latorre-gold' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
