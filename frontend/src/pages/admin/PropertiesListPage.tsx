import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { formatPrice, OPERATION_LABELS, STATUS_LABELS } from '../../lib/format';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToastStore } from '../../store/useToastStore';
import type { Property, PropertyStatus } from '../../types';

const STATUS_OPTIONS: PropertyStatus[] = ['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'PAUSED', 'HIDDEN'];

const STATUS_COLORS: Record<PropertyStatus, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  RESERVED: 'bg-amber-100 text-amber-700',
  SOLD: 'bg-latorre-dark/10 text-latorre-dark',
  RENTED: 'bg-latorre-dark/10 text-latorre-dark',
  PAUSED: 'bg-latorre-ink/10 text-latorre-ink/60',
  HIDDEN: 'bg-latorre-ink/10 text-latorre-ink/60',
};

export function PropertiesListPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pendingDelete, setPendingDelete] = useState<Property | null>(null);
  const pushToast = useToastStore((s) => s.push);

  function load() {
    setLoading(true);
    api.admin
      .list({ q: q || undefined, status: statusFilter || undefined })
      .then((res) => setProperties(res.properties))
      .catch((err) => {
        pushToast(err instanceof Error ? err.message : 'No se pudieron cargar las propiedades', 'error');
        setProperties([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter]);

  async function handleStatusChange(property: Property, status: PropertyStatus) {
    try {
      await api.admin.updateStatus(property.id, status);
      pushToast('Estado actualizado', 'success');
      load();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'No se pudo actualizar el estado', 'error');
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await api.admin.remove(pendingDelete.id);
      pushToast('Propiedad eliminada', 'success');
      setPendingDelete(null);
      load();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'No se pudo eliminar la propiedad', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-latorre-dark">Propiedades</h1>
        <Link to="/admin/propiedades/nueva" className="btn-primary">
          <Plus size={16} /> Cargar propiedad
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-latorre-ink/30" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título…"
            className="w-full rounded-lg border border-latorre-dark/15 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-latorre-gold"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-latorre-dark/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-latorre-gold"
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-latorre-dark/8 text-xs uppercase tracking-wide text-latorre-ink/45">
              <th className="px-4 py-3 font-medium">Propiedad</th>
              <th className="px-4 py-3 font-medium">Operación</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-latorre-dark/6">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-latorre-ink/40">
                  Cargando…
                </td>
              </tr>
            ) : properties.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-latorre-ink/40">
                  No se encontraron propiedades.
                </td>
              </tr>
            ) : (
              properties.map((property) => (
                <tr key={property.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-latorre-dark">{property.title}</p>
                    <p className="text-xs text-latorre-ink/45">
                      {property.code} · {property.location}
                      {property.demo && <span className="ml-1.5 rounded bg-latorre-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-latorre-gold">DEMO</span>}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-latorre-ink/70">{OPERATION_LABELS[property.operationType]}</td>
                  <td className="px-4 py-3 font-medium text-latorre-ink">{formatPrice(property.price, property.currency)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={property.status}
                      onChange={(e) => handleStatusChange(property, e.target.value as PropertyStatus)}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[property.status]}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/propiedad/${property.id}`}
                        target="_blank"
                        className="rounded-lg p-2 text-latorre-ink/50 hover:bg-latorre-dark/5 hover:text-latorre-dark"
                        aria-label="Ver propiedad"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        to={`/admin/propiedades/${property.id}/editar`}
                        className="rounded-lg p-2 text-latorre-ink/50 hover:bg-latorre-dark/5 hover:text-latorre-dark"
                        aria-label="Editar propiedad"
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => setPendingDelete(property)}
                        className="rounded-lg p-2 text-latorre-ink/50 hover:bg-red-50 hover:text-red-600"
                        aria-label="Eliminar propiedad"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Eliminar propiedad"
        description={`¿Seguro que querés eliminar "${pendingDelete?.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
