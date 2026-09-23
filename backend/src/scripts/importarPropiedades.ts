/**
 * Importa las propiedades publicadas en latorrepropiedades.com (plataforma
 * buscadorprop) hacia esta aplicación.
 *
 * Se corre UNA vez, para no tener que cargar a mano lo que ya está publicado.
 * De ahí en adelante las propiedades se cargan desde el panel.
 *
 * Uso:
 *   npm run importar -- --dry-run            muestra qué traería, sin tocar nada
 *   npm run importar -- --limite 3           sólo las primeras 3 (para probar)
 *   npm run importar -- --sin-fotos          no sube fotos (mucho más rápido)
 *   npm run importar                         importa todo
 *
 * Todo entra como OCULTA: sin revisar la ubicación en el mapa, una propiedad no
 * debería verse en el sitio público. El circuito pensado es entrar al panel,
 * ajustar el pin y recién ahí marcarla como Disponible.
 *
 * Es seguro correrlo más de una vez: cada propiedad importada guarda de qué
 * publicación vino (features.sourceId) y las que ya existen se saltean.
 */
import { prisma } from '../lib/prisma';
import { uploadPropertyImage } from '../services/image.service';
import { computePublicCoordinates } from '../utils/publicCoordinates';
import { generatePropertyCode } from '../utils/propertyCode';
import type { Currency, OperationType, PropertyType } from '@prisma/client';

const SITIO = 'https://www.latorrepropiedades.com';
const NAVEGADOR = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/130.0' };

/** Centro de Coronel Brandsen: adonde van las propiedades sin coordenada propia. */
const CENTRO_BRANDSEN = { lat: -35.1679518, lng: -58.2373784 };

const dryRun = process.argv.includes('--dry-run');
const sinFotos = process.argv.includes('--sin-fotos');
const limite = (() => {
  const i = process.argv.indexOf('--limite');
  return i >= 0 ? Number(process.argv[i + 1]) : Infinity;
})();

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────── descarga ─────────────────────────────

async function bajarTexto(url: string): Promise<string> {
  const res = await fetch(url, { headers: NAVEGADOR });
  if (!res.ok) throw new Error(`${res.status} al pedir ${url}`);
  return res.text();
}

/**
 * El listado del sitio muestra de a 12 y el paginador lo dibuja el navegador,
 * así que no hay forma de pedir "la página 3". Pero la vista de mapa expone un
 * endpoint que devuelve las propiedades dentro de un rectángulo, con sus
 * coordenadas. Recorriendo la zona en una grilla se obtienen casi todas, y los
 * distintos ordenamientos del listado completan el resto.
 */
async function recolectarPublicaciones(): Promise<Map<string, { lat?: number; lng?: number }>> {
  const encontradas = new Map<string, { lat?: number; lng?: number }>();

  async function consultarMapa(limites: Record<string, number>) {
    const res = await fetch(`${SITIO}/propiedades`, {
      method: 'POST',
      headers: {
        ...NAVEGADOR,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `${SITIO}/propiedades`,
      },
      body: new URLSearchParams({ accion: 'mapa', limites: JSON.stringify(limites) }),
    });
    if (!res.ok) return;
    const datos = (await res.json()) as { propiedades?: { id: number; latitud?: number; longitud?: number }[] };
    for (const p of datos.propiedades ?? []) {
      encontradas.set(String(p.id), { lat: p.latitud, lng: p.longitud });
    }
  }

  // El endpoint corta en 60 resultados por consulta, por eso la grilla.
  await consultarMapa({ norte: -20, este: -45, sur: -55, oeste: -74 });
  const N = -34.6, S = -36.2, O = -59.2, E = -57.2, DIV = 8;
  for (let i = 0; i < DIV; i++) {
    for (let j = 0; j < DIV; j++) {
      await consultarMapa({
        norte: N + ((S - N) / DIV) * i,
        sur: N + ((S - N) / DIV) * (i + 1),
        oeste: O + ((E - O) / DIV) * j,
        este: O + ((E - O) / DIV) * (j + 1),
      });
      await dormir(120);
    }
  }

  // Los listados aportan las que no tienen coordenada cargada.
  const vistas = [
    '', 'venta', 'venta_destacadas', 'venta_precio-menor-a-mayor', 'venta_precio-mayor-a-menor',
    'venta_mas-nuevas', 'venta_mas-viejas', 'alquiler', 'alquiler_mas-nuevas', 'alquiler_precio-menor-a-mayor',
  ];
  for (const vista of vistas) {
    const html = await bajarTexto(`${SITIO}/propiedades${vista ? `/${vista}` : ''}`).catch(() => '');
    for (const bloque of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      try {
        const json = JSON.parse(bloque[1].trim());
        if (json['@type'] !== 'CollectionPage') continue;
        for (const parte of json.hasPart ?? []) {
          const id = String(parte.url ?? '').split('/').pop();
          if (id && !encontradas.has(id)) encontradas.set(id, {});
        }
      } catch {
        /* bloque que no es JSON válido: se ignora */
      }
    }
    await dormir(200);
  }

  return encontradas;
}

