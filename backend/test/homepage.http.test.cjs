// Run after `npm run build`: node test/homepage.http.test.cjs
// The actual Express app is exercised over loopback; Prisma is stubbed before requests.
const assert = require('node:assert/strict');
const { test } = require('node:test');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/unused';
process.env.JWT_SECRET = 'homepage-http-test-key-used-only-for-local-tests';

const { prisma } = require('../dist/lib/prisma');
const { app } = require('../dist/app');
const { signAdminToken } = require('../dist/utils/jwt');
const image = (id) => ({ url: `https://photos.example/${id}.webp`, width: 1600, height: 900, order: 0, isMain: true });
const reference = (entry) => ({ propertyId: entry.id, imageUrl: entry.images[0].url });

test('homepage HTTP authentication, persistence and public status filtering', async (t) => {
  const inventory = ['A', 'B', 'C', 'D', 'E'].map((id) => ({ id, code: id, location: 'Brandsen', status: 'AVAILABLE', propertyType: 'HOUSE', featured: false, images: [image(id)] }));
  const originalFind = prisma.property.findMany;
  const originalRead = prisma.homepageSettings.findUnique;
  const originalWrite = prisma.homepageSettings.upsert;
  let stored = null;
  let queryCount = 0;
  let writes = 0;
  prisma.property.findMany = async () => { queryCount += 1; return inventory; };
  prisma.homepageSettings.findUnique = async () => { queryCount += 1; return stored; };
  prisma.homepageSettings.upsert = async ({ update }) => { writes += 1; stored = { selection: update.selection }; return stored; };
  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.once('error', reject);
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const token = signAdminToken({ sub: 'test-agent', name: 'Test Agent', email: 'test@example.test', role: 'AGENT' });
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const selection = [inventory[3], inventory[1], inventory[4], inventory[0]].map(reference);
  try {
    await t.test('administration rejects missing and invalid auth before querying data', async () => {
      for (const method of ['GET', 'PUT']) {
        const response = await fetch(`${base}/admin/homepage`, { method });
        assert.equal(response.status, 401);
      }
      const invalid = await fetch(`${base}/admin/homepage`, { headers: { Authorization: 'Bearer invalid' } });
      assert.equal(invalid.status, 401);
      assert.equal(queryCount, 0);
      assert.equal(writes, 0);
    });

    await t.test('public defaults are accessible without auth and contain only slide data', async () => {
      const response = await fetch(`${base}/homepage`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const data = await response.json();
      assert.deepEqual(Object.keys(data), ['slides']);
      assert.equal(data.slides.length, 4);
      assert.deepEqual(Object.keys(data.slides[0]).sort(), ['image', 'location', 'propertyCode', 'propertyId']);
      assert.equal(writes, 0);
    });

    await t.test('authenticated settings expose defaults before an explicit save', async () => {
      const response = await fetch(`${base}/admin/homepage`, { headers });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.selection, null);
      assert.equal(data.slides.length, 4);
    });

    await t.test('authenticated save persists ordering and a later public read uses it', async () => {
      const response = await fetch(`${base}/admin/homepage`, { method: 'PUT', headers, body: JSON.stringify({ selection }) });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.deepEqual(data.selection, selection);
      assert.deepEqual(data.slides.map((slide) => slide.propertyId), ['D', 'B', 'E', 'A']);
      const publicResponse = await fetch(`${base}/homepage`);
      assert.deepEqual((await publicResponse.json()).slides.map((slide) => slide.propertyId), ['D', 'B', 'E', 'A']);
      assert.equal(writes, 1);
    });

    await t.test('hidden properties disappear from saved references and get a real fallback', async () => {
      inventory[3].status = 'HIDDEN';
      const response = await fetch(`${base}/homepage`);
      assert.equal(response.status, 200);
      const { slides } = await response.json();
      assert.equal(slides.length, 4);
      assert.deepEqual(slides.map((slide) => slide.propertyId), ['C', 'B', 'E', 'A']);
      assert.ok(slides.every((slide) => slide.propertyId !== 'D'));
      assert.equal(writes, 1);
    });

    await t.test('incomplete, duplicate, unpublished and unknown photos are rejected without altering settings', async () => {
      const invalidSelections = [
        selection.slice(0, 3),
        Array(4).fill(selection[0]),
        selection,
        [reference(inventory[0]), reference(inventory[1]), reference(inventory[2]), { propertyId: 'E', imageUrl: 'https://photos.example/unknown.webp' }],
      ];
      for (const invalidSelection of invalidSelections) {
        const response = await fetch(`${base}/admin/homepage`, { method: 'PUT', headers, body: JSON.stringify({ selection: invalidSelection }) });
        assert.equal(response.status, 400);
      }
      assert.equal(writes, 1);
      assert.deepEqual(stored.selection, selection);
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    prisma.property.findMany = originalFind;
    prisma.homepageSettings.findUnique = originalRead;
    prisma.homepageSettings.upsert = originalWrite;
    await prisma.$disconnect();
  }
});
