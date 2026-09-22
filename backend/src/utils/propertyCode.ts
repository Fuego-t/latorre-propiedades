/**
 * Genera un código de propiedad legible y único, por ejemplo "LP-2409-X7K2".
 * Se usa un prefijo con año/mes para que el equipo pueda ubicar rápidamente
 * cuándo se cargó la propiedad, y un sufijo aleatorio para evitar colisiones.
 */
export function generatePropertyCode(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LP-${yy}${mm}-${random}`;
}
