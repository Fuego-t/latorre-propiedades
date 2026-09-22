import { z } from 'zod';

/**
 * Opciones fijas de "Interés" para el panel de Agendar cita. Es una lista más amplia
 * que el `PropertyType` interno (que se usa para clasificar las propiedades cargadas),
 * pensada para cubrir todo lo que un cliente potencial podría estar buscando.
 */
export const LEAD_INTEREST_OPTIONS = [
  'Casa',
  'Departamento',
  'Campo',
  'Lote/Terreno',
  'PH',
  'Quinta',
  'Chacra',
  'Local Comercial',
  'Galpón',
  'Oficina',
  'Depósito',
  'Complejo',
  'Fondo de Comercio',
  'Edificio',
  'Cochera',
  'Dúplex',
  'Tríplex',
  'Casa Quinta',
] as const;

export const leadInterestEnum = z.enum(LEAD_INTEREST_OPTIONS);
export const leadOperationEnum = z.enum(['RENT', 'SELL', 'BUY']);

export const leadInputSchema = z.object({
  name: z.string().min(2, 'Ingresá tu nombre').max(120),
  phone: z.string().trim().min(6, 'Ingresá un teléfono de contacto').max(40),
  // Opcional: si viene vacío ('' o no viene) se guarda como "sin email". Si viene con
  // contenido, tiene que tener formato de email válido.
  email: z
    .union([z.string().trim().email('Ingresá un email válido'), z.literal('')])
    .optional()
    .transform((v) => (v ? v : undefined)),
  interest: leadInterestEnum,
  operation: leadOperationEnum,
  propertyId: z.string().optional().nullable(),
  propertyTitle: z.string().max(200).optional().nullable(),
});