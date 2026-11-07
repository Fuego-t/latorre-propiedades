const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSeoFiles } = require('../src/seo/render.cjs');

const template = '<!doctype html><html lang="es"><head><title>Anterior</title><meta name="description" content="Anterior" /><script type="module" src="/assets/app-123.js"></script></head><body><div id="root"></div></body></html>';
const property = { id: 'cpublic123', code: 'LP-TEST', title: 'Casa familiar', status: 'AVAILABLE', propertyType: 'HOUSE', operationType: 'SALE', location: 'Coronel Brandsen', description: 'Casa con jardín y dos dormitorios.', price: '100000', currency: 'USD', bedrooms: 2, totalArea: 250, images: [{ url: 'https://res.cloudinary.com/demo/casa.webp', isMain: true }], updatedAt: '2026-11-07T00:00:00Z' };

test('la ficha contiene texto e imagen antes de ejecutar JavaScript y conserva el bundle', () => {
  const { files } = buildSeoFiles({ template, properties: [property] });
  const html = files['/propiedad/cpublic123/index.html'];
  assert.match(html, /<h1>Casa en venta en Coronel Brandsen<\/h1>/);
  assert.ok(html.includes(property.description));
  assert.match(html, /src="\/assets\/app-123.js"/);
  assert.match(html, /rel="canonical" href="https:\/\/latorrepropiedades.com\/propiedad\/cpublic123"/);
  assert.ok(files['/casas-en-venta-en-brandsen/index.html'].includes('cpublic123'));
});
test('no exporta ocultas, vendidas ni demos y retira sus redirecciones', () => {
  const hidden = { ...property, id: 'chidden', status: 'HIDDEN', description: 'SECRETO_OCULTO' };
  const { files, redirects } = buildSeoFiles({ template, properties: [property, hidden, { ...property, id: 'cdemo', demo: true }], redirects: [{ source: '/propiedad/123', destination: 'https://latorrepropiedades.com/propiedad/chidden', type: 301 }] });
  assert.equal(files['/propiedad/chidden/index.html'], undefined);
  assert.equal(files['/propiedad/cdemo/index.html'], undefined);
  assert.ok(!Object.values(files).join('').includes('SECRETO_OCULTO'));
  assert.ok(!redirects.some(item => item.source === '/propiedad/123'));
});
test('no serializa dirección privada, coordenadas ni metadata interna', () => {
  const input = { ...property, exactAddress: 'DIRECCION_PRIVADA_999', latitude: -35.12345678, longitude: -58.12345678, features: { sourceId: '777', secret: 'METADATA_PRIVADA' }, showExactLocation: false };
  const all = Object.values(buildSeoFiles({ template, properties: [input] }).files).join('');
  for (const value of ['DIRECCION_PRIVADA_999', '-35.12345678', '-58.12345678', 'METADATA_PRIVADA']) assert.ok(!all.includes(value));
});
test('escapa contenido hostil y no interpreta dólares en reemplazos HTML', () => {
  const input = { ...property, title: '<script>alert(1)</script>', description: 'Precio $& $1: </script><script>alert(2)</script>', images: [{ url: 'javascript:alert(3)' }] };
  const html = buildSeoFiles({ template, properties: [input] }).files['/propiedad/cpublic123/index.html'];
  assert.ok(!html.includes('<script>alert('));
  assert.ok(!html.includes('src="javascript:'));
  assert.ok(html.includes('Precio $&amp; $1:'));
  const data = html.match(/<script id="latorre-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(data).description, 'Precio $& $1: alert(2)');
});
test('regenerar desde HTML ya publicado reemplaza el catálogo sin duplicar contenido', () => {
  const first = buildSeoFiles({ template, properties: [property] });
  const second = buildSeoFiles({ template: first.files['/index.html'], properties: [{ ...property, id: 'cnew', description: 'DESCRIPCION_NUEVA' }] });
  assert.ok(!second.files['/index.html'].includes('cpublic123'));
  assert.ok(second.files['/index.html'].includes('cnew'));
  assert.equal((second.files['/index.html'].match(/lp:seo-content:start/g) || []).length, 1);
  assert.equal((second.files['/index.html'].match(/id="latorre-structured-data"/g) || []).length, 1);
});
test('sitemap y redirects sólo contienen destinos públicos canónicos vigentes', () => {
  const { files, redirects } = buildSeoFiles({ template, properties: [property], redirects: [
    { source: '/propiedad/707276', destination: 'https://latorrepropiedades.com/propiedad/cpublic123', type: 301 },
    { source: '/propiedad/1', destination: 'https://evil.example/propiedad/cpublic123', type: 301 },
    { source: '/propiedad/2', destination: 'https://latorrepropiedades.com/propiedad/%XX', type: 301 },
  ] });
  assert.match(files['/sitemap.xml'], /<lastmod>2026-11-07T00:00:00.000Z<\/lastmod>/);
  assert.equal(redirects.filter(item => item.source.startsWith('/propiedad/')).length, 1);
  assert.ok(redirects.some(item => item.source === '/propiedades' && item.destination === '/#propiedades'));
  assert.throws(() => buildSeoFiles({ template, properties: [property, property] }), /duplicado/);
  assert.throws(() => buildSeoFiles({ template, properties: [property], origin: 'https://evil.example' }), /canónico/);
});
