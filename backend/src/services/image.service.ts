import { cloudinary, isCloudinaryConfigured } from '../lib/cloudinary';
import { env } from '../config/env';
import { deleteLocalImage, isLocalImage, saveImageLocally } from './localStorage.service';

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

/**
 * Sube un buffer de imagen a Cloudinary con compresión automática,
 * conversión a WebP y un límite de tamaño razonable.
 *
 * Si Cloudinary todavía no está configurado (falta CLOUDINARY_* en .env),
 * la foto se guarda en la carpeta `uploads/` del backend y se sirve desde
 * el mismo servidor. Así el panel se puede usar desde el día uno, y el día
 * que se completen las credenciales las fotos nuevas van a Cloudinary sin
 * tocar una línea de código (las viejas siguen funcionando igual).
 */
export async function uploadPropertyImage(
  buffer: Buffer,
  filename: string,
  mimeType = 'image/jpeg'
): Promise<UploadedImage> {
  if (!isCloudinaryConfigured) {
    return saveImageLocally(buffer, filename, mimeType);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.cloudinary.folder,
        resource_type: 'image',
        format: 'webp',
        quality: 'auto:good',
        filename_override: filename,
        use_filename: true,
        unique_filename: true,
        transformation: [{ width: 2000, height: 2000, crop: 'limit' }],
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error('No se pudo subir la imagen'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      }
    );
    stream.end(buffer);
  });
}

export async function deletePropertyImage(publicId: string): Promise<void> {
  if (isLocalImage(publicId)) return deleteLocalImage(publicId);
  if (!isCloudinaryConfigured) return;
  await cloudinary.uploader.destroy(publicId).catch(() => null);
}
