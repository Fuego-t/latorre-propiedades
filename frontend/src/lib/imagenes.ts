/**
 * Pide a Cloudinary la foto en la medida justa para dónde se va a mostrar.
 *
 * Importa por dos razones:
 *
 * 1. Peso. Sin esto se descarga la foto entera aunque se muestre en una
 *    miniatura de 200 px, y en el celular con datos eso se siente.
 *
 * 2. Nitidez. `c_limit` achica pero NUNCA agranda. Las fotos que vinieron del
 *    sitio viejo son chicas —la mediana es de 536 px de ancho— y estirarlas las
 *    pixela. Con este recorte se muestran a lo sumo en su tamaño real.
 *
 * `f_auto` entrega el formato más liviano que soporte el navegador y `q_auto`
 * ajusta la compresión sin que se note.
 *
 * Si la URL no es de Cloudinary (por ejemplo una foto vieja guardada en disco)
 * se devuelve tal cual, sin romper nada.
 */
export function urlFoto(url: string, ancho: number): string {
  const marca = '/image/upload/';
  const corte = url.indexOf(marca);
  if (corte === -1) return url;

  const inicio = corte + marca.length;
  const transformacion = `f_auto,q_auto:good,c_limit,w_${ancho}/`;

  // Si ya tiene transformaciones aplicadas, no se encadenan otras.
  const resto = url.slice(inicio);
  if (/^[a-z]+_[^/]+\//.test(resto)) return url;

  return url.slice(0, inicio) + transformacion + resto;
}

/** Medidas que se usan en cada lugar, para no repetir números sueltos. */
export const ANCHO = {
  miniatura: 320,
  tarjeta: 760,
  grilla: 620,
  principal: 1280,
  pantallaCompleta: 1600,
} as const;

/**
 * Traduce el punto elegido a la propiedad `object-position` de CSS.
 *
 * Sólo tiene efecto donde la foto se recorta para entrar (object-cover): las
 * tarjetas del listado y la vista previa del mapa. Si nadie eligió nada, queda
 * centrada, que es como venía funcionando.
 */
export function encuadre(imagen?: { focusX?: number; focusY?: number } | null): string {
  const x = imagen?.focusX ?? 0.5;
  const y = imagen?.focusY ?? 0.5;
  return `${Math.round(x * 100)}% ${Math.round(y * 100)}%`;
}
