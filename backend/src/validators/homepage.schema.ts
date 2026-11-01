import { z } from 'zod';

export const heroSlideSelectionSchema = z.object({
  propertyId: z.string().min(1).max(100),
  imageUrl: z.string().min(1).max(2048),
});

// La lectura tolera selecciones anteriores de cuatro fotos. Un nuevo guardado
// siempre debe cumplir el contrato actual de diez propiedades diferentes.
export const storedHomepageSelectionSchema = z.array(heroSlideSelectionSchema).max(10);

export const homepageInputSchema = z.object({
  selection: z.array(heroSlideSelectionSchema)
    .length(10, 'Elegí exactamente diez propiedades para la portada.')
    .refine((selection) => new Set(selection.map((slide) => slide.propertyId)).size === selection.length, {
      message: 'Elegí diez propiedades diferentes, con una foto de cada una.',
    })
    .refine((selection) => new Set(selection.map((slide) => slide.imageUrl)).size === selection.length, {
      message: 'Elegí diez fotos diferentes.',
    }),
});

export type HeroSlideSelection = z.infer<typeof heroSlideSelectionSchema>;
