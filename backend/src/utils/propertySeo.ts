export const PUBLIC_SITE_ORIGIN = 'https://latorrepropiedades.com';

/** Los IDs del sitio anterior eran enteros positivos, no URLs ni rutas libres. */
export function isLegacyPropertyId(value: string): boolean {
  return /^[1-9]\d{0,11}$/.test(value);
}

export function getLegacyPropertyId(features: unknown): string | null {
  if (!features || typeof features !== 'object' || Array.isArray(features)) return null;
  const metadata = features as Record<string, unknown>;
  if (metadata.source !== 'buscadorprop') return null;
  const sourceId = metadata.sourceId;
  if (typeof sourceId !== 'string' && typeof sourceId !== 'number') return null;
  if (typeof sourceId === 'number' && !Number.isSafeInteger(sourceId)) return null;
  const id = String(sourceId);
  return isLegacyPropertyId(id) ? id : null;
}

export function propertyCanonicalUrl(id: string): string {
  return `${PUBLIC_SITE_ORIGIN}/propiedad/${encodeURIComponent(id)}`;
}

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]!);
}

export function buildPublicSitemap(properties: ReadonlyArray<{ id: string; updatedAt: Date | string }>): string {
  const urls = ['/', '/casas-en-venta-en-brandsen', '/privacidad'].map(path => `  <url><loc>${PUBLIC_SITE_ORIGIN}${path}</loc></url>`);
  for (const property of properties) {
    const updatedAt = new Date(property.updatedAt);
    const lastmod = Number.isNaN(updatedAt.getTime()) ? '' : `<lastmod>${updatedAt.toISOString()}</lastmod>`;
    urls.push(`  <url><loc>${escapeXml(propertyCanonicalUrl(property.id))}</loc>${lastmod}</url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export interface LegacyPropertyRedirect {
  source: string;
  destination: string;
  type: 301;
}

/** Sólo se publican rutas necesarias para recuperar enlaces, no el resto de features. */
export function buildLegacyPropertyRedirects(properties: ReadonlyArray<{ id: string; features: unknown }>): LegacyPropertyRedirect[] {
  const destinations = new Map<string, Set<string>>();
  for (const property of properties) {
    const legacyId = getLegacyPropertyId(property.features);
    if (!legacyId) continue;
    const ids = destinations.get(legacyId) ?? new Set<string>();
    ids.add(property.id);
    destinations.set(legacyId, ids);
  }
  return [...destinations.entries()]
    .filter(([, ids]) => ids.size === 1)
    .map(([legacyId, ids]) => ({
      source: `/propiedad/${legacyId}`,
      destination: propertyCanonicalUrl([...ids][0]),
      type: 301 as const,
    }))
    .sort((a, b) => a.source.localeCompare(b.source));
}
