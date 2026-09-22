import { Prisma, Property } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { computePublicCoordinates } from '../utils/publicCoordinates';
import { generatePropertyCode } from '../utils/propertyCode';
import { deletePropertyImage } from './image.service';
import { z } from 'zod';
import { propertyFiltersSchema, propertyInputSchema } from '../validators/property.schema';

type Filters = z.infer<typeof propertyFiltersSchema>;
type PropertyInput = z.infer<typeof propertyInputSchema>;

const VISIBLE_PUBLIC_STATUSES: Property['status'][] = ['AVAILABLE', 'RESERVED'];

/** Estados que jamás deben verse en el mapa/listado público (vendidas, alquiladas, pausadas u ocultas). */
function publicWhere(extra: Prisma.PropertyWhereInput = {}): Prisma.PropertyWhereInput {
  return { status: { in: VISIBLE_PUBLIC_STATUSES }, ...extra };
}

export function buildFilterWhere(filters: Filters): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {};

  if (filters.operationType) where.operationType = filters.operationType;
  if (filters.propertyType) where.propertyType = filters.propertyType;
  if (filters.location) where.location = { equals: filters.location, mode: 'insensitive' };
  if (filters.currency) where.currency = filters.currency;
  if (filters.featured) where.featured = true;
  if (filters.rooms) where.rooms = { gte: filters.rooms };
  if (filters.bedrooms) where.bedrooms = { gte: filters.bedrooms };
  if (filters.bathrooms) where.bathrooms = { gte: filters.bathrooms };

  if (filters.minPrice || filters.maxPrice) {
    where.price = {
      ...(filters.minPrice ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice ? { lte: filters.maxPrice } : {}),
    };
  }

  if (filters.minArea || filters.maxArea) {
    where.totalArea = {
      ...(filters.minArea ? { gte: filters.minArea } : {}),
      ...(filters.maxArea ? { lte: filters.maxArea } : {}),
    };
  }

  return where;
}

/**
 * DTO público: nunca incluye `exactAddress`, ni las coordenadas reales
 * (`latitude`/`longitude`) cuando la propiedad no autoriza mostrar la
 * ubicación exacta. El mapa público sólo recibe `publicLatitude/publicLongitude`.
 */
export function toPublicDto(property: Property) {
  const {
    latitude,
    longitude,
    exactAddress,
    publicLatitude,
    publicLongitude,
    isDemo,
    ...rest
  } = property;

  const showsExact = property.showExactLocation;

  return {
    ...rest,
    latitude: showsExact ? latitude : undefined,
    longitude: showsExact ? longitude : undefined,
    publicLatitude: publicLatitude ?? latitude,
    publicLongitude: publicLongitude ?? longitude,
    exactAddress: showsExact ? exactAddress : undefined,
    demo: isDemo,
  };
}

export async function listPublicProperties(filters: Filters) {
  const where = publicWhere(buildFilterWhere(filters));
  const skip = (filters.page - 1) * filters.pageSize;

  const [items, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: filters.pageSize,
    }),
    prisma.property.count({ where }),
  ]);

  return {
    items: items.map(toPublicDto),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

export async function getPublicPropertyById(id: string) {
  const property = await prisma.property.findFirst({ where: { id, ...publicWhere() } });
  if (!property) return null;
  return toPublicDto(property);
}

export async function getRelatedProperties(property: Property, limit = 4) {
  const related = await prisma.property.findMany({
    where: publicWhere({
      id: { not: property.id },
      OR: [{ location: property.location }, { propertyType: property.propertyType }],
    }),
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
  return related.map(toPublicDto);
}

export async function incrementViews(id: string) {
  await prisma.property.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => null);
}

function withPublicCoordinates(input: {
  id: string;
  latitude: number;
  longitude: number;
  showExactLocation: boolean;
}) {
  return computePublicCoordinates(input);
}

export async function createProperty(input: PropertyInput) {
  const code = generatePropertyCode();
  const id = `tmp-${code}`; // usado sólo para el hash determinístico del jitter antes de tener el id real

  const created = await prisma.property.create({
    data: {
      ...toPrismaData(input),
      code,
    },
  });

  // Ahora que existe el id definitivo, recalculamos las coordenadas públicas con el id real
  const { publicLatitude, publicLongitude } = withPublicCoordinates({
    id: created.id,
    latitude: input.latitude,
    longitude: input.longitude,
    showExactLocation: input.showExactLocation,
  });

  return prisma.property.update({
    where: { id: created.id },
    data: { publicLatitude, publicLongitude },
  });
}

export async function updateProperty(id: string, input: Partial<PropertyInput>) {
  const existing = await prisma.property.findUniqueOrThrow({ where: { id } });

  const latitude = input.latitude ?? existing.latitude;
  const longitude = input.longitude ?? existing.longitude;
  const showExactLocation = input.showExactLocation ?? existing.showExactLocation;

  const { publicLatitude, publicLongitude } = withPublicCoordinates({
    id,
    latitude,
    longitude,
    showExactLocation,
  });

  return prisma.property.update({
    where: { id },
    data: {
      ...toPrismaData(input as PropertyInput),
      publicLatitude,
      publicLongitude,
    },
  });
}

export async function updatePropertyStatus(id: string, status: Property['status']) {
  return prisma.property.update({ where: { id }, data: { status } });
}

export async function deleteProperty(id: string) {
  const property = await prisma.property.findUnique({ where: { id } });
  const deleted = await prisma.property.delete({ where: { id } });

  // Las fotos viven fuera de la base (Cloudinary o la carpeta uploads/): si no se borran
  // acá quedan huérfanas ocupando lugar para siempre. Se hace después del delete y sin
  // frenar la respuesta: que falle el borrado de un archivo no debe cancelar la operación.
  const images = (property?.images as unknown as Array<{ publicId?: string }> | null) ?? [];
  await Promise.all(
    images.map((img) => (img.publicId ? deletePropertyImage(img.publicId).catch(() => null) : null))
  );

  return deleted;
}

/**
 * Adapta el input ya validado por Zod a lo que espera Prisma.
 *
 * Se tipa como el input de `create` sin `code` (el código lo genera el servicio):
 * esa forma sirve para las dos operaciones, porque un objeto con valores planos
 * también es válido como `data` de un `update`. Antes declaraba el tipo de
 * update y eso rompía la compilación en `createProperty`.
 *
 * Nota: Prisma espera Decimal-compatible para price/expenses; number funciona
 * vía coerción de @prisma/client.
 */
function toPrismaData(input: PropertyInput): Omit<Prisma.PropertyUncheckedCreateInput, 'code'> {
  return { ...input } as Omit<Prisma.PropertyUncheckedCreateInput, 'code'>;
}
