import { createHash, createPrivateKey, randomUUID, sign } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { prisma } from '../lib/prisma';

const HOSTING_API = 'https://firebasehosting.googleapis.com/v1beta1';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DEFAULT_SITE = 'latorre-propiedades';
const DEFAULT_PROJECT = 'latorre-world';
const CANONICAL_ORIGIN = 'https://latorrepropiedades.com';
const LEASE_MS = 120_000;
const GENERATED_PATHS = new Set([
  '/index.html', '/sitemap.xml', '/robots.txt', '/404.html',
  '/casas-en-venta-en-brandsen/index.html',
]);
const CLONE_EXCLUSIONS = [
  '^/propiedad/.*$', '^/index\\.html$', '^/sitemap\\.xml$', '^/robots\\.txt$',
  '^/casas-en-venta-en-brandsen(?:/.*)?$',
];

export interface SeoRedirect {
  source?: string;
  destination?: string;
  type?: number;
  glob?: string;
  regex?: string;
  location?: string;
  statusCode?: number;
}

export interface FirebaseSeoContent {
  files: Record<string, string>;
  redirects: SeoRedirect[];
}

type FetchImpl = typeof fetch;
type JsonObject = Record<string, unknown>;

export class FirebaseSeoPublishError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'FirebaseSeoPublishError';
  }
}

function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new FirebaseSeoPublishError('INVALID_FIREBASE_RESPONSE');
  }
  return value as JsonObject;
}

function versionName(value: unknown, siteId: string): string {
  if (typeof value !== 'string' || !new RegExp(`^(?:projects/[A-Za-z0-9_-]+/)?sites/${siteId}/versions/[A-Za-z0-9_-]+$`).test(value)) {
    throw new FirebaseSeoPublishError('INVALID_FIREBASE_VERSION');
  }
  return value;
}

function validateSite(siteId: string) {
  if (!/^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/.test(siteId)) {
    throw new FirebaseSeoPublishError('INVALID_FIREBASE_SITE');
  }
}

