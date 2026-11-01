import { Prisma, Property } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/errorHandler';
import { HeroSlideSelection, homepageInputSchema } from '../validators/homepage.schema';

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
});

export interface HeroSlide {
  propertyId: string;
  propertyCode: string;
  location: string;
  image: z.infer<typeof imageSchema>;
}

type HomepageProperty = Pick<Property, 'id' | 'code' | 'location' | 'status' | 'propertyType' | 'featured' | 'images'>;

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
  const toSlide = (entry: typeof ranked[number], image: typeof entry.images[number]): HeroSlide => ({
    propertyId: entry.property.id,
    propertyCode: entry.property.code,
    location: entry.property.location,
    image,
  });
  // Primero una foto por propiedad; después, otras fotos si el catálogo es pequeño.
  const defaults = [
    ...ranked.map((entry) => toSlide(entry, entry.images[0])),
    ...ranked.flatMap((entry) => entry.images.slice(1).map((image) => toSlide(entry, image))),
  ];
  const saved = (selection ?? []).slice(0, 4).map((reference) => {
    const entry = ranked.find((candidate) => candidate.property.id === reference.propertyId);
    const image = entry?.images.find((candidate) => candidate.url === reference.imageUrl);
    return entry && image ? toSlide(entry, image) : null;
  });
  const reserved = new Set(saved.flatMap((slide) => slide ? [slide.image.url] : []));
  const used = new Set<string>();
  const nextDefault = () => defaults.find((slide) => !used.has(slide.image.url) && !reserved.has(slide.image.url));
  return Array.from({ length: 4 }, (_, index) => {
    const preferred = saved[index];
    const slide = preferred && !used.has(preferred.image.url) ? preferred : nextDefault();
    if (slide) used.add(slide.image.url);
    return slide;
  }).filter((slide): slide is HeroSlide => !!slide);
}

export async function getHomepageSettings() {
  const [settings, properties] = await Promise.all([
    prisma.homepageSettings.findUnique({ where: { id: 'homepage' } }),
    listEligibleProperties(),
  ]);
  const parsed = homepageInputSchema.safeParse(settings ? { selection: settings.selection } : null);
  const selection = parsed.success ? parsed.data.selection : null;
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
