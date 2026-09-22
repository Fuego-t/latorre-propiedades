import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Property, PropertyFilters } from '../types';

export function useProperties(filters: PropertyFilters) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.properties
      .list(filters)
      .then((res) => {
        if (!cancelled) setProperties(res.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar las propiedades');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  return { properties, loading, error };
}
