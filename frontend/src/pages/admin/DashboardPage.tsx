import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Home, Key, Plus, Store, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import type { Lead, Property } from '../../types';

interface Summary {
  total: number;
  available: number;
  sale: number;
  commercialRent: number;
  residentialRent: number;
  sold: number;
  rented: number;
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Home; label: string; value: number }) {
  return (
    <div className="card-surface flex items-center gap-3 p-4">
      <div className="rounded-lg bg-latorre-dark/5 p-2.5 text-latorre-dark">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-latorre-dark">{value}</p>
        <p className="text-xs text-latorre-ink/55">{label}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin
      .dashboard()
      .then((res) => {
        setSummary(res.summary as unknown as Summary);
        setRecent(res.recent);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar las métricas'))
      .finally(() => setLoading(false));

    // Aparte y sin bloquear: si las consultas fallan, el resto del panel se ve igual.
    api.admin.leads
      .list()
      .then((res) => setLeads(res.leads))
      .catch(() => setLeads([]));
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-latorre-dark">Dashboard</h1>
        <Link to="/admin/propiedades/nueva" className="btn-primary">
          <Plus size={16} /> Cargar propiedad
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : loading || !summary ? (
        <p className="text-sm text-latorre-ink/50">Cargando métricas…</p>
      ) : (
        <>
          {/* Las seis entran en una fila cuando hay lugar, en vez de cuatro arriba
              y dos sueltas abajo. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard icon={Home} label="Propiedades activas" value={summary.available} />
            <StatCard icon={TrendingUp} label="En venta" value={summary.sale} />
            <StatCard icon={Store} label="Alquiler comercial" value={summary.commercialRent} />
            <StatCard icon={Key} label="Alquiler de vivienda" value={summary.residentialRent} />
            <StatCard icon={Building2} label="Vendidas" value={summary.sold} />
            <StatCard icon={Building2} label="Alquiladas" value={summary.rented} />
          </div>

          {/* En pantalla ancha van lado a lado: el espacio que sobraba ahora muestra
              las consultas, que es lo que conviene mirar todos los días. */}
          <div className="grid flex-1 items-stretch gap-5 xl:grid-cols-2">
          <div className="card-surface flex flex-col p-5">
            <h2 className="mb-3 font-display text-lg font-semibold text-latorre-dark">Últimas propiedades cargadas</h2>
            {recent.length === 0 ? (
              <p className="text-sm text-latorre-ink/50">Todavía no cargaste propiedades.</p>
            ) : (
              <ul className="divide-y divide-latorre-dark/8">
                {recent.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link to={`/admin/propiedades/${p.id}/editar`} className="truncate text-sm font-medium text-latorre-dark hover:underline">
                        {p.title}
                      </Link>
                      <p className="text-xs text-latorre-ink/50">
                        {p.code} · {p.location}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-latorre-ink/70">{formatPrice(p.price, p.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card-surface flex flex-col p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-latorre-dark">Últimas consultas</h2>
              {leads.length > 0 && (
                <Link to="/admin/clientes" className="text-xs font-medium text-latorre-gold hover:underline">
                  Ver todas
                </Link>
              )}
            </div>
            {leads.length === 0 ? (
              <p className="text-sm text-latorre-ink/50">Todavía no llegaron consultas desde el sitio.</p>
            ) : (
              <ul className="divide-y divide-latorre-dark/8">
                {leads.slice(0, 8).map((lead) => (
                  <li key={lead.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-latorre-dark">{lead.name}</p>
                      <p className="truncate text-xs text-latorre-ink/50">
                        {lead.phone}
                        {lead.propertyTitle ? ` · ${lead.propertyTitle}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-latorre-ink/45">
                      {new Date(lead.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
