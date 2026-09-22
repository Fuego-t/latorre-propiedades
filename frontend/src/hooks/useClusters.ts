import { useMemo } from 'react';
import Supercluster from 'supercluster';
import type { Property } from '../types';

export interface ClusterPoint {
  type: 'Feature';
  properties: { cluster: false; property: Property };
  geometry: { type: 'Point'; coordinates: [number, number] };
}

export interface ClusterGroup {
  type: 'Feature';
  properties: { cluster: true; cluster_id: number; point_count: number; point_count_abbreviated: string | number };
  geometry: { type: 'Point'; coordinates: [number, number] };
}

export type ClusterFeature = ClusterPoint | ClusterGroup;

/**
 * Agrupa propiedades cercanas en clusters usando supercluster.
 * Al hacer zoom, los clusters se van separando progresivamente (radio decreciente con el zoom).
 */
export function useClusters(properties: Property[], bounds: [number, number, number, number] | null, zoom: number) {
  const index = useMemo(() => {
    const sc = new Supercluster<{ property: Property }>({
      radius: 60,
      maxZoom: 17,
    });

    const points = properties.map((property) => ({
      type: 'Feature' as const,
      properties: { property },
      geometry: {
        type: 'Point' as const,
        coordinates: [property.publicLongitude, property.publicLatitude] as [number, number],
      },
    }));

    sc.load(points);
    return sc;
  }, [properties]);

  const clusters = useMemo<ClusterFeature[]>(() => {
    if (!bounds) return [];
    return index.getClusters(bounds, Math.round(zoom)) as unknown as ClusterFeature[];
  }, [index, bounds, zoom]);

  return { clusters, index };
}
