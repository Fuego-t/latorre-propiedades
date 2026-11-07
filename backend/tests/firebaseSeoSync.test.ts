import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, verify } from 'node:crypto';
import { test } from 'node:test';
import { gunzipSync } from 'node:zlib';
import {
  configureSeoSync,
  FirebaseSeoPublishError,
  getSeoSyncStatus,
  publishFirebaseSeo,
  queueSeoSync,
  startSeoSyncWorker,
  syncSeoNow,
  type FirebaseSeoContent,
  type SeoPublishStateRow,
  type SeoStateStore,
} from '../src/services/firebaseSeoSync.service';

const SITE = 'latorre-propiedades';
const BASE = `sites/${SITE}/versions/base-version`;
const NEXT = `sites/${SITE}/versions/seo-version`;
const content: FirebaseSeoContent = {
  files: {
    '/index.html': '<html>Portada actualizada</html>',
    '/propiedad/public-id/index.html': '<html>Casa pública</html>',
    '/sitemap.xml': '<urlset>Publicaciones</urlset>',
    '/robots.txt': 'User-agent: *\nAllow: /\n',
    '/casas-en-venta-en-brandsen/index.html': '<html>Casas en venta en Brandsen</html>',
  },
  redirects: [{ source: '/propiedad/707276', destination: 'https://latorrepropiedades.com/propiedad/public-id', type: 301 }],
};

interface FakeOptions {
  changedRelease?: boolean;
  maliciousUpload?: boolean;
  failUpload?: boolean;
  onRelease?: () => Promise<void>;
  filePages?: Array<{ files: Array<{ path: string }>; nextPageToken?: string }>;
}

function firebaseFixture(options: FakeOptions = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let lists = 0;
  let populated: Record<string, string> = {};
  let patched: Record<string, unknown> | undefined;
  let filePage = 0;
  const uploads: Buffer[] = [];
  const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
  const fetchImpl = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.endsWith(`/sites/${SITE}/releases?pageSize=1`)) {
      lists++;
      return response({ releases: [{ version: { name: options.changedRelease && lists > 1 ? `sites/${SITE}/versions/other-deploy` : BASE } }] });
    }
    if (url.endsWith(`/${BASE}`)) return response({
      name: BASE,
      config: {
        cleanUrls: true,
        rewrites: [{ glob: '/admin/**', path: '/index.html' }],
        redirects: [
          { glob: '/propiedad/123', location: '/propiedad/old-hidden-id', statusCode: 301 },
          { glob: '/externo', location: 'https://example.com/', statusCode: 302 },
        ],
        headers: [{ glob: '/admin', headers: { 'X-Frame-Options': 'SAMEORIGIN' } }],
      },
    });
    if (url.includes(`/${BASE}/files?`)) {
      return response(options.filePages?.[filePage++] ?? { files: [{ path: '/assets/current-app.js' }] });
    }
    if (url.endsWith('/versions:clone')) {
      const body = JSON.parse(String(init.body));
      assert.equal(body.sourceVersion, BASE);
      assert.equal(body.finalize, false);
      assert.ok(body.exclude.regexes.some((pattern: string) => new RegExp(pattern).test('/propiedad/old-hidden-id/index.html')));
      assert.ok(body.exclude.regexes.every((pattern: string) => !new RegExp(pattern).test('/assets/current-app.js')));
      return response({ done: true, response: { name: NEXT } });
    }
    if (url.endsWith(':populateFiles')) {
      populated = JSON.parse(String(init.body)).files;
      return response({
        uploadRequiredHashes: [...new Set(Object.values(populated))],
        uploadUrl: options.maliciousUpload ? 'https://untrusted.example/upload' : `https://upload-firebasehosting.googleapis.com/upload/${NEXT}/files`,
      });
    }
    if (url.startsWith('https://upload-firebasehosting.googleapis.com/')) {
      const body = Buffer.from(init.body as Uint8Array);
      assert.equal(createHash('sha256').update(body).digest('hex'), url.split('/').at(-1));
      uploads.push(body);
      return new Response(null, { status: options.failUpload ? 500 : 200 });
    }
    if (url.includes('?updateMask=')) {
      patched = JSON.parse(String(init.body));
      return response({ name: NEXT, status: 'FINALIZED' });
    }
    if (url.includes('/releases?versionName=')) {
      await options.onRelease?.();
      return response({ name: `sites/${SITE}/releases/new-release`, version: { name: NEXT } });
    }
    throw new Error(`Unexpected mock request: ${url}`);
  }) as typeof fetch;
  return { fetchImpl, calls, uploads, populated: () => populated, patched: () => patched };
}

