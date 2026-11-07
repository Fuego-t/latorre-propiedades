import { prisma } from '../lib/prisma';
import { buildLegacyPropertyRedirects, buildPublicSitemap } from '../utils/propertySeo';
import { publicWhere, toPublicDto } from './properties.service';

export async function getPublicSitemap(): Promise<string> {
  const properties = await prisma.property.findMany({
    where: publicWhere({ isDemo: false }),
    select: { id: true, updatedAt: true },
    orderBy: { id: 'asc' },
  });
  return buildPublicSitemap(properties);
}

export async function getLegacyPropertyRedirects() {
  const properties = await prisma.property.findMany({
    where: publicWhere({ isDemo: false }),
    select: { id: true, features: true },
    orderBy: { id: 'asc' },
  });
  return buildLegacyPropertyRedirects(properties);
}

/** Exportación para el publicador: metadata de origen sólo se transforma en rutas. */
export async function getSeoExport() {
  const properties = await prisma.property.findMany({
    where: publicWhere({ isDemo: false }),
    orderBy: { id: 'asc' },
  });
  return {
    properties: properties.map(toPublicDto),
    redirects: buildLegacyPropertyRedirects(properties),
  };
}
