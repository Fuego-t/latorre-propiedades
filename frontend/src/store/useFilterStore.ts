import { create } from 'zustand';
import type { PropertyFilters } from '../types';

interface FlyTarget {
  lat: number;
  lng: number;
  zoom: number;
}

interface FilterState {
  filters: PropertyFilters;
  isPanelOpen: boolean;
  // Pedido de "mover el mapa a esta zona", disparado desde el filtro de Provincia/Ciudad
  // al tocar "Ver resultados". MapView lo escucha, se mueve, y lo limpia con
  // clearFlyTarget para que no se dispare de nuevo en cada re-render.
  flyTarget: FlyTarget | null;
  setFilter: <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => void;
  clearFilters: () => void;
  setPanelOpen: (open: boolean) => void;
  activeCount: () => number;
  requestFlyTo: (target: FlyTarget) => void;
  clearFlyTarget: () => void;
}

const EMPTY_FILTERS: PropertyFilters = {};

export const useFilterStore = create<FilterState>((set, get) => ({
  filters: { ...EMPTY_FILTERS },
  isPanelOpen: false,
  flyTarget: null,
  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value === '' || value === undefined ? undefined : value,
      },
    })),
  clearFilters: () => set({ filters: { ...EMPTY_FILTERS } }),
  setPanelOpen: (open) => set({ isPanelOpen: open }),
  activeCount: () => Object.values(get().filters).filter((v) => v !== undefined && v !== '').length,
  requestFlyTo: (target) => set({ flyTarget: target }),
  clearFlyTarget: () => set({ flyTarget: null }),
}));