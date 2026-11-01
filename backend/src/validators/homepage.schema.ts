import { z } from 'zod';

export const heroSlideSelectionSchema = z.object({
  propertyId: z.string().min(1).max(100),
  imageUrl: z.string().min(1).max(2048),
});

export const homepageInputSchema = z.object({
  selection: z.array(heroSlideSelectionSchema)
    .length(4, 'Elegí exactamente cuatro fotos para la portada.')
    .refine((selection) => new Set(selection.map((slide) => slide.imageUrl)).size === 4, {
      message: 'Elegí cuatro fotos diferentes.',
    }),
});

export type HeroSlideSelection = z.infer<typeof heroSlideSelectionSchema>;
