// Búsqueda de direcciones para el panel de administración.
//
// Nominatim (OpenStreetMap) no entiende la notación argentina de "entre calles"
// —"calle 8 e/ 39 y 40"—, que es justamente la forma en que se da una dirección
// en La Plata y la zona. Por eso la búsqueda usa primero el geocodificador
// oficial argentino (Georef, apis.datos.gob.ar), que sí parsea "e/",
// "entre … y …", "esquina" y "calle + altura".
//
// Georef tiene un problema conocido en las ciudades chicas: conoce la calle pero
// no la numeración. En Chascomús, "alberti 100" devuelve CERO resultados mientras
// que "alberti" devuelve la calle con coordenadas. Por eso la búsqueda tiene tres
// intentos encadenados, de más preciso a menos:
//
//   1. la dirección completa en Georef
//   2. la calle sola en Georef (resultado aproximado: hay que ajustar el pin)
//   3. OpenStreetMap / Nominatim, que sí tiene altura en muchos pueblos
//
// Ambas APIs son gratuitas, sin token y con CORS abierto.

export type GeoSource = 'georef' | 'nominatim';

export interface GeoSuggestion {
  id: string;
  label: string;
  detail: string;
  lat: number;
  lng: number;
  source: GeoSource;
  /** El punto es de la calle, no de la altura exacta: hay que mover el pin. */
  approximate?: boolean;
}

export interface SearchResult {
  suggestions: GeoSuggestion[];
  /**
   * Ninguna fuente contestó (sin internet, API caída, demora > 6s). Es distinto de
   * "no se encontró": conviene decírselo al usuario con otras palabras.
   */
  unreachable: boolean;
  /** Georef no encontró nada y todavía queda probar en OpenStreetMap a pedido. */
  canRetryWithOsm: boolean;
}

const GEOREF_URL = 'https://apis.datos.gob.ar/georef/api/direcciones';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Ninguna búsqueda puede quedar colgada para siempre: `fetch` no tiene timeout
 * propio, y sin esto un pedido que nunca responde dejaba el cartel "Buscando…"
 * puesto hasta recargar la página.
 *
 * El límite total es de toda la búsqueda, no de cada consulta: como los intentos
 * son encadenados, un timeout por consulta se sumaría (5 + 5 + 5 = 15 segundos
 * mirando "Buscando…", que para quien carga la propiedad es lo mismo que colgado).
 */
const REQUEST_TIMEOUT_MS = 5000;
const TOTAL_BUDGET_MS = 6000;

/** Nominatim pide como máximo 1 consulta por segundo por aplicación. */
const NOMINATIM_MIN_INTERVAL_MS = 1100;

// "calle", "av.", "diag", etc. al principio de un nombre de calle
const STREET_KIND = /^(calles?|c|av|avda|aven|avenida|diag|diagonal|bv|blvd|bulevar|boulevard|ruta|rta|camino|pasaje|psje|pje)\.?\s+/;

interface GeorefCalle {
  nombre: string | null;
}

