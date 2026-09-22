import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { env } from '../config/env';

export interface StoredImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Guarda la imagen en disco (carpeta `uploads/` del backend) y devuelve una URL
 * absoluta servida por el propio servidor. Es el modo que se usa mientras
 * Cloudinary no esté configurado, para que el panel funcione igual desde el día uno.
 *
 * A diferencia de Cloudinary acá no hay compresión ni conversión a WebP: el archivo
 * se guarda tal cual lo mandó el navegador (por eso el límite de 10MB por foto).
 */
export async function saveImageLocally(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<StoredImage> {
  await fs.mkdir(env.uploadsDir, { recursive: true });

  const ext = EXTENSIONS[mimeType] || path.extname(originalName).toLowerCase() || '.jpg';
  const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;

  await fs.writeFile(path.join(env.uploadsDir, fileName), buffer);

  const { width, height } = readImageSize(buffer);

  return {
    url: `${env.publicUrl}/uploads/${fileName}`,
    // Sin prefijos ni barras: el publicId viaja en la URL al borrar la imagen.
    publicId: `local:${fileName}`,
    width,
    height,
  };
}

export async function deleteLocalImage(publicId: string): Promise<void> {
  const fileName = path.basename(publicId.replace(/^local:/, ''));
  await fs.unlink(path.join(env.uploadsDir, fileName)).catch(() => null);
}

export function isLocalImage(publicId: string): boolean {
  return publicId.startsWith('local:');
}

/** Lee el ancho/alto del header del archivo. Devuelve 0x0 si el formato no se reconoce. */
function readImageSize(buffer: Buffer): { width: number; height: number } {
  // PNG: IHDR arranca en el byte 16
  if (buffer.length > 24 && buffer.readUInt32BE(0) === 0x89504e47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  // WEBP (VP8X / VP8 / VP8L) — formato RIFF
  if (buffer.length > 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buffer.toString('ascii', 12, 16);
    if (chunk === 'VP8X') {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
    }
    if (chunk === 'VP8 ') {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
  }

  // JPEG: recorremos los markers hasta el SOF, que trae las dimensiones
  if (buffer.length > 4 && buffer.readUInt16BE(0) === 0xffd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const size = buffer.readUInt16BE(offset + 2);
      // SOF0..SOF15, salteando los markers que no describen el frame
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + size;
    }
  }

  return { width: 0, height: 0 };
}
