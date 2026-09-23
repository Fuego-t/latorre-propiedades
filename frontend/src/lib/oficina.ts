// Datos del local de Latorre Propiedades.
//
// Aparece en el mapa como un pin rojo, distinto de los de las propiedades, y al
// tocarlo muestra la foto del frente y los horarios en vez de un precio.

export const OFICINA = {
  nombre: 'Latorre Propiedades',
  bajada: 'Nuestra oficina',
  direccion: 'Av. Rivadavia 112',
  entreCalles: 'entre Alberti y Larrea',
  localidad: 'Coronel Brandsen',
  // Verificadas con el geocodificador oficial (Georef): "AV RIVADAVIA 112".
  latitud: -35.170663,
  longitud: -58.233463,
  foto: '/oficina-latorre.webp',
  color: '#D64545',
} as const;

/** 1 = lunes … 6 = sábado, 0 = domingo (igual que Date.getDay). */
export interface Tramo {
  desde: string;
  hasta: string;
}

export const HORARIOS: Record<number, Tramo[]> = {
  1: [{ desde: '09:00', hasta: '12:00' }, { desde: '16:00', hasta: '19:00' }],
  2: [{ desde: '09:00', hasta: '12:00' }, { desde: '16:00', hasta: '19:00' }],
  3: [{ desde: '09:00', hasta: '12:00' }, { desde: '16:00', hasta: '19:00' }],
  4: [{ desde: '09:00', hasta: '12:00' }, { desde: '16:00', hasta: '19:00' }],
  5: [{ desde: '09:00', hasta: '12:00' }, { desde: '16:00', hasta: '19:00' }],
  6: [{ desde: '09:00', hasta: '12:00' }],
  0: [],
};

/** Cómo se muestran los horarios, agrupados. */
export const HORARIOS_TEXTO = [
  { dias: 'Lunes a viernes', horas: '09:00 a 12:00 y 16:00 a 19:00' },
  { dias: 'Sábados', horas: '09:00 a 12:00' },
  { dias: 'Domingos', horas: 'Cerrado' },
] as const;

const aMinutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export interface EstadoOficina {
  abierto: boolean;
  /** Frase corta para mostrar al lado del cartel: "Cierra 19:00", "Abre mañana 09:00". */
  detalle: string;
}

/**
 * Dice si el local está abierto en este momento y cuándo es el próximo cambio.
 *
 * Usa la hora del dispositivo de quien mira. Para alguien que está en la zona
 * —que es el caso real— coincide con la hora local; si entra desde otro huso
 * horario el cartel puede no ser exacto, y por eso los horarios completos se
 * muestran siempre debajo.
 */
export function estadoOficina(ahora = new Date()): EstadoOficina {
  const dia = ahora.getDay();
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();

  for (const tramo of HORARIOS[dia] ?? []) {
    if (minutos >= aMinutos(tramo.desde) && minutos < aMinutos(tramo.hasta)) {
      return { abierto: true, detalle: `Cierra ${tramo.hasta}` };
    }
  }

  // Siguiente tramo de hoy
  const siguienteHoy = (HORARIOS[dia] ?? []).find((t) => minutos < aMinutos(t.desde));
  if (siguienteHoy) return { abierto: false, detalle: `Abre ${siguienteHoy.desde}` };

  // Primer día con atención, mirando hasta una semana adelante
  for (let i = 1; i <= 7; i++) {
    const proximo = (dia + i) % 7;
    const tramos = HORARIOS[proximo] ?? [];
    if (tramos.length === 0) continue;
    const cuando = i === 1 ? 'mañana' : DIAS[proximo];
    return { abierto: false, detalle: `Abre ${cuando} ${tramos[0].desde}` };
  }

  return { abierto: false, detalle: 'Consultá los horarios' };
}

/** Link para abrir la dirección en la app de mapas del teléfono. */
export function linkComoLlegar(): string {
  const destino = `${OFICINA.latitud},${OFICINA.longitud}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
}
