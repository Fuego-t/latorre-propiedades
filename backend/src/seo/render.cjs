'use strict';

const ORIGIN = 'https://latorrepropiedades.com';
const BRANDSEN_PATH = '/casas-en-venta-en-brandsen';
const START = '<!--lp:seo-content:start-->';
const END = '<!--lp:seo-content:end-->';
const TYPES = { HOUSE: 'Casa', APARTMENT: 'Departamento', COMMERCIAL_UNIT: 'Local comercial', OFFICE: 'Oficina', LAND: 'Terreno', FIELD: 'Campo', COUNTRY_HOUSE: 'Casaquinta', OTHER: 'Propiedad' };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function plain(value) { return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function json(value) { return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }
function safeImage(value, origin) {
  try { const url = new URL(value, origin); return /^https?:$/.test(url.protocol) ? url.href : null; } catch { return null; }
}
function visible(property) {
  return property && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(property.id)
    && ['AVAILABLE', 'RESERVED'].includes(property.status) && !property.demo && !property.isDemo;
}
function isBrandsenHouse(property) {
  return visible(property) && property.propertyType === 'HOUSE' && property.operationType === 'SALE'
    && plain(property.location).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('brandsen');
}
function propertySeo(property, origin = ORIGIN) {
  const kind = TYPES[property.propertyType] || 'Propiedad';
  const operation = property.operationType === 'SALE' ? 'venta' : 'alquiler';
  const heading = `${kind} en ${operation} en ${plain(property.location)}`;
  const canonical = `${origin}/propiedad/${encodeURIComponent(property.id)}`;
  const title = `${heading} · ${plain(property.code)} | Latorre Propiedades`;
  const details = [property.bedrooms ? `${property.bedrooms} dormitorios` : '', property.totalArea ? `${property.totalArea} m² totales` : ''].filter(Boolean).join(' · ');
  const description = plain(`${heading}. ${details ? `${details}. ` : ''}${property.description}`).slice(0, 160);
  const photos = Array.isArray(property.images) ? property.images : [];
  const main = photos.find(photo => photo.isMain) || photos[0];
  const image = (main && safeImage(main.url, origin)) || `${origin}/preview-latorre.jpg`;
  const address = { '@type': 'PostalAddress', addressLocality: plain(property.location), addressCountry: 'AR' };
  // Se eligen campos públicos explícitamente. Nunca serializar el registro completo.
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'RealEstateListing', '@id': `${canonical}#listing`,
    name: heading, url: canonical, description: plain(property.description), image,
    mainEntity: { '@type': property.propertyType === 'APARTMENT' ? 'Apartment' : ['HOUSE', 'COUNTRY_HOUSE'].includes(property.propertyType) ? 'House' : 'Place', name: plain(property.title), address },
    offers: { '@type': 'Offer', url: canonical, ...(property.price != null && Number.isFinite(Number(property.price)) && Number(property.price) >= 0 ? { price: Number(property.price), priceCurrency: property.currency } : {}), seller: { '@type': 'RealEstateAgent', name: 'Latorre Propiedades', url: `${origin}/` } },
  };
  return { title, heading, description, canonical, image, structuredData };
}
function pageDocument(template, metadata, content) {
  if (!/<head[\s>]/i.test(template) || !/<\/head>/i.test(template)) throw new Error('Falta la plantilla HTML de la aplicación');
  let html = template.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|twitter:[^"']+|og:[^"']+)["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script\b[^>]*id=["']latorre-structured-data["'][^>]*>[\s\S]*?<\/script>/gi, '');
  const head = `<title>${escapeHtml(metadata.title)}</title>
    <meta name="description" content="${escapeHtml(metadata.description)}" />
    <meta name="robots" content="${metadata.noindex ? 'noindex,follow' : 'index,follow'}" />
    <link rel="canonical" href="${escapeHtml(metadata.canonical)}" />
    <meta property="og:type" content="website" /><meta property="og:site_name" content="Latorre Propiedades" /><meta property="og:locale" content="es_AR" />
    <meta property="og:title" content="${escapeHtml(metadata.title)}" /><meta property="og:description" content="${escapeHtml(metadata.description)}" />
    <meta property="og:url" content="${escapeHtml(metadata.canonical)}" /><meta property="og:image" content="${escapeHtml(metadata.image)}" />
    <meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${escapeHtml(metadata.title)}" />
    <meta name="twitter:description" content="${escapeHtml(metadata.description)}" /><meta name="twitter:image" content="${escapeHtml(metadata.image)}" />
    ${metadata.structuredData ? `<script id="latorre-structured-data" type="application/ld+json">${json(metadata.structuredData)}</script>` : ''}`;
  html = html.replace(/<\/head>/i, () => `${head}\n</head>`);
  const marked = `${START}${content}${END}`;
  if (html.includes(START) && html.includes(END)) html = html.replace(/<!--lp:seo-content:start-->[\s\S]*?<!--lp:seo-content:end-->/, () => marked);
  else if (/<div\b[^>]*id=["']root["'][^>]*>\s*<\/div>/i.test(html)) html = html.replace(/(<div\b[^>]*id=["']root["'][^>]*>)\s*(<\/div>)/i, (_match, open, close) => `${open}${marked}${close}`);
  else throw new Error('No se pudo localizar el contenido inicial de la aplicación');
  return html;
}
function header(origin) {
  return `<header class="landing-shell"><a href="${origin}/"><img src="/logo-latorre.png" width="176" height="78" alt="Latorre Propiedades" /></a><nav aria-label="Principal"><a href="${origin}/#propiedades">Propiedades</a> · <a href="${origin}${BRANDSEN_PATH}">Casas en venta en Brandsen</a> · <a href="${origin}/#contacto">Contacto</a></nav></header>`;
}
function price(property) {
  return property.price == null ? 'Consultar precio' : `${escapeHtml(property.currency)} ${escapeHtml(new Intl.NumberFormat('es-AR').format(Number(property.price)))}`;
}
function cards(properties, origin) {
  return `<ul>${properties.map(property => {
    const seo = propertySeo(property, origin);
    return `<li><article><h2><a href="${escapeHtml(seo.canonical)}">${escapeHtml(seo.heading)}</a></h2><p>${escapeHtml(property.title)} · ${escapeHtml(property.code)} · ${price(property)}</p><p>${escapeHtml(seo.description)}</p></article></li>`;
  }).join('')}</ul>`;
}
function buildSeoFiles({ template, properties, redirects = [], origin = ORIGIN }) {
  if (origin !== ORIGIN) throw new Error('El dominio canónico debe ser latorrepropiedades.com');
  const publicProperties = properties.filter(visible);
  const ids = new Set();
  for (const property of publicProperties) {
    if (ids.has(property.id)) throw new Error('Identificador de propiedad duplicado');
    ids.add(property.id);
  }
  const files = {};
  const business = { '@context': 'https://schema.org', '@type': 'RealEstateAgent', '@id': `${origin}/#inmobiliaria`, name: 'Latorre Propiedades', url: `${origin}/`, image: `${origin}/oficina-latorre.webp`, telephone: ['+542223460184', '+542223464691'], address: { '@type': 'PostalAddress', streetAddress: 'Av. Rivadavia 112', addressLocality: 'Coronel Brandsen', addressRegion: 'Buenos Aires', addressCountry: 'AR' } };
  const home = { title: 'Latorre Propiedades | Coronel Brandsen y alrededores', description: 'Latorre Propiedades — Inmobiliaria en Coronel Brandsen. Casas, departamentos, locales y campos en venta y alquiler.', canonical: `${origin}/`, image: `${origin}/preview-latorre.jpg`, structuredData: business };
  files['/index.html'] = pageDocument(template, home, `${header(origin)}<main class="landing-shell"><h1>Encontrá tu próximo hogar con Latorre Propiedades</h1><p>Venta y alquiler de propiedades en Coronel Brandsen y alrededores.</p><section id="propiedades"><h2>Propiedades publicadas</h2>${cards(publicProperties, origin)}</section><section id="contacto"><h2>Contactá a Latorre Propiedades</h2><p>Av. Rivadavia 112, Coronel Brandsen, Buenos Aires.</p><a href="tel:+542223460184">(2223) 46-0184</a> · <a href="tel:+542223464691">(2223) 46-4691</a></section></main>`);
  for (const property of publicProperties) {
    const seo = propertySeo(property, origin);
    const descriptions = String(property.description || '').split(/\n+/).filter(Boolean).map(part => `<p>${escapeHtml(part)}</p>`).join('');
    const stats = [property.bedrooms ? `${property.bedrooms} dormitorios` : '', property.bathrooms ? `${property.bathrooms} baños` : '', property.totalArea ? `${property.totalArea} m² totales` : '', property.coveredArea ? `${property.coveredArea} m² cubiertos` : ''].filter(Boolean).map(escapeHtml).join(' · ');
    const content = `${header(origin)}<main class="landing-shell"><article><h1>${escapeHtml(seo.heading)}</h1><p>${escapeHtml(property.title)} · Código ${escapeHtml(property.code)}</p><p>${escapeHtml(property.location)}${property.neighborhood ? `, ${escapeHtml(property.neighborhood)}` : ''}</p><img src="${escapeHtml(seo.image)}" alt="${escapeHtml(seo.heading)}" width="960" style="max-width:100%;height:auto" /><p>${price(property)}</p><p>${stats}</p><section><h2>Descripción de la propiedad</h2>${descriptions}</section><a href="${origin}/#contacto">Consultar por esta propiedad</a></article><a href="${origin}/#propiedades">Ver otras propiedades</a></main>`;
    files[`/propiedad/${property.id}/index.html`] = pageDocument(template, seo, content);
  }
  const brandsen = publicProperties.filter(isBrandsenHouse);
  files[`${BRANDSEN_PATH}/index.html`] = pageDocument(template, { title: 'Casas en venta en Brandsen | Latorre Propiedades', description: 'Encontrá casas en venta en Coronel Brandsen. Consultá fotos, precios y características de las propiedades publicadas por Latorre Propiedades.', canonical: `${origin}${BRANDSEN_PATH}`, image: `${origin}/preview-latorre.jpg`, structuredData: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Casas en venta en Brandsen', url: `${origin}${BRANDSEN_PATH}`, mainEntity: { '@type': 'ItemList', numberOfItems: brandsen.length, itemListElement: brandsen.map((property, index) => ({ '@type': 'ListItem', position: index + 1, url: propertySeo(property, origin).canonical })) } } }, `${header(origin)}<main class="landing-shell"><h1>Casas en venta en Brandsen</h1><p>Conocé las casas publicadas por Latorre Propiedades en Coronel Brandsen. Consultá sus fotos, precios y características y coordiná una visita con nuestro equipo.</p>${cards(brandsen, origin)}</main>`);
  const urls = [{ url: `${origin}/` }, { url: `${origin}${BRANDSEN_PATH}` }, { url: `${origin}/privacidad` }, ...publicProperties.map(property => ({ url: propertySeo(property, origin).canonical, updatedAt: property.updatedAt }))];
  files['/sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(item => `<url><loc>${escapeHtml(item.url)}</loc>${item.updatedAt && Number.isFinite(new Date(item.updatedAt).getTime()) ? `<lastmod>${new Date(item.updatedAt).toISOString()}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
  files['/robots.txt'] = `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`;
  files['/404.html'] = pageDocument(template, { title: 'Página no encontrada | Latorre Propiedades', description: 'Consultá las propiedades publicadas de Latorre Propiedades.', canonical: `${origin}/`, image: home.image, noindex: true }, `${header(origin)}<main class="landing-shell"><h1>Página no encontrada</h1><p>Esta publicación puede haber dejado de estar disponible.</p><a href="${origin}/#propiedades">Ver propiedades disponibles</a></main>`);
  const fixed = [{ source: '/propiedades', destination: '/#propiedades', type: 301 }, { source: '/propiedades/**', destination: '/#propiedades', type: 301 }, { source: '/contacto', destination: '/#contacto', type: 301 }, { source: '/tasaciones', destination: '/#contacto', type: 301 }];
  const validRedirects = redirects.filter(item => /^\/propiedad\/[1-9]\d*$/.test(item.source) && typeof item.destination === 'string' && item.destination.startsWith(`${origin}/propiedad/`) && ids.has(item.destination.slice(`${origin}/propiedad/`.length))).map(item => ({ source: item.source, destination: item.destination, type: 301 }));
  return { files, redirects: [...fixed, ...validRedirects] };
}

module.exports = { ORIGIN, BRANDSEN_PATH, escapeHtml, propertySeo, pageDocument, buildSeoFiles, visible, isBrandsenHouse };
