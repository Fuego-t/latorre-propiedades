import { NextFunction, Request, Response } from 'express';
import { ApiError } from './errorHandler';

/**
 * Límite de pedidos por IP, en memoria.
 *
 * Sin esto, cualquiera puede probar contraseñas hasta adivinar una, o llenar la
 * base de consultas falsas en minutos. Son los dos ataques que de verdad le
 * pueden pasar a un sitio así.
 *
 * Se hizo a mano y no con una librería a propósito: el backend corre en una sola
 * instancia, así que un contador en memoria alcanza y evita sumar una dependencia
 * más que mantener y auditar. Si algún día se corren varias instancias en
 * paralelo, esto hay que mudarlo a un almacén compartido (Redis): cada instancia
 * contaría por su cuenta y el límite real se multiplicaría.
 */

interface Registro {
  /** Momentos (timestamp) de cada pedido dentro de la ventana. */
  golpes: number[];
  /** Si está bloqueado, hasta cuándo. */
  bloqueadoHasta?: number;
}

const registros = new Map<string, Registro>();

// Limpieza periódica: sin esto el mapa crecería para siempre con IPs viejas.
const LIMPIEZA_CADA_MS = 10 * 60 * 1000;
setInterval(() => {
  const ahora = Date.now();
  for (const [clave, reg] of registros) {
    const vigente = reg.golpes.some((t) => ahora - t < 60 * 60 * 1000);
    if (!vigente && (reg.bloqueadoHasta ?? 0) < ahora) registros.delete(clave);
  }
}, LIMPIEZA_CADA_MS).unref();

/**
 * De dónde viene el pedido.
 *
 * El backend está detrás del proxy de Netlify y del de Render, así que
 * `req.ip` sería siempre la IP del proxy y todos los visitantes compartirían
 * el mismo cupo. La IP real llega en X-Forwarded-For, primera de la lista.
 */
function origen(req: Request): string {
  const reenviada = req.headers['x-forwarded-for'];
  const cadena = Array.isArray(reenviada) ? reenviada[0] : reenviada;
  const primera = cadena?.split(',')[0]?.trim();
  return primera || req.ip || 'desconocida';
}

export interface OpcionesLimite {
  /** Cuántos pedidos se permiten dentro de la ventana. */
  maximo: number;
  /** Tamaño de la ventana, en milisegundos. */
  ventanaMs: number;
  /** Cuánto se bloquea al pasarse. Por defecto, lo que dure la ventana. */
  bloqueoMs?: number;
  /** Mensaje para el visitante. */
  mensaje?: string;
  /** Etiqueta para que dos límites distintos no compartan contador. */
  nombre: string;
}

export function limitarPedidos(opciones: OpcionesLimite) {
  const { maximo, ventanaMs, bloqueoMs = ventanaMs, nombre } = opciones;
  const mensaje = opciones.mensaje ?? 'Demasiados intentos. Esperá unos minutos y volvé a probar.';

  return (req: Request, _res: Response, next: NextFunction) => {
    const clave = `${nombre}:${origen(req)}`;
    const ahora = Date.now();
    const reg = registros.get(clave) ?? { golpes: [] };

    if (reg.bloqueadoHasta && reg.bloqueadoHasta > ahora) {
      const faltan = Math.ceil((reg.bloqueadoHasta - ahora) / 1000);
      return next(new ApiError(429, `${mensaje} (${faltan} segundos)`));
    }

    // Se descartan los golpes que ya quedaron fuera de la ventana.
    reg.golpes = reg.golpes.filter((t) => ahora - t < ventanaMs);
    reg.golpes.push(ahora);

    if (reg.golpes.length > maximo) {
      reg.bloqueadoHasta = ahora + bloqueoMs;
      reg.golpes = [];
      registros.set(clave, reg);
      return next(new ApiError(429, mensaje));
    }

    registros.set(clave, reg);
    return next();
  };
}

/** Para las pruebas: deja los contadores en cero. */
export function reiniciarLimites() {
  registros.clear();
}