// ───────────────────────────── parseo ─────────────────────────────

function decodificar(texto: string): string {
  const nombres: Record<string, string> = {
    aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ',
    Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ',
    uuml: 'ü', Uuml: 'Ü', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
    ndash: '–', mdash: '—', hellip: '…', sup2: '²', sup3: '³', deg: '°', ordm: 'º', ordf: 'ª',
    bull: '•', middot: '·', iexcl: '¡', iquest: '¿', laquo: '«', raquo: '»',
    lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', times: '×', frac12: '½', frac14: '¼',
    euro: '€', copy: '©', reg: '®', trade: '™', plusmn: '±', para: '¶', sect: '§',
  };
  return texto
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z0-9]+);/g, (entero, nombre) => nombres[nombre] ?? entero);
}

const limpiar = (html: string) => decodificar(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/**
 * Convierte la página en la lista de textos que se ven en pantalla.
 *
 * Es importante hacer esto ANTES de recortar: si se corta el HTML en crudo por
 * posición, es fácil partir una etiqueta al medio y que queden restos como
 * `<section id="` mezclados con el texto de la propiedad.
 */
function aLineas(html: string): string[] {
  return decodificar(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]*>/g, '\n')
  )
    .split('\n')
    .map((linea) => linea.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Corta los títulos de sección que vienen después de la descripción. */
const ES_SECCION = /^(Comodidades|Ubicaci[oó]n|Propiedades relacionadas|Ver m[aá]s|Compartir)$/i;

/**
 * Las descripciones del sitio viejo tienen emojis que allá ya se guardaron rotos:
 * donde iba 🏠 quedó un signo de pregunta suelto (verificado: es el byte 0x3F, no un
 * problema de codificación nuestro). Al principio de cada renglón eso es siempre un
 * emoji perdido, así que se saca. Los signos de pregunta del medio de una frase no
 * se tocan.
 */
function limpiarDescripcion(texto: string): string {
  return decodificar(texto)
    .split('\n')
    .map((linea) => linea.replace(/^[?\s]+(?=[A-Za-zÁÉÍÓÚÑáéíóúñ0-9¡¿])/, '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

interface Ficha {
  id: string;
  titulo: string;
  direccion: string;
  localidad: string;
  operacion: string;
  moneda: Currency;
  precio: number | null;
  categoria: string;
  ambientes: number | null;
  dormitorios: number | null;
  banos: number | null;
  supTotal: number | null;
  supCubierta: number | null;
  descripcion: string;
  comodidades: string;
  fotos: string[];
}

function parsearFicha(id: string, html: string): Ficha | null {
  const titulo = limpiar((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? [])[1] ?? '');
  if (!titulo) return null;

  const lineas = aLineas(html);
  const iTitulo = lineas.findIndex((l) => l === titulo);
  const iAcerca = lineas.findIndex((l) => /^Acerca de la propiedad/i.test(l));

  // Justo debajo del título va "Calle y altura, Localidad" (a veces repite la
  // localidad: "…, San Vicente, San Vicente").
  const lineaUbicacion = iTitulo >= 0 ? lineas[iTitulo + 1] ?? '' : '';
  const partes = lineaUbicacion.split(',').map((p) => p.trim()).filter(Boolean);
  if (partes.length > 1 && partes[partes.length - 1] === partes[partes.length - 2]) partes.pop();
  const localidad = partes.length ? partes[partes.length - 1] : '';
  const direccion = partes.length > 1 ? partes.slice(0, -1).join(', ') : '';

  // El precio aparece como una línea suelta: "USD 185.000", "$ 350.000" o "Consultar".
  const cerca = lineas.slice(Math.max(0, iTitulo), iAcerca > 0 ? iAcerca : lineas.length);
  const lineaPrecio = cerca.find((l) => /^(USD|U\$S|\$)\s*[\d.,]+$/i.test(l)) ?? '';
  const operacion = cerca.some((l) => /^alquiler/i.test(l)) ? 'alquiler' : 'venta';
  const precioCrudo = lineaPrecio.match(/([\d.,]+)/);
  const precio = precioCrudo ? Number(precioCrudo[1].replace(/\./g, '').replace(',', '.')) : null;
  // Varias fichas dicen "Consultar" en vez de un precio. En ese caso no hay moneda
  // que leer: se deja USD, que es como se publican las ventas acá, y el sitio
  // muestra "Consultar precio" igual porque el precio queda vacío.
  const moneda: Currency = /USD|U\$S/i.test(lineaPrecio) ? 'USD' : precio === null ? 'USD' : 'ARS';

  // Las características de ESTA propiedad son las líneas justo anteriores a
  // "Acerca de la propiedad". Más arriba hay un carrusel de propiedades
  // relacionadas con el mismo formato, por eso se mira sólo ese tramo.
  const caracteristicas = iAcerca > 0 ? lineas.slice(Math.max(0, iAcerca - 14), iAcerca) : [];
  const texto = caracteristicas.join(' | ');

  const num = (re: RegExp) => {
    const m = texto.match(re);
    return m ? Number(m[1].replace(/\./g, '')) : null;
  };

  const categoria = (texto.match(/\b(Casas?|Departamentos?|Locales?|Oficinas?|Terrenos?|Lotes?|Campos?|Chacras?|Quintas?|Casaquintas?|Galpones?|Cocheras?|Fondos? de comercio|Hoteles?|Emprendimientos?)\b/i) ?? [])[1] ?? '';

  // Descripción: las líneas entre "Acerca de la propiedad" y el título de sección siguiente.
  const resto = iAcerca >= 0 ? lineas.slice(iAcerca + 1) : [];
  const finDescripcion = resto.findIndex((l) => ES_SECCION.test(l));
  const descripcion = limpiarDescripcion(resto.slice(0, finDescripcion > 0 ? finDescripcion : 30).join('\n'));

  const iComodidades = lineas.findIndex((l) => /^Comodidades$/i.test(l));
  const comodidades =
    iComodidades >= 0
      ? lineas
          .slice(iComodidades + 1)
          .slice(0, 25)
          .filter((l) => !ES_SECCION.test(l))
          .join(', ')
      : '';

  // Sólo las fotos de esta propiedad: el carrusel del final trae las de otras.
  const padded = id.padStart(8, '0');
  const fotos = [
    ...new Set(
      [...html.matchAll(new RegExp(`https?://staticbp\\.com/img/[^"'\\s)]*${padded}-\\d+\\.(?:jpg|jpeg|png|webp)`, 'gi'))].map((m) => m[0])
    ),
  ].sort();

  return {
    id, titulo, direccion, localidad, operacion, moneda, precio, categoria,
    // "+4 Ambientes" significa 4 o más: se guarda 4.
    ambientes: num(/\+?(\d+)\s*Ambiente/i),
    dormitorios: num(/\+?(\d+)\s*Dormitorio/i),
    banos: num(/\+?(\d+)\s*ba[ñn]o/i),
    supTotal: num(/Sup\.\s*total\s*([\d.,]+)\s*m/i),
    supCubierta: num(/Sup\.\s*cubierta\s*([\d.,]+)\s*m/i),
    descripcion, comodidades, fotos,
  };
}

// ───────────────────────────── traducción al modelo ─────────────────────────────

/** Tipos que son más específicos que "casa" y hay que mirar primero. */
function clasificarEspecifico(texto: string): PropertyType | null {
  const t = texto.toLowerCase();
  if (/casa\s*quinta|casaquinta|quinta|caba[ñn]a/.test(t)) return 'COUNTRY_HOUSE';
  if (/campo|chacra|fracci/.test(t)) return 'FIELD';
  return null;
}

function clasificar(texto: string): PropertyType | null {
  const t = texto.toLowerCase();
  if (!t.trim()) return null;
  const especifico = clasificarEspecifico(t);
  if (especifico) return especifico;
  // "casa" antes que el resto: "CASA CON LOCAL EN PB", "CASA + LOTE" y "CASA CON
  // DEPTO INDEPENDIENTE" son casas, aunque el título nombre al local, al lote o al depto.
  if (/casa/.test(t)) return 'HOUSE';
  if (/depto|departamento/.test(t)) return 'APARTMENT';
  if (/local|galp[oó]n|fondo de comercio/.test(t)) return 'COMMERCIAL_UNIT';
  if (/oficina/.test(t)) return 'OFFICE';
  if (/terreno|lote/.test(t)) return 'LAND';
  return null;
}

/**
 * Cómo se decide el tipo, en orden:
 *
 * 1. Lo específico gana esté donde esté. El origen cataloga una "Casa Quinta"
 *    simplemente como "Casa", y ahí el título es más preciso que la categoría.
 * 2. Después manda la categoría del sitio ("Casas", "Galpones", "Terrenos"),
 *    porque el título describe la propiedad entera y confunde: una "CASA CON
 *    LOCAL EN PB" está catalogada como Casa, no como Local.
 * 3. Y si no hay categoría, se cae al título.
 */
function tipoDePropiedad(ficha: Ficha): PropertyType {
  return (
    clasificarEspecifico(`${ficha.categoria} ${ficha.titulo}`) ??
    clasificar(ficha.categoria) ??
    clasificar(ficha.titulo) ??
    'OTHER'
  );
}

function tipoDeOperacion(ficha: Ficha, tipo: PropertyType): OperationType {
  if (ficha.operacion !== 'alquiler') return 'SALE';
  return tipo === 'COMMERCIAL_UNIT' || tipo === 'OFFICE' ? 'COMMERCIAL_RENT' : 'RESIDENTIAL_RENT';
}

/** "Brandsen" en el sitio viejo es Coronel Brandsen. */
function normalizarLocalidad(valor: string): string {
  const v = valor.trim();
  if (/^brandsen$/i.test(v)) return 'Coronel Brandsen';
  return v || 'Coronel Brandsen';
}

function detectar(ficha: Ficha, ...palabras: string[]): boolean {
  const texto = `${ficha.comodidades} ${ficha.descripcion}`.toLowerCase();
  return palabras.some((p) => texto.includes(p));
}

// ───────────────────────────── importación ─────────────────────────────

async function subirFotos(ficha: Ficha) {
  const imagenes: { url: string; publicId: string; width: number; height: number; order: number; isMain: boolean }[] = [];
  for (const [i, origen] of ficha.fotos.entries()) {
    try {
      const res = await fetch(origen, { headers: NAVEGADOR });
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      const nombre = origen.split('/').pop() ?? `${ficha.id}-${i}.jpg`;
      const tipo = res.headers.get('content-type') ?? 'image/jpeg';
      const subida = await uploadPropertyImage(buffer, nombre, tipo.split(';')[0]);
      imagenes.push({ ...subida, order: imagenes.length, isMain: imagenes.length === 0 });
    } catch (err) {
      console.error(`      foto ${i + 1}: ${err instanceof Error ? err.message : err}`);
    }
  }
  return imagenes;
}

/**
 * Vuelve a pasar la limpieza de texto sobre las propiedades ya importadas.
 * Sirve cuando se corrige el limpiador y no se quiere volver a bajar todo
 * (ni resubir las fotos, que es lo que tarda).
 */
async function repararTextos() {
  const todas = await prisma.property.findMany();
  const importadas = todas.filter((p) => (p.features as { source?: string } | null)?.source === 'buscadorprop');

  let arregladas = 0;
  for (const p of importadas) {
    const limpia = limpiarDescripcion(p.description);
    if (limpia === p.description) continue;
    if (!dryRun) await prisma.property.update({ where: { id: p.id }, data: { description: limpia } });
    arregladas++;
    console.log(`  ${p.code} "${p.title.slice(0, 28)}"`);
  }

  console.log(`\n${dryRun ? 'Se arreglarían' : 'Arregladas'}: ${arregladas} de ${importadas.length}`);
  await prisma.$disconnect();
}

/**
 * Corrige el tipo y la operación de lo ya importado, volviendo a leer la ficha
 * de origen. Toca SÓLO esos dos campos: nada de coordenadas, estado, fotos ni
 * descripción, porque para entonces ya puede haber ediciones hechas a mano en el
 * panel y no hay que pisarlas.
 */
async function reclasificar() {
  const todas = await prisma.property.findMany();
  const importadas = todas.filter((p) => (p.features as { source?: string } | null)?.source === 'buscadorprop');

  let cambiadas = 0;
  for (const p of importadas) {
    const datos = p.features as { sourceId?: string } | null;
    if (!datos?.sourceId) continue;

    try {
      const ficha = parsearFicha(datos.sourceId, await bajarTexto(`${SITIO}/propiedad/${datos.sourceId}`));
      if (!ficha) continue;

      const tipo = tipoDePropiedad(ficha);
      const operacion = tipoDeOperacion(ficha, tipo);
      if (tipo === p.propertyType && operacion === p.operationType) continue;

      console.log(`  ${p.code} "${p.title.slice(0, 32)}"  ${p.propertyType} -> ${tipo}`);
      if (!dryRun) {
        await prisma.property.update({
          where: { id: p.id },
          data: { propertyType: tipo, operationType: operacion, features: { ...datos, categoria: ficha.categoria } as never },
        });
      }
      cambiadas++;
      await dormir(250);
    } catch (err) {
      console.error(`  ${p.code}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n${dryRun ? 'Se corregirían' : 'Corregidas'}: ${cambiadas} de ${importadas.length}`);
  await prisma.$disconnect();
}

async function main() {
  if (process.argv.includes('--reparar')) return repararTextos();
  if (process.argv.includes('--reclasificar')) return reclasificar();

  console.log(dryRun ? '· MODO PRUEBA: no se escribe nada en la base\n' : '· Importando de verdad\n');

  console.log('Buscando las publicaciones en el sitio…');
  const publicaciones = await recolectarPublicaciones();
  console.log(`Encontradas: ${publicaciones.size}\n`);

  const existentes = await prisma.property.findMany({ select: { features: true } });
  const yaImportadas = new Set(
    existentes
      .map((p) => (p.features as { sourceId?: string } | null)?.sourceId)
      .filter((x): x is string => Boolean(x))
  );

  let creadas = 0, salteadas = 0, fallidas = 0, conUbicacion = 0, fotosSubidas = 0;
  let procesadas = 0;

  for (const [id, coords] of publicaciones) {
    if (procesadas >= limite) break;

    // Las que ya estaban no gastan cupo: así "--limite 20" son 20 nuevas de verdad
    // y se puede importar en tandas hasta terminar.
    if (yaImportadas.has(id)) {
      salteadas++;
      continue;
    }
    procesadas++;

    try {
      const html = await bajarTexto(`${SITIO}/propiedad/${id}`);
      const ficha = parsearFicha(id, html);
      if (!ficha) {
        console.log(`  ${id}: no pude leer la ficha, la salteo`);
        fallidas++;
        continue;
      }

      const tipo = tipoDePropiedad(ficha);
      const operacion = tipoDeOperacion(ficha, tipo);

      // Sin coordenada propia se usa el centro del pueblo, y queda para ajustar a mano.
      const tieneUbicacion = Boolean(
        coords.lat && coords.lng &&
        !(Math.abs(coords.lat - CENTRO_BRANDSEN.lat) < 1e-6 && Math.abs(coords.lng - CENTRO_BRANDSEN.lng) < 1e-6)
      );
      if (tieneUbicacion) conUbicacion++;
      const latitude = coords.lat ?? CENTRO_BRANDSEN.lat;
      const longitude = coords.lng ?? CENTRO_BRANDSEN.lng;

      console.log(
        `  ${id}  ${ficha.titulo.slice(0, 34).padEnd(34)} ${ficha.moneda} ${String(ficha.precio ?? '-').padStart(9)}  ` +
        `${ficha.fotos.length} fotos  ${tieneUbicacion ? 'ubicada' : 'SIN UBICACIÓN'}`
      );

      if (dryRun) continue;

      const imagenes = sinFotos ? [] : await subirFotos(ficha);
      fotosSubidas += imagenes.length;

      const code = generatePropertyCode();
      const creada = await prisma.property.create({
        data: {
          code,
          title: ficha.titulo,
          operationType: operacion,
          propertyType: tipo,
          // Entra oculta a propósito: se publica desde el panel una vez revisada.
          status: 'HIDDEN',
          featured: false,
          price: ficha.precio,
          currency: ficha.moneda,
          location: normalizarLocalidad(ficha.localidad),
          neighborhood: null,
          // Muchas fichas no publican la calle: queda la localidad como referencia
          // y se completa a mano al ajustar el pin.
          exactAddress: ficha.direccion || normalizarLocalidad(ficha.localidad),
          latitude,
          longitude,
          showExactLocation: false,
          totalArea: ficha.supTotal,
          coveredArea: ficha.supCubierta,
          rooms: ficha.ambientes,
          bedrooms: ficha.dormitorios,
          bathrooms: ficha.banos,
          garage: detectar(ficha, 'cochera', 'garage', 'garaje'),
          yard: detectar(ficha, 'patio', 'jard'),
          pool: detectar(ficha, 'pileta', 'piscina'),
          grill: detectar(ficha, 'parrilla'),
          quincho: detectar(ficha, 'quincho'),
          gallery: detectar(ficha, 'galer'),
          terrace: detectar(ficha, 'terraza'),
          description: ficha.descripcion,
          images: imagenes as never,
          // Queda registrado de dónde vino, para no duplicarla si se corre de nuevo.
          features: { source: 'buscadorprop', sourceId: id, sourceUrl: `${SITIO}/propiedad/${id}`, categoria: ficha.categoria } as never,
        },
      });

      const publicas = computePublicCoordinates({ id: creada.id, latitude, longitude, showExactLocation: false });
      await prisma.property.update({ where: { id: creada.id }, data: publicas });

      creadas++;
      await dormir(400);
    } catch (err) {
      fallidas++;
      console.error(`  ${id}: ERROR ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log('\n────────────────────────────────');
  console.log(`Creadas: ${creadas} · Ya estaban: ${salteadas} · Con error: ${fallidas}`);
  console.log(`Con ubicación propia: ${conUbicacion} · Fotos subidas: ${fotosSubidas}`);
  if (!dryRun && creadas > 0) {
    console.log('\nTodas entraron OCULTAS. Revisá la ubicación en el panel y publicalas desde ahí.');
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
