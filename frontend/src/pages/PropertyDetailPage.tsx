import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bath,
  BedDouble,
  Building2,
  CalendarClock,
  ChevronLeft,
  Images,
  MapPin,
  Maximize,
  Share2,
  SquareStack,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Gallery } from '../components/property/Gallery';
import { ANCHO, urlFoto } from '../lib/imagenes';
import { WhatsAppButtons } from '../components/property/WhatsAppButtons';
import { ScheduleVisitModal } from '../components/property/ScheduleVisitModal';
import { PropertyCard } from '../components/property/PropertyCard';
import { PropertyLocationMap } from '../components/map/PropertyLocationMap';
import { OperationBadge } from '../components/ui/Badge';
import { api } from '../lib/api';
import { formatArea, formatPrice, PROPERTY_TYPE_LABELS } from '../lib/format';
import { useToastStore } from '../store/useToastStore';
import type { Property } from '../types';

const AMENITIES: Array<{ key: keyof Property; label: string }> = [
  { key: 'garage', label: 'Cochera' },
  { key: 'yard', label: 'Patio' },
  { key: 'pool', label: 'Pileta' },
  { key: 'grill', label: 'Parrilla' },
  { key: 'quincho', label: 'Quincho' },
  { key: 'gallery', label: 'Galería' },
  { key: 'terrace', label: 'Terraza' },
];

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);

  const [property, setProperty] = useState<Property | null>(null);
  const [related, setRelated] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);

    api.properties
      .get(id)
      .then((res) => {
        setProperty(res.property);
        setRelated(res.related);
        api.properties.registerView(id).catch(() => null);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: property?.title, url });
        return;
      } catch {
        /* el usuario canceló el share nativo */
      }
    }
    await navigator.clipboard.writeText(url);
    pushToast('Enlace copiado al portapapeles', 'success');
  }

  if (loading) {
    return (
      <div className="flex h-screen flex-col bg-latorre-cream">
        <Header />
        <div className="flex flex-1 items-center justify-center text-latorre-ink/50">Cargando propiedad…</div>
      </div>
    );
  }

  if (notFound || !property) {
    return (
      <div className="flex h-screen flex-col bg-latorre-cream">
        <Header />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="font-display text-xl font-semibold text-latorre-dark">No encontramos esta propiedad</p>
          <p className="text-sm text-latorre-ink/60">Puede que ya no esté disponible o el enlace sea incorrecto.</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Volver al mapa
          </button>
        </div>
      </div>
    );
  }

  const images = property.images;
  const mainImage = images.find((img) => img.isMain) ?? images[0];
  const gridImages = images.slice(1, 5);
  const amenities = AMENITIES.filter((a) => property[a.key]);

  return (
    <div className="min-h-screen bg-latorre-cream">
      <Header />

      <main className="app-shell px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-latorre-ink/60 hover:text-latorre-dark">
          <ChevronLeft size={16} /> Volver al mapa
        </Link>

        {/* Galería principal */}
        {images.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 overflow-hidden rounded-xl2 sm:grid-cols-4 sm:grid-rows-2 sm:gap-2" style={{ maxHeight: '480px' }}>
            <button
              className="relative col-span-1 row-span-2 overflow-hidden bg-latorre-dark/5 sm:col-span-2"
              onClick={() => setGalleryIndex(0)}
            >
              {/* Muchas fotos traídas del sitio viejo son chicas o verticales. Se
                  muestran enteras (object-contain), sin estirar ni recortar, y el
                  hueco que sobra lo llena una copia difuminada de la misma foto. */}
              <img
                src={urlFoto(mainImage.url, ANCHO.miniatura)}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
              />
              <img
                src={urlFoto(mainImage.url, ANCHO.principal)}
                alt={property.title}
                className="relative h-64 w-full object-contain sm:h-full"
              />
            </button>
            {gridImages.map((img, i) => (
              <button
                key={img.url + i}
                className="relative hidden overflow-hidden bg-latorre-dark/5 sm:block"
                onClick={() => setGalleryIndex(i + 1)}
              >
                <img
                  src={urlFoto(img.url, ANCHO.miniatura)}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover blur-lg"
                />
                <img src={urlFoto(img.url, ANCHO.grilla)} alt="" className="relative h-full w-full object-contain" />
                {i === gridImages.length - 1 && images.length > 5 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
                    +{images.length - 5} fotos
                  </span>
                )}
              </button>
            ))}
            {images.length > 1 && (
              <button
                onClick={() => setGalleryIndex(0)}
                className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-latorre-dark shadow-card sm:hidden"
              >
                <Images size={14} /> Ver {images.length} fotos
              </button>
            )}
          </div>
        ) : (
          <div className="flex h-56 items-center justify-center rounded-xl2 bg-latorre-dark/5 text-latorre-ink/30">
            Sin fotos disponibles
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="space-y-6 lg:col-span-2">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <OperationBadge operationType={property.operationType} />
                {property.featured && <span className="chip !border-latorre-gold !text-latorre-gold">Destacada</span>}
                <span className="chip">Código {property.code}</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-latorre-dark sm:text-3xl">{property.title}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-latorre-ink/60">
                <MapPin size={15} />
                {property.neighborhood ? `${property.neighborhood}, ` : ''}
                {property.location}
              </p>
            </div>

            <div className="flex items-center justify-between border-y border-latorre-dark/8 py-4">
              <div>
                <p className="text-2xl font-bold text-latorre-dark sm:text-3xl">
                  {formatPrice(property.price, property.currency)}
                  {property.operationType !== 'SALE' && property.price != null && (
                    <span className="text-sm font-normal text-latorre-ink/50"> /mes</span>
                  )}
                </p>
                {property.expenses ? (
                  <p className="text-sm text-latorre-ink/50">+ {formatPrice(property.expenses, property.currency)} expensas</p>
                ) : null}
              </div>
              <button onClick={handleShare} className="btn-secondary">
                <Share2 size={16} /> Compartir
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={Building2} label={PROPERTY_TYPE_LABELS[property.propertyType]} />
              {property.totalArea && <Stat icon={Maximize} label={`${formatArea(property.totalArea)} tot.`} />}
              {property.coveredArea && <Stat icon={SquareStack} label={`${formatArea(property.coveredArea)} cub.`} />}
              {property.bedrooms != null && <Stat icon={BedDouble} label={`${property.bedrooms} dorm.`} />}
              {property.bathrooms != null && <Stat icon={Bath} label={`${property.bathrooms} baños`} />}
            </div>

            <section>
              <h2 className="mb-2 font-display text-lg font-semibold text-latorre-dark">Descripción</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-latorre-ink/75">{property.description}</p>
            </section>

            {amenities.length > 0 && (
              <section>
                <h2 className="mb-2 font-display text-lg font-semibold text-latorre-dark">Servicios y comodidades</h2>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((a) => (
                    <span key={a.key as string} className="chip">
                      {a.label}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-2 font-display text-lg font-semibold text-latorre-dark">Ver ubicación</h2>
              <div className="overflow-hidden rounded-xl2 border border-latorre-dark/8">
                <PropertyLocationMap
                  latitude={property.publicLatitude}
                  longitude={property.publicLongitude}
                  operationType={property.operationType}
                />
              </div>
              {!property.showExactLocation && (
                <p className="mt-2 text-xs text-latorre-ink/45">
                  La ubicación en el mapa es aproximada, para resguardar la privacidad de la propiedad.
                </p>
              )}
            </section>
          </div>

          {/* Panel de contacto */}
          <aside className="lg:col-span-1">
            <div className="card-surface sticky top-4 space-y-4 p-5">
              <p className="font-display text-base font-semibold text-latorre-dark">¿Te interesa esta propiedad?</p>
              <div className="space-y-2 text-sm">
                <ContactAction label="Consultar disponibilidad" />
                <ContactAction label="Coordinar una visita" />
                <ContactAction label="Quiero más información" />
              </div>
              <WhatsAppButtons property={property} className="flex-col" />
              <button type="button" onClick={() => setShowSchedule(true)} className="btn-secondary w-full">
                <CalendarClock size={16} /> Agendar cita
              </button>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 font-display text-xl font-semibold text-latorre-dark">Propiedades relacionadas</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          </section>
        )}
      </main>

      {galleryIndex !== null && <Gallery images={images} initialIndex={galleryIndex} onClose={() => setGalleryIndex(null)} />}
      {showSchedule && <ScheduleVisitModal property={property} onClose={() => setShowSchedule(false)} />}
    </div>
  );
}

function Stat({ icon: Icon, label }: { icon: typeof Building2; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm text-latorre-ink/80 shadow-sm">
      <Icon size={16} className="shrink-0 text-latorre-gold" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function ContactAction({ label }: { label: string }) {
  return <p className="rounded-lg bg-latorre-cream px-3 py-2 text-latorre-ink/70">{label}</p>;
}