interface GeorefDireccion {
  nomenclatura: string;
  calle: GeorefCalle;
  calle_cruce_1: GeorefCalle;
  calle_cruce_2: GeorefCalle;
  altura: { valor: number | null };
  localidad_censal: { nombre: string | null };
  departamento: { nombre: string | null };
  provincia: { nombre: string | null };
  ubicacion: { lat: number | null; lon: number | null };
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function normalize(value: string): string {
  return stripAccents(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** "AVENIDA 44" -> "44", "CALLE N°48" -> "48" */
function coreStreetName(value: string | null | undefined): string {
  if (!value) return '';
  return normalize(value)
    .replace(STREET_KIND, '')
    .replace(/^n[º°o]?\s*/, '')
    .trim();
}

/**
 * Lleva lo que escribe el usuario a la forma que mejor entiende el parser de
 * Georef, sin cambiar el significado.
 */
function normalizeAddress(raw: string): string {
  let value = normalize(raw);
  value = value.replace(/\bn[º°]\s*/g, ' ');
  value = value.replace(/\b(nro|num|numero)\b\.?\s*/g, ' ');
  value = value.replace(/#\s*/g, ' ');
  value = value.replace(/\b(esq|esquina)\b\.?/g, 'y');
  value = value.replace(/\bentre\b/g, 'e/');
  // "e/39", "e / 39", "e/  39" -> "e/ 39"
  value = value.replace(/\be\s*\/\s*/g, 'e/ ');
  // "8 e 39 y 40" (sin barra) -> "8 e/ 39 y 40"
  value = value.replace(/^(.+?)\s+e\s+(\S+)\s+y\s+(\S.*)$/, '$1 e/ $2 y $3');
  return value.replace(/\s+/g, ' ').trim();
}

interface ParsedAddress {
  /** calle principal, sin "calle"/"av"/etc. */
  main: string;
  /** calles de cruce, sin prefijo */
  cross: string[];
  /** altura, si la dirección es "calle + número" */
  number: string | null;
}

function parseAddress(address: string): ParsedAddress {
  const between = address.match(/^(.+?)\s+e\/\s*(.+?)\s+y\s+(.+)$/);
  if (between) {
    return {
      main: coreStreetName(between[1]),
      cross: [coreStreetName(between[2]), coreStreetName(between[3])],
      number: null,
    };
  }

  const corner = address.match(/^(.+?)\s+y\s+(.+)$/);
  if (corner) {
    return { main: coreStreetName(corner[1]), cross: [coreStreetName(corner[2])], number: null };
  }

  // "calle 8 3950": la última palabra es la altura sólo si queda nombre de calle
  const core = coreStreetName(address);
  const withNumber = core.match(/^(\S.*?)\s+(\d{1,6})$/);
  if (withNumber) {
    return { main: withNumber[1].trim(), cross: [], number: withNumber[2] };
  }

  return { main: core, cross: [], number: null };
}

/** Separa "calle 8 e/ 39 y 40, La Plata, Buenos Aires" en sus partes. */
function splitQuery(raw: string, fallbackCity?: string) {
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  return {
    address: normalizeAddress(parts[0] ?? ''),
    city: (parts[1] ?? fallbackCity ?? '').trim(),
    province: (parts[2] ?? '').trim(),
  };
}

/**
 * Georef hace matcheo difuso por prefijo: "calle 13" trae también CALLE 132,
 * CALLE 133… Puntuamos para que la coincidencia exacta quede siempre arriba.
 */
function scoreResult(result: GeorefDireccion, parsed: ParsedAddress, city: string): number {
  let score = 0;

  const main = coreStreetName(result.calle?.nombre);
  if (main && main === parsed.main) score += 100;
  else if (main && parsed.main && main.startsWith(parsed.main)) score += 10;

  const crosses = [coreStreetName(result.calle_cruce_1?.nombre), coreStreetName(result.calle_cruce_2?.nombre)].filter(Boolean);
  for (const wanted of parsed.cross) {
    if (crosses.some((found) => found === wanted)) score += 30;
    else if (crosses.some((found) => found.startsWith(wanted))) score += 5;
  }

  if (parsed.number && result.altura?.valor != null && String(result.altura.valor) === parsed.number) {
    score += 20;
  }

  if (city) {
    const wantedCity = normalize(city);
    const places = [result.localidad_censal?.nombre, result.departamento?.nombre]
      .filter(Boolean)
      .map((name) => normalize(name as string));
    if (places.some((name) => name === wantedCity)) score += 50;
    else if (places.some((name) => name.includes(wantedCity) || wantedCity.includes(name))) score += 25;
    // Otra localidad casi siempre es un falso positivo del matcheo difuso
    else score -= 40;
  }

  return score;
}

function toSuggestion(result: GeorefDireccion): GeoSuggestion | null {
  const lat = result.ubicacion?.lat;
  const lng = result.ubicacion?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  const detail = [result.localidad_censal?.nombre, result.provincia?.nombre].filter(Boolean).join(', ');
  const label = result.nomenclatura.split(',')[0].trim();

  return {
    id: `georef:${lat.toFixed(6)},${lng.toFixed(6)}`,
    label: label || result.nomenclatura,
    detail,
    lat,
    lng,
    source: 'georef',
  };
}

/** Estado compartido por todas las consultas de una misma búsqueda. */
interface Tracker {
  /** Alguna consulta falló por red/timeout (no por "no hay resultados"). */
  failed: boolean;
  /** Momento límite para toda la búsqueda. */
  deadline: number;
}

const outOfTime = (tracker: Tracker) => Date.now() >= tracker.deadline;

/**
 * `fetch` con timeout propio. Devuelve null ante cualquier problema y deja
 * anotado en `tracker` si fue una falla real (para distinguirla de "sin resultados").
 * Un abort pedido por el usuario —porque siguió escribiendo— no cuenta como falla.
 */
async function fetchJson<T>(url: string, tracker: Tracker, signal?: AbortSignal): Promise<T | null> {
  const remaining = tracker.deadline - Date.now();
  if (remaining <= 0) {
    tracker.failed = true;
    return null;
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, Math.min(REQUEST_TIMEOUT_MS, remaining));

  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) {
      // 4xx es "la consulta no le gustó" (o nos frenaron por consultar seguido): no es
      // una caída. Avisar "sin conexión" en ese caso confunde más de lo que ayuda.
      if (res.status >= 500 || res.status === 429) tracker.failed = true;
      return null;
    }
    return (await res.json()) as T;
  } catch {
    if (!signal?.aborted) tracker.failed = true;
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

async function queryGeoref(
  address: string,
  city: string,
  province: string,
  tracker: Tracker,
  signal?: AbortSignal
): Promise<GeorefDireccion[]> {
  const params = new URLSearchParams({ direccion: address, max: '10' });
  if (city) params.set('localidad', city);
  if (province) params.set('provincia', province);

  const data = await fetchJson<{ direcciones?: GeorefDireccion[] }>(
    `${GEOREF_URL}?${params.toString()}`,
    tracker,
    signal
  );
  return data?.direcciones ?? [];
}

/**
 * Cuando Georef no tiene cargada la cuadra entera ("avenida 44 e/ 24 y 25")
 * pero sí las esquinas, buscamos cada esquina y usamos el punto medio.
 */
async function midpointFromCorners(
  parsed: ParsedAddress,
  city: string,
  province: string,
  tracker: Tracker,
  signal?: AbortSignal
): Promise<GeoSuggestion[]> {
  if (parsed.cross.length !== 2 || !parsed.main) return [];

  const corners = await Promise.all(
    parsed.cross.map(async (cross) => {
      const results = await queryGeoref(`${parsed.main} y ${cross}`, city, province, tracker, signal);
      const exact = results.find(
        (r) =>
          coreStreetName(r.calle?.nombre) === parsed.main &&
          coreStreetName(r.calle_cruce_1?.nombre) === cross &&
          typeof r.ubicacion?.lat === 'number' &&
          typeof r.ubicacion?.lon === 'number'
      );
      return exact ?? null;
    })
  );

  const found = corners.filter((corner): corner is GeorefDireccion => corner !== null);
  if (found.length === 0) return [];

  const detail = [found[0].localidad_censal?.nombre, found[0].provincia?.nombre].filter(Boolean).join(', ');

  if (found.length === 2) {
    const lat = ((found[0].ubicacion.lat as number) + (found[1].ubicacion.lat as number)) / 2;
    const lng = ((found[0].ubicacion.lon as number) + (found[1].ubicacion.lon as number)) / 2;
    return [
      {
        id: `georef-mid:${lat.toFixed(6)},${lng.toFixed(6)}`,
        label: `${found[0].calle?.nombre ?? parsed.main} entre ${parsed.cross[0]} y ${parsed.cross[1]} (mitad de cuadra)`,
        detail,
        lat,
        lng,
        source: 'georef',
      },
    ];
  }

  const single = toSuggestion(found[0]);
  return single ? [{ ...single, label: `${single.label} (esquina)` }] : [];
}

// Momento (timestamp) a partir del cual se puede hacer la próxima consulta a
// Nominatim. Es de módulo a propósito: el límite es por aplicación, no por componente.
let nominatimReadyAt = 0;

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    }
    signal?.addEventListener('abort', done);
  });
}