test('publishes gzipped/hash-verified SEO files, preserves application config and drops stale legacy redirects', async () => {
  const fixture = firebaseFixture();
  const result = await publishFirebaseSeo({ siteId: SITE, accessToken: 'test-token', content, fetchImpl: fixture.fetchImpl });
  assert.equal(result.previousVersionName, BASE);
  assert.equal(result.versionName, NEXT);
  assert.equal(fixture.uploads.length, Object.keys(content.files).length);
  assert.deepEqual(new Set(fixture.uploads.map((data) => gunzipSync(data).toString())), new Set(Object.values(content.files)));
  const config = fixture.patched()!.config as Record<string, unknown>;
  assert.equal(config.cleanUrls, true);
  assert.deepEqual(config.rewrites, [{ glob: '/admin/**', path: '/index.html' }]);
  const redirects = config.redirects as Array<Record<string, unknown>>;
  assert.ok(redirects.some((rule) => rule.glob === '/propiedad/707276' && rule.location === '/propiedad/public-id'));
  assert.ok(redirects.some((rule) => rule.glob === '/externo'));
  assert.ok(!redirects.some((rule) => rule.glob === '/propiedad/123'));
  const headers = config.headers as Array<{ glob: string; headers: Record<string, string> }>;
  assert.equal(headers.find((rule) => rule.glob === '/admin')?.headers['X-Robots-Tag'], 'noindex, nofollow, noarchive');
  assert.equal(headers.find((rule) => rule.glob === '/admin')?.headers['X-Frame-Options'], 'SAMEORIGIN');
});

test('does not overwrite another deployment that became active while generating SEO', async () => {
  const fixture = firebaseFixture({ changedRelease: true });
  await assert.rejects(
    publishFirebaseSeo({ siteId: SITE, accessToken: 'test-token', content, fetchImpl: fixture.fetchImpl }),
    (error: unknown) => error instanceof FirebaseSeoPublishError && error.code === 'FIREBASE_RELEASE_CHANGED_RETRY',
  );
  assert.ok(!fixture.calls.some((call) => call.url.includes('/releases?versionName=')));
});

test('refuses a stale HTML template when its bundle is missing from the active release', async () => {
  const fixture = firebaseFixture();
  await assert.rejects(publishFirebaseSeo({
    siteId: SITE, accessToken: 'test-token', fetchImpl: fixture.fetchImpl,
    content: { ...content, files: { ...content.files, '/index.html': '<script src="/assets/old-app.js"></script>' } },
  }), (error: unknown) => error instanceof FirebaseSeoPublishError && error.code === 'FIREBASE_TEMPLATE_CHANGED_RETRY');
  assert.ok(!fixture.calls.some((call) => call.url.endsWith('/versions:clone')));
});

test('validates template bundles across every page of active Firebase files', async () => {
  const fixture = firebaseFixture({ filePages: [
    { files: [{ path: '/assets/style.css' }], nextPageToken: 'second-page' },
    { files: [{ path: '/assets/current-app.js' }] },
  ] });
  const result = await publishFirebaseSeo({
    siteId: SITE, accessToken: 'test-token', fetchImpl: fixture.fetchImpl,
    content: { ...content, files: { ...content.files, '/index.html': '<script src="/assets/current-app.js"></script><link href="/assets/style.css" rel="stylesheet">' } },
  });
  assert.equal(result.versionName, NEXT);
  assert.equal(fixture.calls.filter((call) => call.url.includes(`/${BASE}/files?`)).length, 2);
});

test('rejects redirects to a different origin without publishing a version', async () => {
  const fixture = firebaseFixture();
  await assert.rejects(publishFirebaseSeo({
    siteId: SITE, accessToken: 'test-token', fetchImpl: fixture.fetchImpl,
    content: { ...content, redirects: [{ source: '/propiedad/707276', destination: 'https://untrusted.example/property', type: 301 }] },
  }), (error: unknown) => error instanceof FirebaseSeoPublishError && error.code === 'INVALID_SEO_REDIRECT');
  assert.ok(!fixture.calls.some((call) => call.url.includes('/releases?versionName=')));
});

test('never sends a deployment credential to an upload host supplied by an untrusted response', async () => {
  const fixture = firebaseFixture({ maliciousUpload: true });
  await assert.rejects(
    publishFirebaseSeo({ siteId: SITE, accessToken: 'test-token', content, fetchImpl: fixture.fetchImpl }),
    (error: unknown) => error instanceof FirebaseSeoPublishError && error.code === 'INVALID_FIREBASE_UPLOAD_URL',
  );
  assert.ok(fixture.calls.every((call) => !call.url.includes('untrusted.example')));
});

