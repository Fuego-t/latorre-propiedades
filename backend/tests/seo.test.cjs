const test = require('node:test');
const assert = require('node:assert/strict');

// No se carga .env ni se abre una conexión: estos módulos reciben una base simulada.
const prisma = { property: {} };
for (const [modulePath, exports] of [
  ['../dist/lib/prisma.js', { prisma }],
  ['../dist/services/image.service.js', { deletePropertyImage: async () => undefined }],
]) {
  const filename = require.resolve(modulePath);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}

const {
  buildLegacyPropertyRedirects,
  buildPublicSitemap,
  escapeXml,
  getLegacyPropertyId,
} = require('../dist/utils/propertySeo.js');
const { getPublicPropertyById } = require('../dist/services/properties.service.js');
const { getPublicSitemap, getLegacyPropertyRedirects, getSeoExport } = require('../dist/services/seo.service.js');

const record = (overrides = {}) => ({
  id: 'current-property',
  title: 'Casa en Brandsen',
  status: 'AVAILABLE',
  features: { source: 'buscadorprop', sourceId: '707276', sourceUrl: 'https://old.example/secret' },
  showExactLocation: false,
  latitude: -35.17,
  longitude: -58.23,
  publicLatitude: -35.171,
  publicLongitude: -58.231,
  exactAddress: 'Dirección privada 123',
  isDemo: false,
  ...overrides,
});

test('legacy lookup preserves public visibility and strips private metadata/location', async () => {
  const calls = [];
  prisma.property.findFirst = async (args) => { calls.push(args); return null; };
  prisma.property.findMany = async (args) => { calls.push(args); return [record()]; };
  const result = await getPublicPropertyById('707276');
  assert.equal(result.id, 'current-property');
  assert.equal(result.features, undefined);
  assert.equal(result.exactAddress, undefined);
  assert.equal(result.latitude, undefined);
  assert.equal(result.longitude, undefined);
  assert.equal(result.publicLatitude, -35.171);
  for (const args of calls) assert.deepEqual(args.where.status, { in: ['AVAILABLE', 'RESERVED'] });
  assert.equal(calls[1].take, 2);
  assert.equal(calls[1].where.AND[0].features.equals, 'buscadorprop');
  assert.deepEqual(calls[1].where.AND[1].OR.map((clause) => clause.features.equals), ['707276', 707276]);
});

test('a canonical ID takes precedence without querying legacy metadata', async () => {
  prisma.property.findFirst = async () => record();
  prisma.property.findMany = async () => assert.fail('No legacy lookup for an existing canonical ID');
  assert.equal((await getPublicPropertyById('current-property')).id, 'current-property');
});

test('an unknown or ambiguous legacy identity never chooses another property arbitrarily', async () => {
  prisma.property.findFirst = async () => null;
  prisma.property.findMany = async () => [];
  assert.equal(await getPublicPropertyById('707276'), null);
  prisma.property.findMany = async () => [record(), record({ id: 'different-property' })];
  assert.equal(await getPublicPropertyById('707276'), null);
  prisma.property.findMany = async () => assert.fail('Malformed IDs must not query legacy metadata');
  for (const invalid of ['707276/../../admin', '1 OR 1=1', '-1', '0']) {
    assert.equal(await getPublicPropertyById(invalid), null);
  }
});

test('redirect generation ignores foreign/invalid metadata and conflicting source IDs', () => {
  const redirects = buildLegacyPropertyRedirects([
    record(),
    record({ id: 'numeric-property', features: { source: 'buscadorprop', sourceId: 123456 } }),
    record({ id: 'not-owned', features: { source: 'other', sourceId: '543210' } }),
    record({ id: 'bad-url', features: { source: 'buscadorprop', sourceId: 'https://evil.example' } }),
    record({ id: 'conflict-1', features: { source: 'buscadorprop', sourceId: '999999' } }),
    record({ id: 'conflict-2', features: { source: 'buscadorprop', sourceId: '999999' } }),
  ]);
  assert.deepEqual(redirects, [
    { source: '/propiedad/123456', destination: 'https://latorrepropiedades.com/propiedad/numeric-property', type: 301 },
    { source: '/propiedad/707276', destination: 'https://latorrepropiedades.com/propiedad/current-property', type: 301 },
  ]);
  assert.equal(JSON.stringify(redirects).includes('sourceUrl'), false);
  for (const features of [null, [], { source: 'buscadorprop', sourceId: true }, { source: 'buscadorprop', sourceId: 1.5 }]) {
    assert.equal(getLegacyPropertyId(features), null);
  }
});

