const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const events = [];
let failQueue = false;
const transaction = {
  property: { update: async () => { events.push('property'); return { id: 'public-id' }; } },
  seoPublishState: { upsert: async () => { events.push('queue'); if (failQueue) throw new Error('queue unavailable'); } },
};
const prisma = { $transaction: async action => {
  events.push('begin');
  try { const result = await action(transaction); events.push('commit'); return result; }
  catch (error) { events.push('rollback'); throw error; }
} };
const original = Module._load;
Module._load = function(request, parent, ...rest) {
  if (parent?.filename.endsWith('seoMutation.service.js')) {
    if (request === '../lib/prisma') return { prisma };
    if (request === './firebaseSeoSync.service') return { wakeSeoSync: () => events.push('wake') };
  }
  return original.call(this, request, parent, ...rest);
};
const { withSeoPublication } = require('../dist/services/seoMutation.service.js');
Module._load = original;
test('el trabajo SEO se confirma junto con la propiedad y se despierta después del commit', async () => {
  events.length = 0;
  const value = await withSeoPublication(tx => tx.property.update());
  assert.equal(value.id, 'public-id');
  assert.deepEqual(events, ['begin', 'property', 'queue', 'commit', 'wake']);
});
test('un fallo de cola revierte la operación y no despierta una publicación inexistente', async () => {
  events.length = 0;
  failQueue = true;
  await assert.rejects(() => withSeoPublication(tx => tx.property.update()), /queue unavailable/);
  assert.deepEqual(events, ['begin', 'property', 'queue', 'rollback']);
});