async function firebaseJson(
  fetchImpl: FetchImpl,
  accessToken: string,
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<JsonObject> {
  const response = await fetchImpl(`${HOSTING_API}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new FirebaseSeoPublishError(`FIREBASE_HTTP_${response.status}`);
  return object(await response.json());
}

async function latestVersion(fetchImpl: FetchImpl, accessToken: string, siteId: string) {
  const result = await firebaseJson(fetchImpl, accessToken, `sites/${siteId}/releases?pageSize=1`);
  if (!Array.isArray(result.releases) || !result.releases.length) {
    throw new FirebaseSeoPublishError('NO_ACTIVE_FIREBASE_RELEASE');
  }
  const release = object(result.releases[0]);
  const version = object(release.version);
  return versionName(version.name, siteId);
}

function normalizedRedirect(redirect: SeoRedirect): JsonObject {
  const source = redirect.source ?? redirect.glob;
  const destination = redirect.destination ?? redirect.location;
  const status = redirect.type ?? redirect.statusCode ?? 301;
  if (!source?.startsWith('/') || !destination || ![301, 302].includes(status)) {
    throw new FirebaseSeoPublishError('INVALID_SEO_REDIRECT');
  }
  let target: URL;
  try { target = new URL(destination, CANONICAL_ORIGIN); }
  catch { throw new FirebaseSeoPublishError('INVALID_SEO_REDIRECT'); }
  if ((!destination.startsWith('/') && !destination.startsWith('https://'))
    || target.origin !== CANONICAL_ORIGIN || target.username || target.password) {
    throw new FirebaseSeoPublishError('INVALID_SEO_REDIRECT');
  }
  return { glob: source, location: `${target.pathname}${target.search}${target.hash}`, statusCode: status };
}

function withSeoConfig(config: JsonObject, redirects: SeoRedirect[]): JsonObject {
  const nextRedirects = redirects.map(normalizedRedirect);
  const sources = new Set(nextRedirects.map((rule) => rule.glob));
  const oldRedirects = Array.isArray(config.redirects) ? config.redirects.map(object) : [];
  const preservedRedirects = oldRedirects.filter((rule) => {
    const source = rule.glob ?? rule.source;
    return !(typeof source === 'string' && (/^\/propiedad\/\d+\/?$/.test(source) || sources.has(source)));
  });
  const headers = Array.isArray(config.headers) ? config.headers.map((rule) => ({ ...object(rule) })) : [];
  const mergeHeader = (glob: string, values: Record<string, string>) => {
    const index = headers.findIndex((rule) => rule.glob === glob);
    if (index < 0) headers.push({ glob, headers: values });
    else headers[index] = { ...headers[index], headers: { ...object(headers[index].headers ?? {}), ...values } };
  };
  mergeHeader('/admin', { 'X-Robots-Tag': 'noindex, nofollow, noarchive' });
  mergeHeader('/admin/**', { 'X-Robots-Tag': 'noindex, nofollow, noarchive' });
  mergeHeader('/', { 'Cache-Control': 'no-cache' });
  mergeHeader('/casas-en-venta-en-brandsen{,/**}', { 'Cache-Control': 'no-cache' });
  mergeHeader('/propiedad/**', { 'Cache-Control': 'no-store' });
  mergeHeader('/sitemap.xml', { 'Cache-Control': 'no-cache', 'Content-Type': 'application/xml; charset=utf-8' });
  mergeHeader('/robots.txt', { 'Cache-Control': 'no-cache', 'Content-Type': 'text/plain; charset=utf-8' });
  return { ...config, redirects: [...nextRedirects, ...preservedRedirects], headers };
}

async function assertTemplateAssets(
  fetchImpl: FetchImpl,
  accessToken: string,
  baseVersion: string,
  files: Record<string, string>,
) {
  const references = new Set<string>();
  for (const [path, html] of Object.entries(files)) {
    if (!path.endsWith('.html')) continue;
    for (const match of html.matchAll(/\b(?:src|href)\s*=\s*(['"])([^'"]+)\1/gi)) {
      let asset: URL;
      try { asset = new URL(match[2], CANONICAL_ORIGIN); } catch { continue; }
      if (asset.origin === CANONICAL_ORIGIN && asset.pathname.startsWith('/assets/')) references.add(asset.pathname);
    }
  }
  if (!references.size) return;
  const available = new Set<string>();
  let pageToken: string | undefined;
  const visitedTokens = new Set<string>();
  do {
    const query = new URLSearchParams({ pageSize: '1000', ...(pageToken ? { pageToken } : {}) });
    const page = await firebaseJson(fetchImpl, accessToken, `${baseVersion}/files?${query}`);
    if (!Array.isArray(page.files)) throw new FirebaseSeoPublishError('INVALID_FIREBASE_FILE_LIST');
    for (const raw of page.files) {
      const file = object(raw);
      if (typeof file.path === 'string') available.add(file.path);
    }
    if (page.nextPageToken !== undefined && typeof page.nextPageToken !== 'string') {
      throw new FirebaseSeoPublishError('INVALID_FIREBASE_FILE_LIST');
    }
    pageToken = page.nextPageToken as string | undefined;
    if (pageToken) {
      if (visitedTokens.has(pageToken)) throw new FirebaseSeoPublishError('INVALID_FIREBASE_FILE_LIST');
      visitedTokens.add(pageToken);
    }
  } while (pageToken);
  if ([...references].some((path) => !available.has(path))) {
    throw new FirebaseSeoPublishError('FIREBASE_TEMPLATE_CHANGED_RETRY');
  }
}

/** Publishes a complete public SEO snapshot, retaining the active application's assets. */
export async function publishFirebaseSeo({
  siteId,
  accessToken,
  content,
  fetchImpl = fetch,
  beforeRelease,
}: {
  siteId: string;
  accessToken: string;
  content: FirebaseSeoContent;
  fetchImpl?: FetchImpl;
  beforeRelease?: () => Promise<void>;
}): Promise<{ versionName: string; previousVersionName: string; releaseName: string | null }> {
  validateSite(siteId);
  if (!accessToken || !content || !Object.keys(content.files).length) {
    throw new FirebaseSeoPublishError('INVALID_SEO_PUBLICATION');
  }
  if (!['/index.html', '/sitemap.xml', '/robots.txt', '/casas-en-venta-en-brandsen/index.html']
    .every((path) => typeof content.files[path] === 'string' && content.files[path].length > 0)
    || !Array.isArray(content.redirects)) throw new FirebaseSeoPublishError('INCOMPLETE_SEO_SNAPSHOT');
  const compressedFiles = new Map<string, Buffer>();
  const fileHashes: Record<string, string> = {};
  for (const [path, source] of Object.entries(content.files)) {
    if (!(GENERATED_PATHS.has(path) || /^\/propiedad\/[A-Za-z0-9_-]+\/index\.html$/.test(path))
      || typeof source !== 'string') throw new FirebaseSeoPublishError('INVALID_SEO_FILE_PATH');
    const compressed = gzipSync(Buffer.from(source, 'utf8'), { level: 9 });
    const hash = createHash('sha256').update(compressed).digest('hex');
    fileHashes[path] = hash;
    compressedFiles.set(hash, compressed);
  }
  const previousVersionName = await latestVersion(fetchImpl, accessToken, siteId);
  const active = await firebaseJson(fetchImpl, accessToken, previousVersionName);
  await assertTemplateAssets(fetchImpl, accessToken, previousVersionName, content.files);
  const config = withSeoConfig(object(active.config ?? {}), content.redirects);
  let operation = await firebaseJson(fetchImpl, accessToken, `sites/${siteId}/versions:clone`, 'POST', {
    sourceVersion: previousVersionName,
    finalize: false,
    exclude: { regexes: CLONE_EXCLUSIONS },
  });
  const cloneDeadline = Date.now() + 90_000;
  for (let attempts = 0; operation.done !== true; attempts++) {
    if (attempts >= 120 || Date.now() > cloneDeadline || typeof operation.name !== 'string'
      || !/^[A-Za-z0-9_/-]+$/.test(operation.name) || operation.name.includes('..')) {
      throw new FirebaseSeoPublishError('FIREBASE_CLONE_TIMEOUT');
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    operation = await firebaseJson(fetchImpl, accessToken, operation.name);
  }
  if (operation.error) throw new FirebaseSeoPublishError('FIREBASE_CLONE_FAILED');
  const cloned = object(operation.response);
  const nextVersion = versionName(cloned.name, siteId);
  if (nextVersion === previousVersionName) throw new FirebaseSeoPublishError('INVALID_FIREBASE_CLONE');
  const populated = await firebaseJson(fetchImpl, accessToken, `${nextVersion}:populateFiles`, 'POST', { files: fileHashes });
  const required = populated.uploadRequiredHashes ?? [];
  if (!Array.isArray(required) || required.some((hash) => typeof hash !== 'string' || !compressedFiles.has(hash))) {
    throw new FirebaseSeoPublishError('INVALID_FIREBASE_UPLOAD_HASHES');
  }
  if (required.length) {
    if (typeof populated.uploadUrl !== 'string') throw new FirebaseSeoPublishError('INVALID_FIREBASE_UPLOAD_URL');
    const uploadUrl = new URL(populated.uploadUrl);
    const shortVersion = nextVersion.replace(/^projects\/[A-Za-z0-9_-]+\//, '');
    if (uploadUrl.protocol !== 'https:' || uploadUrl.hostname !== 'upload-firebasehosting.googleapis.com'
      || uploadUrl.username || uploadUrl.password || uploadUrl.search || uploadUrl.hash
      || ![`/upload/${nextVersion}/files`, `/upload/${shortVersion}/files`].includes(uploadUrl.pathname)) {
      throw new FirebaseSeoPublishError('INVALID_FIREBASE_UPLOAD_URL');
    }
    const hashes = [...new Set(required as string[])];
    for (let offset = 0; offset < hashes.length; offset += 4) {
      await Promise.all(hashes.slice(offset, offset + 4).map(async (hash) => {
        const response = await fetchImpl(`${uploadUrl.href}/${hash}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/octet-stream' },
          body: compressedFiles.get(hash),
          redirect: 'error',
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new FirebaseSeoPublishError(`FIREBASE_UPLOAD_HTTP_${response.status}`);
      }));
    }
  }
  await firebaseJson(fetchImpl, accessToken, `${nextVersion}?updateMask=config,status`, 'PATCH', { config, status: 'FINALIZED' });
  await beforeRelease?.();
  if (await latestVersion(fetchImpl, accessToken, siteId) !== previousVersionName) {
    throw new FirebaseSeoPublishError('FIREBASE_RELEASE_CHANGED_RETRY');
  }
  const release = await firebaseJson(
    fetchImpl, accessToken,
    `sites/${siteId}/releases?versionName=${encodeURIComponent(nextVersion)}`,
    'POST', { message: 'Actualización de las fichas públicas y el sitemap' },
  );
  return { versionName: nextVersion, previousVersionName, releaseName: typeof release.name === 'string' ? release.name : null };
}