test('sitemap uses canonical domain, stable lastmod and escaped URL content', () => {
  const xml = buildPublicSitemap([{ id: 'a&b</loc>', updatedAt: '2026-11-07T00:00:00Z' }]);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  assert.match(xml, /https:\/\/latorrepropiedades\.com\/propiedad\/a%26b%3C%2Floc%3E/);
  assert.match(xml, /<lastmod>2026-11-07T00:00:00\.000Z<\/lastmod>/);
  assert.equal(escapeXml('&<>"\''), '&amp;&lt;&gt;&quot;&apos;');
  assert.equal((xml.match(/<url>/g) || []).length, 2);
  assert.equal(xml.includes('web.app'), false);
});

test('SEO services only query visible properties and select fields needed for each output', async () => {
  const calls = [];
  prisma.property.findMany = async (args) => {
    calls.push(args);
    return args.select.updatedAt
      ? [{ id: 'current-property', updatedAt: new Date('2026-11-07T00:00:00Z') }]
      : [record()];
  };
  const sitemap = await getPublicSitemap();
  const redirects = await getLegacyPropertyRedirects();
  assert.match(sitemap, /current-property/);
  assert.equal(redirects.length, 1);
  assert.deepEqual(calls[0].select, { id: true, updatedAt: true });
  assert.deepEqual(calls[1].select, { id: true, features: true });
  for (const args of calls) assert.deepEqual(args.where.status, { in: ['AVAILABLE', 'RESERVED'] });
});

test('the publishing export keeps origin metadata and private addresses out of properties', async () => {
  let query;
  prisma.property.findMany = async (args) => { query = args; return [record()]; };
  const exported = await getSeoExport();
  assert.deepEqual(query.where.status, { in: ['AVAILABLE', 'RESERVED'] });
  assert.equal(exported.properties[0].features, undefined);
  assert.equal(exported.properties[0].exactAddress, undefined);
  assert.equal(exported.properties[0].latitude, undefined);
  assert.equal(exported.properties[0].longitude, undefined);
  assert.equal(JSON.stringify(exported).includes('Dirección privada'), false);
  assert.equal(JSON.stringify(exported).includes('old.example'), false);
  assert.equal(exported.redirects[0].source, '/propiedad/707276');
});

test('SEO HTTP endpoints return XML/JSON with revalidation instead of the SPA fallback', async (t) => {
  const express = require('../node_modules/express');
  const { once } = require('node:events');
  const { default: seoRoutes, servePublicSitemap } = require('../dist/routes/seo.routes.js');
  prisma.property.findMany = async (args) => args.select.updatedAt
    ? [{ id: 'current-property', updatedAt: new Date('2026-11-07T00:00:00Z') }]
    : [record()];
  const app = express();
  app.use('/api', seoRoutes);
  app.get('/sitemap.xml', servePublicSitemap);
  app.use((_req, res) => res.status(404).send('fallback'));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const pathname of ['/sitemap.xml', '/api/sitemap.xml']) {
    const response = await fetch(base + pathname);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^application\/xml; charset=utf-8$/);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
    assert.match(await response.text(), /<urlset/);
  }
  const response = await fetch(base + '/api/seo/redirects');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(Object.keys(body), ['redirects']);
  assert.deepEqual(body.redirects[0], {
    source: '/propiedad/707276',
    destination: 'https://latorrepropiedades.com/propiedad/current-property',
    type: 301,
  });
});
