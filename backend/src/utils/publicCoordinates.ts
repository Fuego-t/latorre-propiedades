/**
 * Reglas de privacidad de ubicación (ver sección 9 del spec):
 * - Propiedades donde showExactLocation=false: se publica una posición
 *   aproximada, con un desplazamiento aleatorio de hasta ~120 metros,
 *   determinístico por id para que el marcador no "salte" entre requests.
 * - Propiedades donde showExactLocation=true (comerciales, si el admin
 *   lo decide): se publica la coordenada real.
 */

const MAX_OFFSET_METERS = 120;

/** Hash simple y estable para convertir un string en un número 0..1 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  // Normaliza a [0, 1)
  return (Math.abs(hash) % 100000) / 100000;
}

export function computePublicCoordinates(params: {
  id: string;
  latitude: number;
  longitude: number;
  showExactLocation: boolean;
}): { publicLatitude: number; publicLongitude: number } {
  const { id, latitude, longitude, showExactLocation } = params;

  if (showExactLocation) {
    return { publicLatitude: latitude, publicLongitude: longitude };
  }

  const angle = seededRandom(`${id}-angle`) * 2 * Math.PI;
  const distance = seededRandom(`${id}-dist`) * MAX_OFFSET_METERS;

  // Aproximación local: 1 grado de latitud ~ 111,320 metros
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLon = 111320 * Math.cos((latitude * Math.PI) / 180);

  const deltaLat = (distance * Math.sin(angle)) / metersPerDegreeLat;
  const deltaLon = (distance * Math.cos(angle)) / metersPerDegreeLon;

  return {
    publicLatitude: latitude + deltaLat,
    publicLongitude: longitude + deltaLon,
  };
}
