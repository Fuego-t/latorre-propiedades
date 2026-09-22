import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../middleware/errorHandler';
import { prisma } from '../../lib/prisma';
import { deletePropertyImage, uploadPropertyImage } from '../../services/image.service';

interface PropertyImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  order: number;
  isMain: boolean;
}

export const uploadImages = asyncHandler(async (req: Request, res: Response) => {
  const property = await prisma.property.findUnique({ where: { id: req.params.id } });
  if (!property) throw new ApiError(404, 'Propiedad no encontrada');

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new ApiError(400, 'No se recibió ninguna imagen');

  const existing = (property.images as unknown as PropertyImage[]) ?? [];
  let nextOrder = existing.length;

  const uploaded: PropertyImage[] = [];
  for (const file of files) {
    const result = await uploadPropertyImage(file.buffer, file.originalname, file.mimetype);
    uploaded.push({
      url: result.url,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
      order: nextOrder++,
      isMain: existing.length === 0 && uploaded.length === 0,
    });
  }

  const images = [...existing, ...uploaded];

  const updated = await prisma.property.update({
    where: { id: property.id },
    data: { images: images as never },
  });

  res.status(201).json({ ok: true, images: updated.images });
});

export const deleteImage = asyncHandler(async (req: Request, res: Response) => {
  const property = await prisma.property.findUnique({ where: { id: req.params.id } });
  if (!property) throw new ApiError(404, 'Propiedad no encontrada');

  const images = ((property.images as unknown as PropertyImage[]) ?? []).filter(
    (img) => img.publicId !== req.params.imageId
  );

  await deletePropertyImage(req.params.imageId);

  const updated = await prisma.property.update({
    where: { id: property.id },
    data: { images: images as never },
  });

  res.json({ ok: true, images: updated.images });
});

export const reorderImages = asyncHandler(async (req: Request, res: Response) => {
  const { images } = req.body as { images: PropertyImage[] };
  const property = await prisma.property.update({
    where: { id: req.params.id },
    data: { images: images as never },
  });
  res.json({ ok: true, images: property.images });
});