test('does not release a version if one of its required files fails to upload', async () => {
  const fixture = firebaseFixture({ failUpload: true });
  await assert.rejects(publishFirebaseSeo({ siteId: SITE, accessToken: 'test-token', content, fetchImpl: fixture.fetchImpl }));
  assert.ok(!fixture.calls.some((call) => call.url.includes('/releases?versionName=')));
});

test('rejects paths outside the public SEO export before any network request', async () => {
  const fixture = firebaseFixture();
  await assert.rejects(publishFirebaseSeo({
    siteId: SITE, accessToken: 'test-token',
    content: { files: { '/admin/private.html': 'private' }, redirects: [] },
    fetchImpl: fixture.fetchImpl,
  }));
  assert.equal(fixture.calls.length, 0);
});

function memoryStore(initial?: Partial<SeoPublishStateRow>) {
  let row: SeoPublishStateRow | null = initial ? {
    id: 'seo', requestedRevision: 1, publishedRevision: 0,
    leaseUntil: null, leaseToken: null, lastError: null, updatedAt: new Date(), ...initial,
  } : null;
  const store: SeoStateStore = {
    async upsert({ create, update }) {
      if (!row) row = { id: create.id, requestedRevision: create.requestedRevision, publishedRevision: create.publishedRevision ?? 0,
        leaseUntil: null, leaseToken: null, lastError: null, updatedAt: new Date() };
      else {
        if (update.requestedRevision) row.requestedRevision += update.requestedRevision.increment;
        if (update.lastError !== undefined) row.lastError = update.lastError;
      }
      return { ...row };
    },
    async findUnique() { return row ? { ...row } : null; },
    async updateMany({ where, data }) {
      if (!row || (where.leaseToken !== undefined && row.leaseToken !== where.leaseToken)
        || (where.requestedRevision !== undefined && row.requestedRevision !== where.requestedRevision)
        || (where.publishedRevision !== undefined && row.publishedRevision !== where.publishedRevision)
        || (where.leaseUntil?.gt && (!row.leaseUntil || row.leaseUntil <= where.leaseUntil.gt))
        || (where.OR && !where.OR.some((term) => term.leaseUntil === null ? row!.leaseUntil === null
          : Boolean(row!.leaseUntil && row!.leaseUntil < term.leaseUntil.lt)))) return { count: 0 };
      if (data.requestedRevision) row.requestedRevision += data.requestedRevision.increment;
      if (data.publishedRevision !== undefined) row.publishedRevision = data.publishedRevision;
      if (data.leaseUntil !== undefined) row.leaseUntil = data.leaseUntil;
      if (data.leaseToken !== undefined) row.leaseToken = data.leaseToken;
      if (data.lastError !== undefined) row.lastError = data.lastError;
      row.updatedAt = new Date();
      return { count: 1 };
    },
  };
  return { store, current: () => row };
}

