import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../middleware/errorHandler';
import { prisma } from '../../lib/prisma';
import {
  createProperty,
  deleteProperty,
  updateProperty,
  updatePropertyStatus,
} from '../../services/properties.service';

const VALID_STATUSES = ['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'PAUSED', 'HIDDEN'];
const VALID_OPERATION_TYPES = ['SALE', 'COMMERCIAL_RENT', 'RESIDENTIAL_RENT'];

export const listAllProperties = asyncHandler(async (req: Request, res: Response) => {
  const { status, operationType, q } = req.query as Record<string, string | undefined>;

  // Defensa extra: ignoramos cualquier valor de filtro que no sea uno de los válidos
  // (por ejemplo, si por un bug del frontend llega el texto literal "undefined").
  const validStatus = status && VALID_STATUSES.includes(status) ? status : undefined;
  const validOperationType = operationType && VALID_OPERATION_TYPES.includes(operationType) ? operationType : undefined;
  const validQ = q && q.trim() !== '' && q !== 'undefined' ? q : undefined;

  const properties = await prisma.property.findMany({
    where: {
      ...(validStatus ? { status: validStatus as never } : {}),
      ...(validOperationType ? { operationType: validOperationType as never } : {}),
      ...(validQ ? { title: { contains: validQ, mode: 'insensitive' } } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ ok: true, properties });
});

export const dashboardSummary = asyncHandler(async (_req: Request, res: Response) => {
  const [total, available, sale, commercialRent, residentialRent, sold, rented, recent] =
    await Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { status: 'AVAILABLE' } }),
      prisma.property.count({ where: { operationType: 'SALE', status: { in: ['AVAILABLE', 'RESERVED'] } } }),
      prisma.property.count({
        where: { operationType: 'COMMERCIAL_RENT', status: { in: ['AVAILABLE', 'RESERVED'] } },
      }),
      prisma.property.count({
        where: { operationType: 'RESIDENTIAL_RENT', status: { in: ['AVAILABLE', 'RESERVED'] } },
      }),
      prisma.property.count({ where: { status: 'SOLD' } }),
      prisma.property.count({ where: { status: 'RENTED' } }),
      prisma.property.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

  res.json({
    ok: true,
    summary: { total, available, sale, commercialRent, residentialRent, sold, rented },
    recent,
  });
});

export const getPropertyForAdmin = asyncHandler(async (req: Request, res: Response) => {
  const property = await prisma.property.findUnique({ where: { id: req.params.id } });
  if (!property) throw new ApiError(404, 'Propiedad no encontrada');
  res.json({ ok: true, property });
});

export const createPropertyHandler = asyncHandler(async (req: Request, res: Response) => {
  const property = await createProperty(req.body);
  res.status(201).json({ ok: true, property });
});

export const updatePropertyHandler = asyncHandler(async (req: Request, res: Response) => {
  const property = await updateProperty(req.params.id, req.body);
  res.json({ ok: true, property });
});

export const updateStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const property = await updatePropertyStatus(req.params.id, req.body.status);
  res.json({ ok: true, property });
});

export const deletePropertyHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteProperty(req.params.id);
  res.status(204).send();
});
