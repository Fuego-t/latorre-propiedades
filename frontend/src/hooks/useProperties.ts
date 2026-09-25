import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Property, PropertyFilters } from '../types';

/** Espera antes de mostrar el cartel de "conectando". */
const AVISO_MS = 3000;

/** Reintentos ante fallas de red, con la pausa que va antes de cada uno. */
const PAUSAS_REINTENTO = [2000, 4000];

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Un error de red o un 5xx puede ser el backend encendiéndose (plan gratuito de
 * Render). Vale la pena reintentar. Un 4xx, en cambio, es un pedido mal armado:
 * reintentarlo da exactamente lo mismo.
 */
function valeReintentar(err: unknown): boolean {
  if (err instanceof ApiError) return err.status >= 500;
  return true; // sin respuesta: se cayó la red o el servidor todavía no atiende
}

export function useProperties(filters: PropertyFilters) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** La espera se hizo larga: probablemente el servidor estaba dormido. */
  const [demorado, setDemorado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError(null);
    setDemorado(false);

    // El cartel no sale de entrada: si el servidor está despierto las
    // propiedades llegan en menos de un segundo y no hay nada que avisar.
    const avisoTimer = setTimeout(() => {
      if (!cancelado) setDemorado(true);
    }, AVISO_MS);

    (async () => {
      for (let intento = 0; ; intento++) {
        try {
          const res = await api.properties.list(filters);
          if (cancelado) return;
          setProperties(res.items);
          setError(null);
          return;
        } catch (err) {
          if (cancelado) return;

          const quedanIntentos = intento < PAUSAS_REINTENTO.length;
          if (!quedanIntentos || !valeReintentar(err)) {
            setError(err instanceof Error ? err.message : 'No se pudieron cargar las propiedades');
            return;
          }
          await dormir(PAUSAS_REINTENTO[intento]);
          if (cancelado) return;
        }
      }
    })().finally(() => {
      if (cancelado) return;
      clearTimeout(avisoTimer);
      setDemorado(false);
      setLoading(false);
    });

    return () => {
      cancelado = true;
      clearTimeout(avisoTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  return { properties, loading, error, demorado };
}
