import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';

export const listLocations = asyncHandler(async (_req: Request, res: Response) => {
  const locations = await prisma.location.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
  res.json({ ok: true, locations });
});
