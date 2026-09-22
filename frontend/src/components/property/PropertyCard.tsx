import { Link } from 'react-router-dom';
import { Bath, BedDouble, Maximize } from 'lucide-react';
import type { Property } from '../../types';
import { formatArea, formatPrice, PROPERTY_TYPE_LABELS } from '../../lib/format';
import { OperationBadge } from '../ui/Badge';

export function PropertyCard({ property }: { property: Property }) {
  const mainImage = property.images.find((img) => img.isMain) ?? property.images[0];

  return (
    <Link
      to={`/propiedad/${property.id}`}
      className="card-surface group flex flex-col overflow-hidden transition hover:shadow-card-hover"
    >
      <div className="relative h-44 overflow-hidden">
        {mainImage ? (
          <img
            src={mainImage.url}
            alt={property.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-latorre-dark/5 text-latorre-ink/30">Sin fotos</div>
        )}
        <div className="absolute left-2.5 top-2.5">
          <OperationBadge operationType={property.operationType} short />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <p className="line-clamp-1 font-display text-sm font-semibold text-latorre-dark">{property.title}</p>
        <p className="text-base font-bold text-latorre-ink">{formatPrice(property.price, property.currency)}</p>
        <p className="text-xs text-latorre-ink/55">
          {property.location} · {PROPERTY_TYPE_LABELS[property.propertyType]}
        </p>
        <div className="mt-auto flex gap-3 pt-1 text-xs text-latorre-ink/60">
          {property.totalArea && (
            <span className="inline-flex items-center gap-1">
              <Maximize size={12} /> {formatArea(property.totalArea)}
            </span>
          )}
          {property.bedrooms != null && (
            <span className="inline-flex items-center gap-1">
              <BedDouble size={12} /> {property.bedrooms}
            </span>
          )}
          {property.bathrooms != null && (
            <span className="inline-flex items-center gap-1">
              <Bath size={12} /> {property.bathrooms}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
