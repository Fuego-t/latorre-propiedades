// Coordenadas aproximadas (no catastrales) para poder "mover" el mapa a la zona
// elegida en el filtro de Provincia/Ciudad. Se usan en este orden de prioridad
// (ver `resolveFlyTarget` más abajo):
//   1. Localidades que ya están cargadas en la base de datos (Location), que tienen
//      coordenadas reales y precisas — esas SIEMPRE ganan.
//   2. Esta tabla de coordenadas de ciudades conocidas de Argentina (aproximadas,
//      sirven para acercar el mapa a la zona correcta, no para ubicar una dirección
//      exacta).
//   3. Si no hay coordenada de la ciudad puntual, el centro (capital) de la
//      provincia elegida, así al menos el mapa se mueve a la región correcta.
import type { ArgentinaProvincia } from './argentinaLocalidades';

// [latitud, longitud] de la capital de cada provincia — se usa como "centro" de
// esa provincia cuando no tenemos la coordenada exacta de la ciudad elegida.
export const PROVINCIA_CENTRO: Record<ArgentinaProvincia, [number, number]> = {
  'Buenos Aires': [-34.9215, -57.9545],
  'Ciudad Autónoma de Buenos Aires': [-34.6037, -58.3816],
  Catamarca: [-28.4696, -65.7852],
  Chaco: [-27.4512, -58.9867],
  Chubut: [-43.3002, -65.1023],
  Córdoba: [-31.4201, -64.1888],
  Corrientes: [-27.4692, -58.8306],
  'Entre Ríos': [-31.7333, -60.5297],
  Formosa: [-26.1849, -58.1731],
  Jujuy: [-24.1858, -65.2995],
  'La Pampa': [-36.6167, -64.2833],
  'La Rioja': [-29.4131, -66.8558],
  Mendoza: [-32.8895, -68.8458],
  Misiones: [-27.3671, -55.8961],
  Neuquén: [-38.9516, -68.0591],
  'Río Negro': [-40.8135, -62.9967],
  Salta: [-24.7859, -65.4117],
  'San Juan': [-31.5375, -68.5364],
  'San Luis': [-33.295, -66.3356],
  'Santa Cruz': [-51.623, -69.2168],
  'Santa Fe': [-31.6333, -60.7],
  'Santiago del Estero': [-27.7834, -64.2642],
  'Tierra del Fuego': [-54.8019, -68.303],
  Tucumán: [-26.8241, -65.2226],
};