async function queryNominatim(
  raw: string,
  city: string,
  tracker: Tracker,
  signal?: AbortSignal
): Promise<GeoSuggestion[]> {
  // Respetamos el límite de uso encolando las consultas de a una por segundo.
  const wait = nominatimReadyAt - Date.now();
  nominatimReadyAt = Math.max(Date.now(), nominatimReadyAt) + NOMINATIM_MIN_INTERVAL_MS;
  if (wait > 0) await delay(wait, signal);
  if (signal?.aborted) return [];

  const q = [raw.split(',')[0].trim(), city].filter(Boolean).join(', ');
  const params = new URLSearchParams({ format: 'json', countrycodes: 'ar', limit: '5', q });

  const data = await fetchJson<{ display_name: string; lat: string; lon: string }[]>(
    `${NOMINATIM_URL}?${params.toString()}`,
    tracker,
    signal
  );
  if (!data) return [];

  const wantedCity = normalize(city);

  return data
    .map((item) => {
      const [first, ...rest] = item.display_name.split(',');
      return {
        item,
        first: first.trim(),
        rest: rest.map((part) => part.trim()),
      };
    })
    // Si "Alberti 100, Coronel Brandsen" no existe, Nominatim devuelve una calle
    // llamada "Coronel Brandsen" en La Matanza. Exigimos que la localidad
    // aparezca en la parte administrativa para descartar esos falsos positivos.
    .filter(({ rest }) => !wantedCity || rest.some((part) => normalize(part).includes(wantedCity)))
    .map(({ item, first, rest }) => ({
      id: `osm:${item.lat},${item.lon}`,
      label: first,
      detail: rest.slice(0, 3).join(', '),
      lat: Number(item.lat),
      lng: Number(item.lon),
      source: 'nominatim' as const,
    }));
}