test('a missing deployment credential preserves a queued revision and reports configuration required', async () => {
  const previous = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const memory = memoryStore();
  configureSeoSync({ loadContent: async () => content, store: memory.store });
  const stop = startSeoSyncWorker();
  try {
    assert.equal(await queueSeoSync(), true);
    assert.equal(await syncSeoNow(), false);
    assert.equal(memory.current()?.requestedRevision, 1);
    assert.equal(memory.current()?.publishedRevision, 0);
    assert.equal((await getSeoSyncStatus()).lastError, 'CONFIG_REQUIRED');
  } finally {
    stop();
    if (previous === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    else process.env.FIREBASE_SERVICE_ACCOUNT_JSON = previous;
  }
});

test('the worker acknowledges only the revision actually released, retaining edits made during release', async () => {
  const memory = memoryStore({ requestedRevision: 3, publishedRevision: 1 });
  const fixture = firebaseFixture({ onRelease: async () => {
    await memory.store.upsert({ where: { id: 'seo' }, create: { id: 'seo', requestedRevision: 4 }, update: { requestedRevision: { increment: 1 } } });
  } });
  configureSeoSync({ loadContent: async () => content, store: memory.store, fetchImpl: fixture.fetchImpl, getAccessToken: async () => 'test-token' });
  const stop = startSeoSyncWorker();
  try {
    assert.equal(await syncSeoNow(), true);
    assert.equal(memory.current()?.publishedRevision, 3);
    assert.equal(memory.current()?.requestedRevision, 4);
    assert.equal(memory.current()?.leaseToken, null);
    assert.equal((await getSeoSyncStatus()).pending, true);
  } finally { stop(); }
});

test('an edit arriving while loading content prevents release of the stale snapshot', async () => {
  const memory = memoryStore({ requestedRevision: 2 });
  const fixture = firebaseFixture();
  configureSeoSync({
    store: memory.store, fetchImpl: fixture.fetchImpl, getAccessToken: async () => 'test-token',
    loadContent: async () => {
      await memory.store.upsert({ where: { id: 'seo' }, create: { id: 'seo', requestedRevision: 3 }, update: { requestedRevision: { increment: 1 } } });
      return content;
    },
  });
  const stop = startSeoSyncWorker();
  try {
    assert.equal(await syncSeoNow(), false);
    assert.equal(memory.current()?.publishedRevision, 0);
    assert.equal(memory.current()?.requestedRevision, 3);
    assert.equal(memory.current()?.lastError, 'SEO_SNAPSHOT_CHANGED_RETRY');
    assert.ok(!fixture.calls.some((call) => call.url.includes('/releases?versionName=')));
  } finally { stop(); }
});

test('an unexpired lease owned by another instance prevents a second publisher', async () => {
  const memory = memoryStore({ leaseToken: 'another-worker', leaseUntil: new Date(Date.now() + 60_000) });
  const fixture = firebaseFixture();
  configureSeoSync({ loadContent: async () => content, store: memory.store, fetchImpl: fixture.fetchImpl, getAccessToken: async () => 'test-token' });
  assert.equal(await syncSeoNow(), false);
  assert.equal(fixture.calls.length, 0);
  assert.equal(memory.current()?.leaseToken, 'another-worker');
});

test('service-account authentication signs a scoped RS256 assertion and uses only the fixed Google token endpoint', async () => {
  const previousAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const previousProject = process.env.FIREBASE_PROJECT_ID;
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  process.env.FIREBASE_PROJECT_ID = 'latorre-world';
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    type: 'service_account', project_id: 'latorre-world',
    client_email: 'seo-test@latorre-world.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    token_uri: 'https://oauth2.googleapis.com/token',
  });
  const memory = memoryStore({ requestedRevision: 1 });
  const fixture = firebaseFixture();
  let tokenRequests = 0;
  const fetchImpl = (async (input: string | URL | Request, init: RequestInit = {}) => {
    if (String(input) !== 'https://oauth2.googleapis.com/token') return fixture.fetchImpl(input, init);
    tokenRequests++;
    assert.equal(init.redirect, 'error');
    const form = new URLSearchParams(String(init.body));
    assert.equal(form.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    const assertion = form.get('assertion')!;
    const [header, payload, signature] = assertion.split('.');
    assert.equal(JSON.parse(Buffer.from(header, 'base64url').toString()).alg, 'RS256');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    assert.equal(claims.aud, 'https://oauth2.googleapis.com/token');
    assert.equal(claims.scope, 'https://www.googleapis.com/auth/firebase.hosting');
    assert.equal(claims.exp - claims.iat, 3600);
    assert.equal(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, 'base64url')), true);
    return new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 });
  }) as typeof fetch;
  configureSeoSync({ loadContent: async () => content, store: memory.store, fetchImpl });
  try {
    assert.equal(await syncSeoNow(), true);
    assert.equal(tokenRequests, 1);
    assert.equal(memory.current()?.publishedRevision, 1);
  } finally {
    if (previousAccount === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    else process.env.FIREBASE_SERVICE_ACCOUNT_JSON = previousAccount;
    if (previousProject === undefined) delete process.env.FIREBASE_PROJECT_ID;
    else process.env.FIREBASE_PROJECT_ID = previousProject;
  }
});

test('an account JSON cannot redirect its private JWT assertion to a different token host', async () => {
  const previousAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const previousProject = process.env.FIREBASE_PROJECT_ID;
  process.env.FIREBASE_PROJECT_ID = 'latorre-world';
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    type: 'service_account', project_id: 'latorre-world',
    client_email: 'seo-test@latorre-world.iam.gserviceaccount.com',
    private_key: 'not-used', token_uri: 'https://untrusted.example/token',
  });
  const memory = memoryStore({ requestedRevision: 1 });
  const fixture = firebaseFixture();
  configureSeoSync({ loadContent: async () => content, store: memory.store, fetchImpl: fixture.fetchImpl });
  try {
    assert.equal(await syncSeoNow(), false);
    assert.equal(fixture.calls.length, 0);
    assert.equal(memory.current()?.lastError, 'INVALID_FIREBASE_SERVICE_ACCOUNT');
    assert.equal(memory.current()?.publishedRevision, 0);
  } finally {
    if (previousAccount === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    else process.env.FIREBASE_SERVICE_ACCOUNT_JSON = previousAccount;
    if (previousProject === undefined) delete process.env.FIREBASE_PROJECT_ID;
    else process.env.FIREBASE_PROJECT_ID = previousProject;
  }
});