// Coordenadas aproximadas de ciudades/localidades puntuales. Las claves tienen que
// coincidir exactamente con los nombres usados en ARGENTINA_LOCALIDADES.
export const CIUDAD_COORDENADAS: Record<string, [number, number]> = {
  // --- Buenos Aires ---
  'Mar del Plata': [-38.0055, -57.5426],
  'Bahía Blanca': [-38.7196, -62.2724],
  Tandil: [-37.3217, -59.1332],
  Olavarría: [-36.8927, -60.3225],
  Pergamino: [-33.8944, -60.5738],
  'San Nicolás de los Arroyos': [-33.3333, -60.2167],
  Junín: [-34.5833, -60.95],
  Necochea: [-38.5545, -58.7392],
  Azul: [-36.777, -59.8586],
  Chivilcoy: [-34.8964, -60.0158],
  Merlo: [-34.6667, -58.7333],
  Moreno: [-34.65, -58.7833],
  Morón: [-34.6534, -58.6198],
  'San Miguel': [-34.5411, -58.7108],
  'San Isidro': [-34.4708, -58.5083],
  'Vicente López': [-34.5267, -58.4772],
  Tigre: [-34.4264, -58.58],
  Escobar: [-34.348, -58.793],
  Pilar: [-34.4586, -58.9147],
  Luján: [-34.5703, -59.1051],
  Quilmes: [-34.7206, -58.2542],
  Avellaneda: [-34.6626, -58.3654],
  Lanús: [-34.7061, -58.3925],
  'Lomas de Zamora': [-34.7614, -58.4058],
  'Almirante Brown': [-34.8167, -58.4],
  'Esteban Echeverría': [-34.8167, -58.4667],
  Ezeiza: [-34.8481, -58.5312],
  'Florencio Varela': [-34.8167, -58.2833],
  Berazategui: [-34.7667, -58.2167],
  'La Matanza': [-34.7639, -58.6231],
  'Malvinas Argentinas': [-34.5167, -58.7167],
  'José C. Paz': [-34.5167, -58.7667],
  'San Fernando': [-34.4406, -58.5581],
  Hurlingham: [-34.5906, -58.6372],
  Ituzaingó: [-34.6614, -58.6706],
  'Tres de Febrero': [-34.6014, -58.5636],
  'General San Martín': [-34.5747, -58.5364],
  Zárate: [-34.0975, -59.0278],
  Campana: [-34.1642, -58.9581],
  Chascomús: [-35.5744, -58.0011],
  Dolores: [-36.3133, -57.6786],
  Balcarce: [-37.85, -58.25],
  'Coronel Brandsen': [-35.1667, -58.2333],
  Jeppener: [-35.1, -58.2833],
  Gómez: [-35.15, -58.1667],
  Oliden: [-35.2333, -58.3167],
  Ranchos: [-35.5833, -58.3667],
  'General Paz': [-35.5833, -58.3167],
  Magdalena: [-35.0833, -57.5167],
  'Punta Indio': [-35.3667, -57.3167],
  'General Belgrano': [-35.7667, -58.5],
  'Las Flores': [-36.0167, -59.1],
  Monte: [-35.45, -58.8],
  Cañuelas: [-35.05, -58.75],
  'San Vicente': [-35.0333, -58.4167],
  'Presidente Perón': [-34.9333, -58.3333],
  Rauch: [-36.7833, -59.0833],
  Ayacucho: [-37.15, -58.4833],
  Tapalqué: [-36.3667, -60.0167],
  Bolívar: [-36.2333, -61.1167],
  'General Alvear': [-36.0333, -60.0167],
  'General Viamonte': [-34.8667, -61.1167],
  Suipacha: [-34.7667, -59.6833],
  Alberti: [-35.0333, -60.35],
  Chacabuco: [-34.6333, -60.4667],
  '9 de Julio': [-35.45, -60.8833],
  Lincoln: [-34.8667, -61.5167],
  'General Pinto': [-34.2333, -61.8833],
  'General Villegas': [-35.0333, -63.0167],
  'Trenque Lauquen': [-35.9667, -62.7333],
  Pehuajó: [-35.8, -61.9],
  'Carlos Casares': [-35.6167, -61.3833],
  Bragado: [-35.1167, -60.4833],
  Saladillo: [-35.6333, -59.7833],
  'Roque Pérez': [-35.4, -59.3833],
  '25 de Mayo': [-35.4333, -60.1667],
  Pinamar: [-37.1069, -56.8614],
  'Villa Gesell': [-37.2633, -56.9736],
  'General Madariaga': [-37.0, -57.1333],
  'Mar Chiquita': [-37.75, -57.4167],
  Miramar: [-38.2667, -57.8333],
  'San Cayetano': [-38.35, -59.5],
  'Tres Arroyos': [-38.3833, -60.2833],
  'Coronel Dorrego': [-38.7167, -61.2667],
  'Coronel Pringles': [-37.9667, -61.3667],
  'Coronel Suárez': [-37.45, -61.9333],
  Puan: [-37.55, -62.7667],
  'Adolfo Alsina': [-37.2167, -62.75],
  Guaminí: [-37.0167, -62.4],
  Pellegrini: [-36.65, -62.95],
  Tornquist: [-38.1, -62.2333],
  Saavedra: [-37.9667, -62.9333],
  Laprida: [-37.55, -60.7833],
  'Benito Juárez': [-37.6667, -59.8],
  Daireaux: [-36.6, -61.75],
  Salliqueló: [-36.3, -62.9667],
  'Tres Lomas': [-36.4667, -62.8667],
  'Hipólito Yrigoyen': [-34.95, -61.8167],
  Rivadavia: [-35.2833, -62.8833],
  América: [-35.4833, -62.9833],
  Baradero: [-33.8083, -59.5069],
  'San Pedro': [-33.6803, -59.665],
  Ramallo: [-33.4833, -60.0167],
  'San Antonio de Areco': [-34.2597, -59.4781],
  'Capitán Sarmiento': [-34.1667, -59.7833],
  Arrecifes: [-34.0667, -60.1],
  Colón: [-34.2833, -60.1],
  Salto: [-34.2833, -60.25],
  Rojas: [-34.2, -60.7333],
  Navarro: [-35.0, -59.2667],
  Mercedes: [-34.65, -59.4333],
  Suárez: [-37.45, -61.9333],
  'General Las Heras': [-34.9333, -58.9333],
  'Marcos Paz': [-34.7833, -58.8333],

  // --- Córdoba ---
  Córdoba: [-31.4201, -64.1888],
  'Villa Carlos Paz': [-31.4241, -64.4978],
  'Río Cuarto': [-33.1232, -64.3492],
  'Villa María': [-32.4076, -63.2401],
  'San Francisco': [-31.4272, -62.0836],
  'Alta Gracia': [-31.6539, -64.4283],
  'Jesús María': [-30.9789, -64.0956],
  Cosquín: [-31.2447, -64.4658],
  'La Falda': [-31.0872, -64.4881],
  'Bell Ville': [-32.6272, -62.6889],
  Morteros: [-30.7167, -61.9833],
  'Marcos Juárez': [-32.6975, -62.1058],
  'Río Tercero': [-32.1761, -64.1136],
  'Villa Dolores': [-31.9439, -65.1889],
  'Deán Funes': [-30.4292, -64.3606],
  'Cruz del Eje': [-30.7267, -64.8017],
  Laboulaye: [-34.13, -63.3986],
  Oncativo: [-32.1153, -63.6994],
  Arroyito: [-31.4183, -63.0464],
  'Las Varillas': [-31.8781, -62.7106],
  'Villa General Belgrano': [-31.9833, -64.55],
  'Capilla del Monte': [-30.85, -64.5167],
  Oliva: [-32.0403, -63.5794],
  'Río Segundo': [-31.6547, -63.9067],

  // --- Santa Fe ---
  Rosario: [-32.9468, -60.6393],
  Rafaela: [-31.2503, -61.4867],
  'Venado Tuerto': [-33.7461, -61.9689],
  Reconquista: [-29.15, -59.65],
  'Villa Constitución': [-33.2333, -60.3333],
  'San Lorenzo': [-32.75, -60.7333],
  Casilda: [-33.05, -61.1667],
  Esperanza: [-31.45, -60.9333],
  'Cañada de Gómez': [-32.8167, -61.4],
  Sunchales: [-30.95, -61.5667],
  Firmat: [-33.4667, -61.5],
  'San Justo': [-30.7833, -60.5833],
  Vera: [-29.4667, -60.2167],
  'Las Parejas': [-32.6833, -61.5333],
  Coronda: [-31.9667, -60.9167],
  'Santo Tomé': [-31.6667, -60.7667],
  Gálvez: [-32.0333, -61.2167],
  Totoras: [-32.5833, -61.1833],

  // --- Mendoza ---
  Mendoza: [-32.8895, -68.8458],
  'San Rafael': [-34.6177, -68.3301],
  'Godoy Cruz': [-32.9264, -68.8272],
  Guaymallén: [-32.8967, -68.7817],
  'Las Heras': [-32.85, -68.8283],
  Maipú: [-32.9833, -68.7833],
  'Luján de Cuyo': [-33.0333, -68.8667],
  Tunuyán: [-33.5833, -69.0167],
  Tupungato: [-33.3833, -69.15],
  'San Martín': [-33.0833, -68.4667],
  Malargüe: [-35.475, -69.5833],

  // --- Tucumán ---
  'San Miguel de Tucumán': [-26.8241, -65.2226],
  'Tafí Viejo': [-26.7333, -65.25],
  'Yerba Buena': [-26.8167, -65.3167],
  Concepción: [-27.3333, -65.5833],
  'Banda del Río Salí': [-26.8167, -65.1667],
  Aguilares: [-27.4333, -65.6167],
  Monteros: [-27.1667, -65.5],
  Famaillá: [-27.05, -65.4],
  'Tafí del Valle': [-26.85, -65.6833],

  // --- Salta ---
  Salta: [-24.7859, -65.4117],
  Tartagal: [-22.5333, -63.8],
  Orán: [-23.1333, -64.3333],
  'General Güemes': [-24.6667, -65.05],
  Metán: [-25.4833, -64.9667],
  'Rosario de la Frontera': [-25.8, -64.9667],
  Cafayate: [-26.0725, -65.9761],
  Cerrillos: [-24.9, -65.4833],

  // --- Jujuy ---
  'San Salvador de Jujuy': [-24.1858, -65.2995],
  Palpalá: [-24.25, -65.2167],
  'Libertador General San Martín': [-23.8, -64.7833],
  'San Pedro de Jujuy': [-24.2333, -64.8667],
  Perico: [-24.3833, -65.1167],
  Humahuaca: [-23.2081, -65.35],
  Tilcara: [-23.5833, -65.4],
  'La Quiaca': [-22.105, -65.6014],

  // --- Misiones ---
  Posadas: [-27.3671, -55.8961],
  Oberá: [-27.4861, -55.1197],
  Eldorado: [-26.4008, -54.6417],
  'Puerto Iguazú': [-25.5975, -54.573],
  'Puerto Rico': [-26.7833, -55.0167],
  Apóstoles: [-27.9167, -55.75],
  'Leandro N. Alem': [-27.6, -55.3333],
  'Jardín América': [-27.05, -55.2167],
  Montecarlo: [-26.5667, -54.7667],

  // --- Corrientes ---
  Corrientes: [-27.4692, -58.8306],
  Goya: [-29.1394, -59.265],
  'Curuzú Cuatiá': [-29.79, -58.05],
  'Paso de los Libres': [-29.71, -57.09],
  Esquina: [-30.0, -59.5333],
  'Bella Vista': [-28.5083, -59.0389],

  // --- Entre Ríos ---
  Paraná: [-31.7333, -60.5297],
  Concordia: [-31.3931, -58.0198],
  Gualeguaychú: [-33.0094, -58.5172],
  Gualeguay: [-33.1417, -59.3106],
  'Concepción del Uruguay': [-32.4833, -58.2333],
  Villaguay: [-31.8667, -59.0167],
  Victoria: [-32.6167, -60.1667],
  Chajarí: [-30.75, -57.9833],
  'La Paz': [-30.7333, -59.6333],
  Nogoyá: [-32.3833, -59.7833],
  Diamante: [-32.0667, -60.6333],

  // --- Chaco ---
  Resistencia: [-27.4512, -58.9867],
  'Presidencia Roque Sáenz Peña': [-26.7833, -60.4333],
  'Villa Ángela': [-27.5833, -60.7167],
  Charata: [-27.2167, -61.2],
  'Las Breñas': [-27.0833, -61.1],
  Machagai: [-26.9333, -60.05],
  Barranqueras: [-27.4833, -58.9333],
  Quitilipi: [-27.0, -60.2167],

  // --- Formosa ---
  Formosa: [-26.1849, -58.1731],
  Clorinda: [-25.2833, -57.7167],
  Pirané: [-25.7333, -59.1167],
  'El Colorado': [-26.3, -59.3667],
  'Las Lomitas': [-24.7, -60.5833],

  // --- Santiago del Estero ---
  'Santiago del Estero': [-27.7834, -64.2642],
  'La Banda': [-27.7333, -64.2333],
  'Termas de Río Hondo': [-27.5, -64.8583],
  Añatuya: [-28.4667, -62.8333],
  Frías: [-28.6333, -65.1333],

  // --- Catamarca ---
  'San Fernando del Valle de Catamarca': [-28.4696, -65.7852],
  Andalgalá: [-27.5833, -66.3167],
  Belén: [-27.65, -67.0333],
  'Santa María': [-26.6833, -66.0333],
  Recreo: [-29.2667, -65.0667],
  Tinogasta: [-28.0667, -67.5667],

  // --- La Rioja ---
  'La Rioja': [-29.4131, -66.8558],
  Chilecito: [-29.1667, -67.5],
  Aimogasta: [-28.55, -66.8167],
  Chamical: [-30.35, -66.3167],

  // --- San Juan ---
  'San Juan': [-31.5375, -68.5364],
  Chimbas: [-31.4833, -68.5333],
  'Santa Lucía': [-31.5333, -68.5],
  Pocito: [-31.65, -68.6],
  Caucete: [-31.65, -68.2667],
  Jáchal: [-30.2333, -68.75],

  // --- San Luis ---
  'San Luis': [-33.295, -66.3356],
  'Villa Mercedes': [-33.6803, -65.4598],
  // Merlo (San Luis) vive en CIUDAD_AMBIGUA_POR_PROVINCIA: el nombre se repite
  // con Merlo (Buenos Aires) y acá el segundo pisaba silenciosamente al primero.
  Concarán: [-32.5167, -65.2167],
  'La Toma': [-33.0667, -65.5667],

  // --- La Pampa ---
  'Santa Rosa': [-36.6167, -64.2833],
  'General Pico': [-35.6667, -63.75],
  Toay: [-36.6667, -64.3833],
  Realicó: [-35.0333, -64.2667],
  'Eduardo Castex': [-35.9167, -64.2833],
  Victorica: [-36.2167, -65.4333],

  // --- Neuquén ---
  Neuquén: [-38.9516, -68.0591],
  Plottier: [-38.9667, -68.2333],
  Centenario: [-38.8167, -68.1333],
  'San Martín de los Andes': [-40.1576, -71.3527],
  'Villa La Angostura': [-40.7614, -71.6497],
  Zapala: [-38.9022, -70.0619],
  'Junín de los Andes': [-39.95, -71.0667],
  'Chos Malal': [-37.3789, -70.2711],

  // --- Río Negro ---
  Viedma: [-40.8135, -62.9967],
  'San Carlos de Bariloche': [-41.1335, -71.3103],
  'General Roca': [-39.0333, -67.5833],
  Cipolletti: [-38.9333, -67.9833],
  'Villa Regina': [-39.1, -67.0667],
  'Cinco Saltos': [-38.8167, -68.0667],
  'El Bolsón': [-41.9667, -71.5333],
  'Choele Choel': [-39.2833, -65.6833],

  // --- Chubut ---
  Rawson: [-43.3002, -65.1023],
  'Comodoro Rivadavia': [-45.8647, -67.4966],
  Trelew: [-43.2489, -65.3051],
  'Puerto Madryn': [-42.7692, -65.0385],
  Esquel: [-42.9092, -71.3197],
  Trevelin: [-43.0872, -71.4692],
  Gaiman: [-43.2833, -65.4833],
  Sarmiento: [-45.5833, -69.0667],
  'Puerto Pirámides': [-42.5772, -64.2822],

  // --- Santa Cruz ---
  'Río Gallegos': [-51.623, -69.2168],
  'Caleta Olivia': [-46.4333, -67.5333],
  'Puerto Deseado': [-47.75, -65.9],
  'El Calafate': [-50.3379, -72.2648],
  'Pico Truncado': [-46.7833, -67.9667],
  'Puerto San Julián': [-49.3057, -67.7218],
  'Perito Moreno': [-46.5833, -70.9333],

  // --- Tierra del Fuego ---
  Ushuaia: [-54.8019, -68.303],
  'Río Grande': [-53.7881, -67.7078],
  Tolhuin: [-54.5167, -67.2],

  // --- CABA (todos los barrios listados, aproximados) ---
  Palermo: [-34.5875, -58.4205],
  Recoleta: [-34.5875, -58.3974],
  Belgrano: [-34.5623, -58.4569],
  Caballito: [-34.6187, -58.4407],
  'Villa Urquiza': [-34.5761, -58.4903],
  Núñez: [-34.5453, -58.4633],
  Colegiales: [-34.5744, -58.4489],
  Almagro: [-34.6068, -58.421],
  Flores: [-34.6291, -58.4633],
  'Villa Crespo': [-34.5989, -58.4396],
  Boedo: [-34.628, -58.4174],
  'San Telmo': [-34.6212, -58.3731],
  'Puerto Madero': [-34.6083, -58.3639],
  Retiro: [-34.5921, -58.3742],
  Barracas: [-34.6459, -58.3822],
  Constitución: [-34.6265, -58.381],
  'Balvanera (Once)': [-34.6092, -58.4013],
  'Villa del Parque': [-34.6027, -58.4956],
  Coghlan: [-34.5648, -58.4726],
  'Villa Devoto': [-34.5989, -58.5222],
  Liniers: [-34.6428, -58.5253],
  Mataderos: [-34.6597, -58.5089],
  'Parque Patricios': [-34.6389, -58.4014],
  Chacarita: [-34.5875, -58.4548],
  Monserrat: [-34.6118, -58.3814],
  'Villa Luro': [-34.6386, -58.5039],
  Versalles: [-34.6242, -58.535],
  Floresta: [-34.628, -58.4838],
  'Parque Chas': [-34.585, -58.4756],
};

