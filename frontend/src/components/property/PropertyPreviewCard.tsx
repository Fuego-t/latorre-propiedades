import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bath, BedDouble, Maximize, Ruler, X } from 'lucide-react';
import type { Property } from '../../types';
import { formatArea, formatPrice, PROPERTY_TYPE_LABELS } from '../../lib/format';
import { OperationBadge } from '../ui/Badge';
import { WhatsAppButtons } from './WhatsAppButtons';
import { Gallery } from './Gallery';
import { ImageCarousel } from './ImageCarousel';
import { ANCHO, urlFoto } from '../../lib/imagenes';

interface PropertyPreviewCardProps {
  property: Property;
  onClose: () => void;
}

export function PropertyPreviewCard({ property, onClose }: PropertyPreviewCardProps) {
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  // La foto marcada como principal va primera; el resto respeta el orden cargado.
  const images = useMemo(
    () => property.images.slice().sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.order - b.order),
    [property.images]
  );
  const thumbnails = images.slice(0, 5);

  // Al pasar de una propiedad a otra sin cerrar la tarjeta, arrancamos de la primera foto.
  useEffect(() => setIndex(0), [property.id]);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1000] pb-safe-bottom sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[380px] lg:left-8 lg:w-[430px] xl:w-[470px] 2xl:w-[520px]"
      role="dialog"
      aria-label={`Vista previa de ${property.title}`}
    >
      <div className="mx-auto max-h-[78vh] w-full max-w-lg overflow-y-auto sm:max-w-none rounded-t-2xl bg-white shadow-card-hover sm:max-h-[calc(100vh-8rem)] sm:rounded-xl2">
        <div className="relative">
          {images.length > 0 ? (
            <ImageCarousel
              images={images}
              activeIndex={index}
              onIndexChange={setIndex}
              onOpen={(i) => setGalleryIndex(i)}
              alt={property.title}
              className="h-48 w-full sm:h-44 lg:h-52 xl:h-56 2xl:h-64"
            />
          ) : (
            <div className="flex h-48 w-full items-center justify-center bg-latorre-dark/5 text-latorre-ink/30 sm:h-44 lg:h-52 xl:h-56 2xl:h-64">
              Sin fotos disponibles
            </div>
          )}

          {/* Cerrar queda arriba de todo: es la salida de la tarjeta, no una acción del carrusel. */}
          <button
            onClick={onClose}
            aria-label="Cerrar vista previa"
            className="absolute right-1 top-1 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/70"
          >
            <X size={16} />
          </button>

          <div className="pointer-events-none absolute left-2 top-2 z-10">
            <OperationBadge operationType={property.operationType} />
          </div>
        </div>

        {thumbnails.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto px-3 pt-2.5 scrollbar-none">
            {thumbnails.map((img, i) => (
              <button
                key={img.publicId ?? `${img.url}-${i}`}
                onClick={() => setIndex(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === index}
                className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 transition lg:h-14 lg:w-14 ${
                  i === index ? 'border-latorre-gold' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={urlFoto(img.url, ANCHO.miniatura)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
            {images.length > thumbnails.length && (
              <button
                onClick={() => setGalleryIndex(index)}
                className="h-12 shrink-0 rounded-md bg-latorre-dark/5 px-2.5 text-xs font-medium text-latorre-ink/70 transition hover:bg-latorre-dark/10"
              >
                +{images.length - thumbnails.length}
              </button>
            )}
          </div>
        )}

        <div className="space-y-3 p-4">
          <div>
            <h3 className="font-display text-base font-semibold leading-snug text-latorre-dark">{property.title}</h3>
            <p className="mt-0.5 text-lg font-bold text-latorre-ink">
              {formatPrice(property.price, property.currency)}
              {property.operationType !== 'SALE' && property.price != null && (
                <span className="text-xs font-normal text-latorre-ink/50">/mes</span>
              )}
            </p>
          </div>

          <p className="text-sm text-latorre-ink/60">
            {property.neighborhood ? `${property.neighborhood}, ` : ''}
            {property.location} · {PROPERTY_TYPE_LABELS[property.propertyType]}
          </p>

          <div className="flex flex-wrap gap-3 text-xs text-latorre-ink/70">
            {property.totalArea && (
              <span className="inline-flex items-center gap-1">
                <Maximize size={13} /> {formatArea(property.totalArea)}
              </span>
            )}
            {property.rooms != null && (
              <span className="inline-flex items-center gap-1">
                <Ruler size={13} /> {property.rooms} amb.
              </span>
            )}
            {property.bedrooms != null && (
              <span className="inline-flex items-center gap-1">
                <BedDouble size={13} /> {property.bedrooms}
              </span>
            )}
            {property.bathrooms != null && (
              <span className="inline-flex items-center gap-1">
                <Bath size={13} /> {property.bathrooms}
              </span>
            )}
          </div>

          <p className="line-clamp-2 text-sm text-latorre-ink/70">{property.description}</p>

          <p className="text-xs font-medium text-latorre-ink/40">Código: {property.code}</p>

          <div className="flex flex-col gap-2 pt-1">
            <Link to={`/propiedad/${property.id}`} className="btn-primary w-full">
              Ver propiedad
            </Link>
            <WhatsAppButtons property={property} compact />
          </div>
        </div>
      </div>

      {galleryIndex !== null && (
        <Gallery
          images={images}
          initialIndex={galleryIndex}
          onClose={(lastIndex) => {
            // Al volver de la pantalla completa, la tarjeta queda en la misma foto.
            setIndex(lastIndex);
            setGalleryIndex(null);
          }}
        />
      )}
    </div>
  );
}