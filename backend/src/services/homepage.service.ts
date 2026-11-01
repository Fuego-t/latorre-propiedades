import { Prisma, Property } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/errorHandler';
import { HeroSlideSelection, homepageInputSchema, storedHomepageSelectionSchema } from '../validators/homepage.schema';

export type { HeroSlideSelection } from '../validators/homepage.schema';

const imageSchema = z.object({
  url: z.string().min(1),
  publicId: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  order: z.number().default(0),
  isMain: z.boolean().default(false),
  focusX: z.number().optional(),
  focusY: z.number().optional(),
  fit: z.enum(['cover', 'contain']).optional(),
  zoom: z.number().optional(),
}).passthrough();

export interface HeroPresentation {
  focusX: number;
  focusY: number;
  zoom: number;
  fit: 'cover' | 'contain';
}

export interface HeroSlide {
  propertyId: string;
  propertyCode: string;
  location: string;
  image: z.infer<typeof imageSchema>;
  presentation: HeroPresentation;
}

type HomepageProperty = Pick<Property, 'id' | 'code' | 'location' | 'status' | 'propertyType' | 'featured' | 'images'>;

function bounded(value: number | undefined, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function resolvePresentation(image: HeroSlide['image'], selection?: HeroSlideSelection): HeroPresentation {
  return {
    focusX: selection?.focusX ?? bounded(image.focusX, 0.5, 0, 1),
    focusY: selection?.focusY ?? bounded(image.focusY, 0.5, 0, 1),
    zoom: selection?.zoom ?? bounded(image.zoom, 1, 0.5, 2),
    fit: selection?.fit ?? image.fit ?? 'cover',
  };
}

/** Sólo pide los datos públicos que necesita la portada, sin direcciones ni coordenadas exactas. */
async function listEligibleProperties() {
  return prisma.property.findMany({
    where: { status: { in: ['AVAILABLE', 'RESERVED'] } },
    select: { id: true, code: true, location: true, status: true, propertyType: true, featured: true, images: true },
    orderBy: { code: 'asc' },
  });
}

function candidates(properties: HomepageProperty[]) {
  return properties.filter((property) => ['AVAILABLE', 'RESERVED'].includes(property.status)).flatMap((property) => {
    const images = (Array.isArray(property.images) ? property.images : []).flatMap((raw) => {
      const parsed = imageSchema.safeParse(raw);
      return parsed.success ? [parsed.data] : [];
    }).sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.order - b.order);
    if (!images.length) return [];
    const main = images[0];
    const landscape = (main.width ?? 0) > (main.height ?? 0);
    const home = ['HOUSE', 'COUNTRY_HOUSE'].includes(property.propertyType);
    const score = (landscape ? 4 : 0) + (home ? 4 : 0) + (property.featured ? 2 : 0)
      + Math.min(main.width ?? 0, 1600) / 1600;
    return [{ property, images, score }];
  }).sort((a, b) =>
    Number(b.property.code === 'LP-2609-N1AP') - Number(a.property.code === 'LP-2609-N1AP')
    || b.score - a.score || a.property.code.localeCompare(b.property.code)
  );
}

/** Resuelve referencias vigentes y completa huecos con fotos de otras propiedades publicadas. */
export function resolveHomepageSlides(properties: HomepageProperty[], selection: HeroSlideSelection[] | null): HeroSlide[] {
  const ranked = candidates(properties);
  const toSlide = (entry: typeof ranked[number], image: typeof entry.images[number], selection?: HeroSlideSelection): HeroSlide => ({
    propertyId: entry.property.id,
    propertyCode: entry.property.code,
    location: entry.property.location,
    image,
    presentation: resolvePresentation(image, selection),
  });
  const reservedProperties = new Set<string>();
  const reservedImages = new Set<string>();
  const saved = (selection ?? []).slice(0, 10).map((reference) => {
    const entry = ranked.find((candidate) => candidate.property.id === reference.propertyId);
    const image = entry?.images.find((candidate) => candidate.url === reference.imageUrl);
    if (!entry || !image || reservedProperties.has(entry.property.id) || reservedImages.has(image.url)) return null;
    reservedProperties.add(entry.property.id);
    reservedImages.add(image.url);
    return toSlide(entry, image, reference);
  });
  const usedProperties = new Set<string>();
  const usedImages = new Set<string>();
  const nextDefault = () => {
    for (const entry of ranked) {
      if (usedProperties.has(entry.property.id) || reservedProperties.has(entry.property.id)) continue;
      const image = entry.images.find((candidate) => !usedImages.has(candidate.url) && !reservedImages.has(candidate.url));
      if (image) return toSlide(entry, image);
    }
    return null;
  };
  // Una propiedad aporta como máximo una foto, incluso si el catálogo tiene menos de diez.
  return Array.from({ length: 10 }, (_, index) => {
    const slide = saved[index] ?? nextDefault();
    if (slide) {
      usedProperties.add(slide.propertyId);
      usedImages.add(slide.image.url);
    }
    return slide;
  }).filter((slide): slide is HeroSlide => !!slide);
}

export async function getHomepageSettings() {
  const [settings, properties] = await Promise.all([
    prisma.homepageSettings.findUnique({ where: { id: 'homepage' } }),
    listEligibleProperties(),
  ]);
  const parsed = storedHomepageSelectionSchema.safeParse(settings?.selection);
  const selection = parsed.success ? parsed.data : null;
  return { selection, slides: resolveHomepageSlides(properties, selection) };
}

export async function saveHomepageSettings(input: unknown) {
  // La validación completa termina antes de escribir: una foto borrada, privada o repetida
  // nunca reemplaza la selección anterior.
  const { selection } = homepageInputSchema.parse(input);
  const properties = await listEligibleProperties();
  const available = candidates(properties);
  for (const reference of selection) {
    const property = available.find((candidate) => candidate.property.id === reference.propertyId);
    if (!property?.images.some((image) => image.url === reference.imageUrl)) {
      throw new ApiError(400, 'Una de las fotos ya no está disponible. Elegí fotos de propiedades publicadas.');
    }
  }
  const data = selection as Prisma.InputJsonValue;
  await prisma.homepageSettings.upsert({
    where: { id: 'homepage' },
    create: { id: 'homepage', selection: data },
    update: { selection: data },
  });
  return { selection, slides: resolveHomepageSlides(properties, selection) };
}