/**
 * Ciudades cuyo nombre se repite en más de una provincia. CIUDAD_COORDENADAS es
 * un objeto plano, así que no puede tener dos veces la misma clave: estas se
 * resuelven mirando también la provincia elegida.
 */
export const CIUDAD_AMBIGUA_POR_PROVINCIA: Record<string, Record<string, [number, number]>> = {
  'Buenos Aires': { Merlo: [-34.6667, -58.7333] },
  'San Luis': { Merlo: [-32.3453, -65.0139] },
};

/**
 * Devuelve a dónde tiene que "volar" el mapa cuando el usuario elige una provincia +
 * ciudad y toca "Ver resultados". `undefined`/`null` significa "no mover el mapa".
 */
export function resolveFlyTarget(
  location: string | undefined,
  province: string,
  dbCoords: Record<string, { lat: number; lng: number }>
): { lat: number; lng: number; zoom: number } | null {
  if (!location) return null;

  // 1) Localidad real cargada en la base de datos: la más precisa.
  if (dbCoords[location]) {
    return { ...dbCoords[location], zoom: 14 };
  }

  // 2) Ciudad con nombre repetido en varias provincias: desempata la provincia.
  const ambiguous = CIUDAD_AMBIGUA_POR_PROVINCIA[province]?.[location];
  if (ambiguous) {
    return { lat: ambiguous[0], lng: ambiguous[1], zoom: 12 };
  }

  // 3) Ciudad conocida en la tabla armada a mano.
  const cityCoords = CIUDAD_COORDENADAS[location];
  if (cityCoords) {
    return { lat: cityCoords[0], lng: cityCoords[1], zoom: 12 };
  }

  // 4) Último recurso: el centro de la provincia elegida.
  const provinceCoords = PROVINCIA_CENTRO[province as ArgentinaProvincia];
  if (provinceCoords) {
    return { lat: provinceCoords[0], lng: provinceCoords[1], zoom: 7 };
  }

  return null;
}