export interface SearchOptions {
  /** Localidad del formulario, usada cuando la consulta no trae una. */
  city?: string;
  /**
   * Permite consultar OpenStreetMap si Georef no encontró nada.
   *
   * Sólo para búsquedas pedidas a mano (Enter o el botón "Buscar en OpenStreetMap"):
   * Nominatim prohíbe expresamente usarlo como autocompletado y bloquea por IP a
   * quien lo consulta seguido, así que mientras se escribe se usa sólo Georef.
   */
  allowOsm?: boolean;
  signal?: AbortSignal;
}

/** Resultados ya buscados, para no repetir consultas mientras se corrige el texto. */
const cache = new Map<string, SearchResult>();
const CACHE_LIMIT = 60;

/**
 * Busca una dirección y devuelve sugerencias ordenadas de mejor a peor.
 * Entiende "calle 8 e/ 39 y 40", "8 y 39", "calle 8 3950" y direcciones sueltas.
 */
export async function searchAddress(raw: string, options: SearchOptions = {}): Promise<SearchResult> {
  const query = raw.trim();
  if (query.length < 3) return { suggestions: [], unreachable: false, canRetryWithOsm: false };

  const cacheKey = `${options.allowOsm ? 'osm' : 'ar'}|${normalize(query)}|${normalize(options.city ?? '')}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const result = await runSearch(query, options);

  // Un error de red no se cachea: la próxima vez puede andar.
  if (!result.unreachable) {
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    cache.set(cacheKey, result);
  }
  return result;
}

async function runSearch(query: string, options: SearchOptions): Promise<SearchResult> {
  const tracker: Tracker = { failed: false, deadline: Date.now() + TOTAL_BUDGET_MS };
  const { address, city, province } = splitQuery(query, options.city);
  if (!address) return { suggestions: [], unreachable: false, canRetryWithOsm: false };

  const parsed = parseAddress(address);

  // Georef matchea por prefijo, así que mandamos la dirección con y sin el tipo
  // de calle: "calle 13 e/ 34 y 35" queda tapada por CALLE 132, 133, 134…,
  // mientras que "13 e/ 34 y 35" encuentra la correcta de una.
  const variants = new Set<string>([address]);
  const withoutKind = address.replace(STREET_KIND, '');
  if (withoutKind !== address) variants.add(withoutKind);
  else variants.add(`calle ${address}`);

  const batches = await Promise.all(
    [...variants].map((variant) => queryGeoref(variant, city, province, tracker, options.signal))
  );

  const scored: { suggestion: GeoSuggestion; score: number }[] = [];
  for (const batch of batches) {
    for (const result of batch) {
      const suggestion = toSuggestion(result);
      if (suggestion) scored.push({ suggestion, score: scoreResult(result, parsed, city) });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const suggestions: GeoSuggestion[] = [];
  const seen = new Set<string>();
  const push = (item: GeoSuggestion) => {
    const key = `${item.lat.toFixed(5)},${item.lng.toFixed(5)}`;
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push(item);
  };

  // Si ninguna coincidencia es de la calle exacta, armamos la cuadra a partir
  // de sus dos esquinas antes de mostrar los parecidos.
  if (parsed.cross.length === 2 && (scored[0]?.score ?? 0) < 100 && !outOfTime(tracker)) {
    const fromCorners = await midpointFromCorners(parsed, city, province, tracker, options.signal);
    fromCorners.forEach(push);
  }

  scored.forEach((item) => push(item.suggestion));

  // Intento 2: la calle sin la altura. Georef no tiene numeración cargada en muchos
  // pueblos —"alberti 100" en Chascomús da cero, "alberti" da la calle—, así que en vez
  // de no mostrar nada ofrecemos la calle y avisamos que el punto es aproximado.
  if (suggestions.length === 0 && parsed.number && parsed.main && !options.signal?.aborted && !outOfTime(tracker)) {
    const streetOnly = await queryGeoref(parsed.main, city, province, tracker, options.signal);
    const best = streetOnly.map(toSuggestion).find((item): item is GeoSuggestion => item !== null);
    if (best) {
      push({
        ...best,
        label: `${best.label} (al ${parsed.number}, aproximado)`,
        approximate: true,
      });
    }
  }

  // Intento 3: OpenStreetMap, que tiene mejor cobertura de altura en pueblos chicos.
  // Sólo a pedido explícito (ver `allowOsm`).
  if (suggestions.length === 0 && options.allowOsm && !options.signal?.aborted && !outOfTime(tracker)) {
    const fallback = await queryNominatim(query, city, tracker, options.signal);
    fallback.forEach(push);
  }

  return {
    suggestions: suggestions.slice(0, 8),
    // Sólo es "no se pudo conectar" si además no conseguimos ni una sugerencia.
    unreachable: tracker.failed && suggestions.length === 0,
    canRetryWithOsm: suggestions.length === 0 && !options.allowOsm,
  };
}
