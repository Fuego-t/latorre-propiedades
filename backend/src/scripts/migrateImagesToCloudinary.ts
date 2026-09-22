/**
 * Migra a Cloudinary las fotos que quedaron guardadas en el disco del servidor.
 *
 * Cuando Cloudinary todavía no estaba configurado, las fotos se guardaron en
 * `backend/uploads/` y en la base quedó una URL con el dominio local
 * ("http://localhost:4000/uploads/…"). Esas URLs no funcionan fuera de esta
 * computadora, así que antes de publicar el sitio hay que subir esos archivos a
 * Cloudinary y reescribir las URLs.
 *
 * Uso:
 *   npm run migrate-images -- --dry-run     (muestra qué haría, no toca nada)
 *   npm run migrate-images                  (migra de verdad)
 *
 * Es seguro correrlo más de una vez: sólo toca las fotos que siguen siendo locales.
 * Los archivos de `uploads/` NO se borran, quedan como respaldo hasta que verifiques
 * que todo se ve bien en el sitio.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { env, isCloudinaryConfigured } from '../config/env';
import { uploadPropertyImage } from '../services/image.service';
import { isLocalImage } from '../services/localStorage.service';

interface StoredImage {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  order: number;
  isMain: boolean;
}

const dryRun = process.argv.includes('--dry-run');

function extensionToMime(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

/** Una foto es local si su publicId dice "local:" o si la URL apunta a /uploads/. */
function localFileName(image: StoredImage): string | null {
  if (image.publicId && isLocalImage(image.publicId)) {
    return path.basename(image.publicId.replace(/^local:/, ''));
  }
  const match = image.url.match(/\/uploads\/([^/?#]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function main() {
  if (!isCloudinaryConfigured && !dryRun) {
    console.error(
      'Cloudinary no está configurado. Completá CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y\n' +
        'CLOUDINARY_API_SECRET en backend/.env antes de migrar.'
    );
    process.exit(1);
  }

  const properties = await prisma.property.findMany({ select: { id: true, code: true, title: true, images: true } });

  let totalPendientes = 0;
  let migradas = 0;
  let fallidas = 0;

  for (const property of properties) {
    const images = (property.images as unknown as StoredImage[]) ?? [];
    const pendientes = images.filter((img) => localFileName(img) !== null);
    if (pendientes.length === 0) continue;

    totalPendientes += pendientes.length;
    console.log(`\n${property.code} — "${property.title.trim().slice(0, 40)}" (${pendientes.length} foto/s)`);

    const actualizadas: StoredImage[] = [];

    for (const image of images) {
      const fileName = localFileName(image);
      if (!fileName) {
        actualizadas.push(image);
        continue;
      }

      const filePath = path.join(env.uploadsDir, fileName);

      if (dryRun) {
        const existe = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        console.log(`  · ${fileName} ${existe ? '-> se subiría a Cloudinary' : '-> FALTA EL ARCHIVO en uploads/'}`);
        actualizadas.push(image);
        continue;
      }

      try {
        const buffer = await fs.readFile(filePath);
        const subida = await uploadPropertyImage(buffer, fileName, extensionToMime(fileName));
        // Se conservan el orden y cuál es la principal: sólo cambia dónde vive la foto.
        actualizadas.push({ ...image, url: subida.url, publicId: subida.publicId, width: subida.width, height: subida.height });
        migradas++;
        console.log(`  · ${fileName} -> ${subida.url}`);
      } catch (err) {
        fallidas++;
        // La foto que falla se deja como estaba: mejor una URL vieja que perder el registro.
        actualizadas.push(image);
        console.error(`  · ${fileName} -> ERROR: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (!dryRun) {
      await prisma.property.update({ where: { id: property.id }, data: { images: actualizadas as never } });
    }
  }

  console.log('\n----------------------------------------');
  if (totalPendientes === 0) {
    console.log('No hay fotos locales para migrar: todo ya está en Cloudinary.');
  } else if (dryRun) {
    console.log(`Simulación: ${totalPendientes} foto/s se migrarían. Volvé a correrlo sin --dry-run para hacerlo.`);
  } else {
    console.log(`Migradas: ${migradas} · Con error: ${fallidas}`);
    console.log('Los archivos originales siguen en backend/uploads/ por las dudas.');
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