interface ServiceAccount {
  type: string;
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cachedToken: { fingerprint: string; value: string; expiresAt: number } | undefined;

async function serviceAccountToken(fetchImpl: FetchImpl): Promise<string> {
  const input = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!input) throw new FirebaseSeoPublishError('CONFIG_REQUIRED');
  let account: ServiceAccount;
  try { account = JSON.parse(input) as ServiceAccount; }
  catch { throw new FirebaseSeoPublishError('INVALID_FIREBASE_SERVICE_ACCOUNT'); }
  const project = process.env.FIREBASE_PROJECT_ID ?? DEFAULT_PROJECT;
  if (account.type !== 'service_account' || account.project_id !== project
    || typeof account.client_email !== 'string' || !account.client_email.endsWith(`@${project}.iam.gserviceaccount.com`)
    || typeof account.private_key !== 'string' || (account.token_uri && account.token_uri !== TOKEN_URL)) {
    throw new FirebaseSeoPublishError('INVALID_FIREBASE_SERVICE_ACCOUNT');
  }
  const fingerprint = createHash('sha256').update(input).digest('hex');
  if (cachedToken?.fingerprint === fingerprint && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.hosting',
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })}`;
  let signature: string;
  try {
    const key = createPrivateKey(account.private_key);
    if (key.asymmetricKeyType !== 'rsa') throw new Error('Unsupported key');
    signature = sign('RSA-SHA256', Buffer.from(unsigned), key).toString('base64url');
  } catch { throw new FirebaseSeoPublishError('INVALID_FIREBASE_SERVICE_ACCOUNT'); }
  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new FirebaseSeoPublishError(`FIREBASE_AUTH_HTTP_${response.status}`);
  const token = object(await response.json());
  if (typeof token.access_token !== 'string' || !token.access_token
    || typeof token.expires_in !== 'number' || token.expires_in <= 60) {
    throw new FirebaseSeoPublishError('INVALID_FIREBASE_TOKEN_RESPONSE');
  }
  cachedToken = { fingerprint, value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };
  return cachedToken.value;
}

export interface SeoPublishStateRow {
  id: string;
  requestedRevision: number;
  publishedRevision: number;
  leaseUntil: Date | null;
  leaseToken: string | null;
  lastError: string | null;
  updatedAt: Date;
}

interface StateWhere {
  id: string;
  leaseToken?: string;
  requestedRevision?: number;
  publishedRevision?: number;
  leaseUntil?: { gt: Date };
  OR?: Array<{ leaseUntil: null | { lt: Date } }>;
}

interface StateUpdate {
  requestedRevision?: { increment: number };
  publishedRevision?: number;
  leaseUntil?: Date | null;
  leaseToken?: string | null;
  lastError?: string | null;
}

export interface SeoStateStore {
  upsert(args: {
    where: { id: string };
    create: { id: string; requestedRevision: number; publishedRevision?: number };
    update: StateUpdate;
  }): Promise<SeoPublishStateRow>;
  findUnique(args: { where: { id: string } }): Promise<SeoPublishStateRow | null>;
  updateMany(args: { where: StateWhere; data: StateUpdate }): Promise<{ count: number }>;
}

interface SyncConfiguration {
  loadContent: () => Promise<FirebaseSeoContent>;
  fetchImpl?: FetchImpl;
  store?: SeoStateStore;
  /** Dependency injection for a trusted token provider; credentials never go in content. */
  getAccessToken?: () => Promise<string>;
}

let configuration: SyncConfiguration | undefined;
let running = false;
let debounceTimer: NodeJS.Timeout | undefined;
let intervalTimer: NodeJS.Timeout | undefined;

export function configureSeoSync(options: SyncConfiguration) { configuration = options; }

function store(): SeoStateStore {
  return configuration?.store ?? (prisma as unknown as { seoPublishState: SeoStateStore }).seoPublishState;
}

function configured() { return Boolean(configuration?.getAccessToken || process.env.FIREBASE_SERVICE_ACCOUNT_JSON); }

function scheduleSync() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { debounceTimer = undefined; void syncSeoNow(); }, 1000);
  debounceTimer.unref();
}

/** Wake the worker after a transaction has already queued its revision. */
export function wakeSeoSync(): void { scheduleSync(); }

/** A missing deploy credential leaves a durable pending revision; it never rejects a CRUD request. */
export async function queueSeoSync(stateStore: SeoStateStore = store()): Promise<boolean> {
  try {
    await stateStore.upsert({
      where: { id: 'seo' },
      create: { id: 'seo', requestedRevision: 1 },
      update: { requestedRevision: { increment: 1 }, lastError: configured() ? null : 'CONFIG_REQUIRED' },
    });
    scheduleSync();
    return true;
  } catch {
    console.warn('No se pudo registrar la actualización SEO pendiente. Revisá la migración SeoPublishState.');
    return false;
  }
}

export async function getSeoSyncStatus() {
  const state = await store().findUnique({ where: { id: 'seo' } });
  return {
    configured: configured(),
    requestedRevision: state?.requestedRevision ?? 0,
    publishedRevision: state?.publishedRevision ?? 0,
    pending: (state?.requestedRevision ?? 0) > (state?.publishedRevision ?? 0),
    working: Boolean(state?.leaseUntil && state.leaseUntil > new Date()),
    lastError: state?.lastError ?? (configured() ? null : 'CONFIG_REQUIRED'),
    updatedAt: state?.updatedAt ?? null,
  };
}

/** Retries persisted work on startup and every minute, including work interrupted by a restart. */
export function startSeoSyncWorker() {
  if (!intervalTimer) {
    intervalTimer = setInterval(() => { void syncSeoNow(); }, 60_000);
    intervalTimer.unref();
  }
  scheduleSync();
  return () => {
    if (intervalTimer) clearInterval(intervalTimer);
    if (debounceTimer) clearTimeout(debounceTimer);
    intervalTimer = undefined;
    debounceTimer = undefined;
  };
}

export async function syncSeoNow(): Promise<boolean> {
  if (running || !configuration) return false;
  running = true;
  let leaseToken: string | undefined;
  let heartbeat: NodeJS.Timeout | undefined;
  let leaseLost = false;
  try {
    const states = store();
    const pending = await states.findUnique({ where: { id: 'seo' } });
    if (!pending || pending.requestedRevision <= pending.publishedRevision) return false;
    if (!configured()) {
      await states.updateMany({
        where: { id: 'seo', OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] },
        data: { lastError: 'CONFIG_REQUIRED' },
      });
      return false;
    }
    leaseToken = randomUUID();
    const claim = await states.updateMany({
      where: {
        id: 'seo', requestedRevision: pending.requestedRevision, publishedRevision: pending.publishedRevision,
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
      },
      data: { leaseToken, leaseUntil: new Date(Date.now() + LEASE_MS), lastError: null },
    });
    if (!claim.count) return false;
    const ownedToken = leaseToken;
    heartbeat = setInterval(() => {
      void states.updateMany({
        where: { id: 'seo', leaseToken: ownedToken },
        data: { leaseUntil: new Date(Date.now() + LEASE_MS) },
      }).then(({ count }) => { if (!count) leaseLost = true; }).catch(() => { leaseLost = true; });
    }, 30_000);
    heartbeat.unref();
    const revision = pending.requestedRevision;
    const content = await configuration.loadContent();
    const fetchImpl = configuration.fetchImpl ?? fetch;
    const accessToken = await (configuration.getAccessToken?.() ?? serviceAccountToken(fetchImpl));
    await publishFirebaseSeo({
      siteId: process.env.FIREBASE_HOSTING_SITE_ID ?? DEFAULT_SITE,
      accessToken, content, fetchImpl,
      beforeRelease: async () => {
        const current = await states.findUnique({ where: { id: 'seo' } });
        if (leaseLost || current?.leaseToken !== ownedToken || !current.leaseUntil || current.leaseUntil <= new Date()) {
          throw new FirebaseSeoPublishError('SEO_LEASE_LOST_RETRY');
        }
        if (current.requestedRevision !== revision) throw new FirebaseSeoPublishError('SEO_SNAPSHOT_CHANGED_RETRY');
      },
    });
    const acknowledged = await states.updateMany({
      where: { id: 'seo', leaseToken: ownedToken, leaseUntil: { gt: new Date() } },
      data: { publishedRevision: revision, leaseToken: null, leaseUntil: null, lastError: null },
    });
    leaseToken = undefined;
    const current = await states.findUnique({ where: { id: 'seo' } });
    if (current && current.requestedRevision > current.publishedRevision) scheduleSync();
    return acknowledged.count > 0;
  } catch (error) {
    const reason = error instanceof FirebaseSeoPublishError ? error.code : 'SEO_PUBLICATION_FAILED';
    if (/^FIREBASE_(?:UPLOAD_)?HTTP_401$/.test(reason)) cachedToken = undefined;
    if (leaseToken) {
      await store().updateMany({
        where: { id: 'seo', leaseToken },
        data: { leaseToken: null, leaseUntil: null, lastError: reason },
      }).catch(() => undefined);
    }
    if (['SEO_SNAPSHOT_CHANGED_RETRY', 'FIREBASE_RELEASE_CHANGED_RETRY', 'FIREBASE_TEMPLATE_CHANGED_RETRY'].includes(reason)) scheduleSync();
    console.warn(`Sincronización SEO pendiente: ${reason}`);
    return false;
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    running = false;
  }
}
