import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Users } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { LEAD_OPERATION_LABELS } from '../../lib/format';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToastStore } from '../../store/useToastStore';
import type { Lead } from '../../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LeadsListPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Lead | null>(null);
  const pushToast = useToastStore((s) => s.push);

  function load() {
    setLoading(true);
    api.admin.leads
      .list()
      .then((res) => setLeads(res.leads))
      .catch((err) => {
        pushToast(err instanceof ApiError ? err.message : 'No se pudieron cargar los clientes potenciales', 'error');
        setLeads([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await api.admin.leads.remove(pendingDelete.id);
      pushToast('Registro eliminado', 'success');
      setPendingDelete(null);
      load();
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'No se pudo eliminar el registro', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-latorre-dark">Clientes potenciales</h1>
      </div>

      <p className="text-sm text-latorre-ink/55">
        Se cargan solos cuando alguien completa "Agendar cita" en el sitio público, desde la vista previa del mapa o
        la página de una propiedad.
      </p>

      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead>
            <tr className="border-b border-latorre-dark/8 text-xs uppercase tracking-wide text-latorre-ink/45">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Interés</th>
              <th className="px-4 py-3 font-medium">Operación</th>
              <th className="px-4 py-3 font-medium">Propiedad</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-latorre-dark/6">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-latorre-ink/40">
                  Cargando…
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-latorre-ink/40">
                  <div className="flex flex-col items-center gap-2">
                    <Users size={22} className="text-latorre-ink/25" />
                    Todavía no hay clientes potenciales cargados.
                  </div>
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-4 py-3 font-medium text-latorre-dark">{lead.name}</td>
                  <td className="px-4 py-3 text-latorre-ink/70">
                    {lead.phone ? (
                      <a href={`tel:${lead.phone}`} className="hover:underline">
                        {lead.phone}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-latorre-ink/70">
                    {lead.email ? (
                      <a href={`mailto:${lead.email}`} className="hover:underline">
                        {lead.email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-latorre-ink/70">{lead.interest}</td>
                  <td className="px-4 py-3">
                    <span className="chip">{LEAD_OPERATION_LABELS[lead.operation]}</span>
                  </td>
                  <td className="px-4 py-3 text-latorre-ink/70">
                    {lead.propertyId ? (
                      <Link to={`/admin/propiedades/${lead.propertyId}/editar`} className="hover:underline">
                        {lead.propertyTitle ?? 'Ver propiedad'}
                      </Link>
                    ) : (
                      lead.propertyTitle ?? '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-latorre-ink/50">{formatDate(lead.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setPendingDelete(lead)}
                      className="rounded-lg p-2 text-latorre-ink/50 hover:bg-red-50 hover:text-red-600"
                      aria-label="Eliminar registro"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Eliminar registro"
        description={`¿Seguro que querés eliminar el registro de "${pendingDelete?.name}"?`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}