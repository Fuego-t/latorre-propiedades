// Configuración del mapa: OpenStreetMap + Leaflet.
// No requiere token ni cuenta — usa los tiles públicos de OpenStreetMap.
//
// Nota para producción: los tiles públicos de tile.openstreetmap.org tienen
// una política de uso pensada para tráfico bajo/moderado. Si Latorre
// Propiedades crece mucho en visitas, conviene pasar a un proveedor de tiles
// pago (MapTiler, Mapbox, Stadia Maps, etc.) cambiando sólo `TILE_LAYER_URL`
// y `TILE_LAYER_ATTRIBUTION` de este archivo.

// [lat, lng] — Leaflet usa este orden (a diferencia de Mapbox que usa [lng, lat])
export const DEFAULT_MAP_CENTER: [number, number] = [-35.1667, -58.2333];
export const DEFAULT_MAP_ZOOM = 12.5;

export const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_LAYER_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
