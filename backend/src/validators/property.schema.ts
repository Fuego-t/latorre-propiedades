import { z } from 'zod';

export const operationTypeEnum = z.enum(['SALE', 'COMMERCIAL_RENT', 'RESIDENTIAL_RENT']);
export const propertyTypeEnum = z.enum([
  'HOUSE',
  'APARTMENT',
  'COMMERCIAL_UNIT',
  'OFFICE',
  'LAND',
  'FIELD',
  'COUNTRY_HOUSE',
  'OTHER',
]);
export const propertyStatusEnum = z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'PAUSED', 'HIDDEN']);
export const currencyEnum = z.enum(['USD', 'ARS']);

const imageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  order: z.number().int().min(0),
  isMain: z.boolean().default(false),
});

export const propertyInputSchema = z.object({
  title: z.string().min(4, 'El título es demasiado corto').max(140),
  operationType: operationTypeEnum,
  propertyType: propertyTypeEnum,
  status: propertyStatusEnum.default('AVAILABLE'),
  featured: z.boolean().default(false),

  // Opcional: las propiedades sin precio se publican como "Consultar precio".
  price: z.number().positive('El precio debe ser mayor a 0').optional().nullable(),
  currency: currencyEnum,
  expenses: z.number().nonnegative().optional().nullable(),
  priceNote: z.string().max(200).optional().nullable(),

  location: z.string().min(2, 'Indicá la localidad'),
  neighborhood: z.string().max(120).optional().nullable(),
  exactAddress: z.string().min(4, 'Indicá la dirección exacta'),

  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  showExactLocation: z.boolean().default(false),

  coveredArea: z.number().nonnegative().optional().nullable(),
  totalArea: z.number().nonnegative().optional().nullable(),
  front: z.number().nonnegative().optional().nullable(),
  depth: z.number().nonnegative().optional().nullable(),
  rooms: z.number().int().nonnegative().optional().nullable(),
  bedrooms: z.number().int().nonnegative().optional().nullable(),
  bathrooms: z.number().int().nonnegative().optional().nullable(),
  age: z.number().int().nonnegative().optional().nullable(),

  garage: z.boolean().default(false),
  yard: z.boolean().default(false),
  pool: z.boolean().default(false),
  grill: z.boolean().default(false),
  quincho: z.boolean().default(false),
  gallery: z.boolean().default(false),
  terrace: z.boolean().default(false),
  services: z.array(z.string()).optional().nullable(),
  features: z.array(z.string()).optional().nullable(),

  description: z.string().min(10, 'Agregá una descripción más completa'),

  images: z.array(imageSchema).default([]),
});

export const propertyUpdateSchema = propertyInputSchema.partial();

export const statusUpdateSchema = z.object({
  status: propertyStatusEnum,
});

export const propertyFiltersSchema = z.object({
  operationType: operationTypeEnum.optional(),
  location: z.string().optional(),
  propertyType: propertyTypeEnum.optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  currency: currencyEnum.optional(),
  rooms: z.coerce.number().int().nonnegative().optional(),
  bedrooms: z.coerce.number().int().nonnegative().optional(),
  bathrooms: z.coerce.number().int().nonnegative().optional(),
  minArea: z.coerce.number().nonnegative().optional(),
  maxArea: z.coerce.number().nonnegative().optional(),
  featured: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});
