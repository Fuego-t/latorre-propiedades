// Run after `npm run build`: node --test test/homepage.test.cjs
// Database methods are replaced below; these tests never connect to a database.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { prisma } = require('../dist/lib/prisma');
const { resolveHomepageSlides, getHomepageSettings, saveHomepageSettings } = require('../dist/services/homepage.service');
const { homepageInputSchema } = require('../dist/validators/homepage.schema');

const image = (name, extra = {}) => ({ url: `https://photos.example/${name}.webp`, order: 0, isMain: true, width: 1600, height: 900, ...extra });
const property = (id, extra = {}) => ({ id, code: id, status: 'AVAILABLE', location: 'Brandsen', propertyType: 'HOUSE', featured: false, images: [image(id)], ...extra });
const reference = (entry) => ({ propertyId: entry.id, imageUrl: entry.images[0].url });
const inventory = [property('A'), property('B'), property('C'), property('D'), property('E')];

test('automatic selection prefers the original cover and four distinct published properties', () => {
  const properties = [
    ...inventory,
    property('original', { code: 'LP-2609-N1AP' }),
    property('hidden', { status: 'HIDDEN', featured: true }),
    property('sold', { status: 'SOLD' }),
  ];
  const slides = resolveHomepageSlides(properties, null);
  assert.equal(slides.length, 4);
  assert.equal(slides[0].propertyCode, 'LP-2609-N1AP');
  assert.equal(new Set(slides.map((slide) => slide.propertyId)).size, 4);
  assert.ok(slides.every((slide) => !['hidden', 'sold'].includes(slide.propertyId)));
  assert.deepEqual(Object.keys(slides[0]).sort(), ['image', 'location', 'propertyCode', 'propertyId']);
});

test('saved ordering survives a deleted image and fallback does not repeat another saved photo', () => {
  const selection = [reference(inventory[3]), { propertyId: 'missing', imageUrl: image('missing').url }, reference(inventory[0]), reference(inventory[2])];
  const slides = resolveHomepageSlides(inventory, selection);
  assert.deepEqual(slides.map((slide) => slide.propertyId), ['D', 'B', 'A', 'C']);
  assert.equal(new Set(slides.map((slide) => slide.image.url)).size, 4);
});

test('small catalogs use additional real photos and gracefully handle fewer than four photos', () => {
  const one = property('A', { images: [image('A'), image('A2', { isMain: false, order: 1 }), image('A3', { isMain: false, order: 2 })] });
  const two = property('B');
  assert.deepEqual(resolveHomepageSlides([one, two], null).map((slide) => slide.image.url), [image('A').url, image('B').url, image('A2').url, image('A3').url]);
  assert.equal(resolveHomepageSlides([one], null).length, 3);
  assert.deepEqual(resolveHomepageSlides([], null), []);
});

test('input rejects incomplete and duplicate selections', () => {
  assert.equal(homepageInputSchema.safeParse({ selection: inventory.slice(0, 3).map(reference) }).success, false);
  assert.equal(homepageInputSchema.safeParse({ selection: Array(4).fill(reference(inventory[0])) }).success, false);
  assert.equal(homepageInputSchema.safeParse({ selection: inventory.slice(0, 4).map(reference) }).success, true);
});

test('reads are side effect free and failed saves preserve durable selection', async () => {
  const originalFind = prisma.property.findMany;
  const originalRead = prisma.homepageSettings.findUnique;
  const originalWrite = prisma.homepageSettings.upsert;
  let stored = null;
  const writes = [];
  const queries = [];
  prisma.property.findMany = async (query) => { queries.push(query); return inventory; };
  prisma.homepageSettings.findUnique = async () => stored;
  prisma.homepageSettings.upsert = async (input) => { writes.push(input); stored = { selection: input.update.selection }; return stored; };
  try {
    const initial = await getHomepageSettings();
    assert.equal(initial.selection, null);
    assert.equal(initial.slides.length, 4);
    assert.equal(writes.length, 0);
    const selection = [inventory[3], inventory[1], inventory[4], inventory[0]].map(reference);
    const saved = await saveHomepageSettings({ selection });
    assert.deepEqual(saved.selection, selection);
    assert.deepEqual(saved.slides.map((slide) => slide.propertyId), ['D', 'B', 'E', 'A']);
    assert.equal(writes.length, 1);
    assert.deepEqual((await getHomepageSettings()).selection, selection);

    await assert.rejects(saveHomepageSettings({ selection: [reference(inventory[0])] }));
    await assert.rejects(saveHomepageSettings({ selection: [reference(inventory[0]), reference(inventory[1]), reference(inventory[2]), { propertyId: 'A', imageUrl: 'https://photos.example/not-an-actual-photo.webp' }] }), /ya no está disponible/);
    assert.equal(writes.length, 1);
    assert.deepEqual(stored.selection, selection);
    assert.ok(queries.every((query) => JSON.stringify(query.where) === JSON.stringify({ status: { in: ['AVAILABLE', 'RESERVED'] } })));
    assert.ok(queries.every((query) => !query.select.exactAddress && !query.select.latitude && !query.select.longitude));
  } finally {
    prisma.property.findMany = originalFind;
    prisma.homepageSettings.findUnique = originalRead;
    prisma.homepageSettings.upsert = originalWrite;
    await prisma.$disconnect();
  }
});
