import { Link } from 'react-router-dom';
import { ANCHO, encuadre, urlFoto } from '../../lib/imagenes';
import { ArrowUpRight, Bath, BedDouble, House, MapPin, Maximize, Star } from 'lucide-react';
import type { Property } from '../../types';
import { formatArea, formatPrice, PROPERTY_TYPE_LABELS } from '../../lib/format';
import { OperationBadge } from '../ui/Badge';

export function PropertyCard({ property }: { property: Property }) {
  const mainImage = property.images.find((img) => img.isMain) ?? property.images[0];
  const location = [property.neighborhood, property.location].filter(Boolean).join(', ');

  return (
    <Link
      to={`/propiedad/${property.id}`}
      className="card-surface group flex h-full min-w-0 flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:border-latorre-gold/35 hover:shadow-card-hover motion-reduce:transform-none"
    >
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-latorre-dark/5 sm:aspect-[4/3]">
        {mainImage ? (
          <img
            src={urlFoto(mainImage.url, ANCHO.tarjeta)}
            alt={property.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:transform-none"
            style={{ objectPosition: encuadre(mainImage) }}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-latorre-dark/45">
            <House size={34} strokeWidth={1.25} aria-hidden="true" />
            <span className="text-sm">Fotos próximamente</span>
          </div>
        )}
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <OperationBadge operationType={property.operationType} />
          {property.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-latorre-dark shadow-sm">
              <Star size={12} className="fill-latorre-gold text-latorre-gold" aria-hidden="true" />
              Destacada
            </span>
          )}
        </div>
        {property.status === 'RESERVED' && (
          <span className="absolute bottom-3 left-3 rounded-full bg-latorre-dark px-3 py-1 text-xs font-semibold text-white shadow-sm">
            Reservada
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-baseline gap-x-1.5">
          <p className="text-xl font-semibold tracking-tight text-latorre-dark">
            {formatPrice(property.price, property.currency)}
          </p>
          {property.operationType !== 'SALE' && property.price != null && (
            <span className="text-xs text-latorre-ink/55">/ mes</span>
          )}
        </div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-latorre-ink/50">
          {PROPERTY_TYPE_LABELS[property.propertyType]}
        </p>
        <h3 className="line-clamp-2 min-h-[3rem] font-display text-base font-semibold leading-6 text-latorre-dark">
          {property.title}
        </h3>
        <p className="mt-2 flex min-w-0 items-start gap-1.5 text-xs leading-5 text-latorre-ink/65">
          <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-2">{location}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-latorre-ink/70">
          {property.totalArea != null && property.totalArea > 0 && (
            <span className="inline-flex items-center gap-1">
              <Maximize size={14} aria-hidden="true" /> {formatArea(property.totalArea)}
            </span>
          )}
          {property.bedrooms != null && property.bedrooms > 0 && (
            <span className="inline-flex items-center gap-1">
              <BedDouble size={14} aria-hidden="true" /> {property.bedrooms} dorm.
            </span>
          )}
          {property.bathrooms != null && property.bathrooms > 0 && (
            <span className="inline-flex items-center gap-1">
              <Bath size={14} aria-hidden="true" /> {property.bathrooms} {property.bathrooms === 1 ? 'baño' : 'baños'}
            </span>
          )}
        </div>
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-2 border-t border-latorre-dark/10 pt-3">
            <span className="truncate text-[11px] text-latorre-ink/50">Cód. {property.code}</span>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-latorre-dark">
              Ver propiedad <ArrowUpRight size={14} aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
