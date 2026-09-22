import type { Currency, LeadOperation, OperationType, PropertyStatus, PropertyType } from '../types';

/** Las propiedades sin precio cargado se muestran como "Consultar precio". */
export function formatPrice(price: number | null | undefined, currency: Currency): string {
  if (price == null) return 'Consultar precio';
  const symbol = currency === 'USD' ? 'U$S' : '$';
  const formatted = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(price);
  return `${symbol} ${formatted}`;
}

export const OPERATION_LABELS: Record<OperationType, string> = {
  SALE: 'Venta',
  COMMERCIAL_RENT: 'Alquiler comercial',
  RESIDENTIAL_RENT: 'Alquiler de vivienda',
};

export const OPERATION_SHORT_LABELS: Record<OperationType, string> = {
  SALE: 'Venta',
  COMMERCIAL_RENT: 'Alq. comercial',
  RESIDENTIAL_RENT: 'Alq. vivienda',
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  HOUSE: 'Casa',
  APARTMENT: 'Departamento',
  COMMERCIAL_UNIT: 'Local comercial',
  OFFICE: 'Oficina',
  LAND: 'Terreno',
  FIELD: 'Campo',
  COUNTRY_HOUSE: 'Quinta',
  OTHER: 'Otro',
};

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Reservada',
  SOLD: 'Vendida',
  RENTED: 'Alquilada',
  PAUSED: 'Pausada',
  HIDDEN: 'Oculta',
};

// Colores de marcador según la sección 4 del spec
export const OPERATION_COLORS: Record<OperationType, string> = {
  SALE: '#C9A227', // amarillo/dorado
  COMMERCIAL_RENT: '#1B4332', // verde oscuro
  RESIDENTIAL_RENT: '#74C69D', // verde claro
};

export function formatArea(value?: number | null): string | null {
  if (value === null || value === undefined) return null;
  return `${new Intl.NumberFormat('es-AR').format(value)} m²`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

// Opciones fijas para el panel de "Agendar cita" (captación de clientes potenciales).
// Es una lista más amplia que PROPERTY_TYPE_LABELS, pensada para cubrir cualquier
// interés que exprese un visitante, no sólo los tipos de propiedad que cargamos nosotros.
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

export const LEAD_OPERATION_LABELS: Record<LeadOperation, string> = {
  RENT: 'Alquilar',
  SELL: 'Vender',
  BUY: 'Comprar',
};
