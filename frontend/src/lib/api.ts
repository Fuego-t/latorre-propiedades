import type { Lead, Location, Property, PropertyFilters } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('latorre_admin_token');

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Si la sesión de administrador expiró o el token ya no es válido, el backend
    // responde 401 en cualquier ruta de /admin/*. Antes esto se traducía en pantallas
    // en blanco o listados "vacíos" sin ninguna explicación. Ahora limpiamos la sesión
    // y mandamos al usuario de nuevo al login (salvo que el 401 venga del propio login,
    // que es un simple error de usuario/contraseña, no una sesión expirada).
    if (res.status === 401 && !path.startsWith('/admin/auth/login')) {
      localStorage.removeItem('latorre_admin_token');
      localStorage.removeItem('latorre_admin_user');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    throw new ApiError(res.status, data.error ?? 'Ocurrió un error inesperado', data.details);
  }

  return data as T;
}

function buildQuery(filters: PropertyFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  properties: {
    list: (filters: PropertyFilters = {}) =>
      request<{ items: Property[]; total: number }>(`/properties${buildQuery(filters)}`),
    get: (id: string) => request<{ property: Property; related: Property[] }>(`/properties/${id}`),
    registerView: (id: string) => request<void>(`/properties/${id}/view`, { method: 'POST' }),
  },
  locations: {
    list: () => request<{ locations: Location[] }>('/locations'),
  },
  leads: {
    // Pública: la llama el panel "Agendar cita" del sitio, sin login.
    create: (payload: {
      name: string;
      phone: string;
      email?: string;
      interest: string;
      operation: string;
      propertyId?: string | null;
      propertyTitle?: string | null;
    }) => request<{ lead: Lead }>('/leads', { method: 'POST', body: JSON.stringify(payload) }),
  },
  admin: {
    login: (email: string, password: string) =>
      request<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
        '/admin/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) }
      ),
    dashboard: () => request<{ summary: Record<string, number>; recent: Property[] }>('/admin/properties/dashboard'),
    list: (params: { status?: string; operationType?: string; q?: string } = {}) => {
      // OJO: `new URLSearchParams(objeto)` convierte cada valor con String(valor), así que un
      // campo `undefined` termina literalmente como el texto "undefined" en la URL (ej:
      // "?q=undefined"). Por eso filtramos antes los campos vacíos/undefined.
      const entries = Object.entries(params).filter(
        ([, value]) => value !== undefined && value !== null && value !== ''
      ) as [string, string][];
      const qs = new URLSearchParams(entries).toString();
      return request<{ properties: Property[] }>(`/admin/properties${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<{ property: Property }>(`/admin/properties/${id}`),
    create: (payload: Partial<Property>) =>
      request<{ property: Property }>('/admin/properties', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<Property>) =>
      request<{ property: Property }>(`/admin/properties/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    updateStatus: (id: string, status: string) =>
      request<{ property: Property }>(`/admin/properties/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    remove: (id: string) => request<void>(`/admin/properties/${id}`, { method: 'DELETE' }),
    uploadImages: (id: string, files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));
      return request<{ images: unknown[] }>(`/admin/properties/${id}/images`, {
        method: 'POST',
        body: formData,
      });
    },
    deleteImage: (id: string, imageId: string) =>
      request<{ images: unknown[] }>(`/admin/properties/${id}/images/${imageId}`, { method: 'DELETE' }),
    // Guarda el orden y cuál es la foto principal. Sin esto, arrastrar una foto o
    // marcarla como principal sólo cambiaba la pantalla y se perdía al salir.
    reorderImages: (id: string, images: unknown[]) =>
      request<{ images: unknown[] }>(`/admin/properties/${id}/images/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ images }),
      }),
    leads: {
      list: () => request<{ leads: Lead[] }>('/admin/leads'),
      remove: (id: string) => request<void>(`/admin/leads/${id}`, { method: 'DELETE' }),
    },
  },
};

export { ApiError };