import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../middleware/errorHandler';
import { propertyFiltersSchema } from '../validators/property.schema';
import {
  getPublicPropertyById,
  getRelatedProperties,
  incrementViews,
  listPublicProperties,
} from '../services/properties.service';
import { prisma } from '../lib/prisma';

export const listProperties = asyncHandler(async (req: Request, res: Response) => {
  const filters = propertyFiltersSchema.parse(req.query);
  const result = await listPublicProperties(filters);
  res.json({ ok: true, ...result });
});

export const getProperty = asyncHandler(async (req: Request, res: Response) => {
  const property = await getPublicPropertyById(req.params.id);
  if (!property) throw new ApiError(404, 'Propiedad no encontrada');

  const raw = await prisma.property.findUnique({ where: { id: req.params.id } });
  const related = raw ? await getRelatedProperties(raw) : [];

  res.json({ ok: true, property, related });
});

export const registerView = asyncHandler(async (req: Request, res: Response) => {
  await incrementViews(req.params.id);
  res.status(204).send();
});
