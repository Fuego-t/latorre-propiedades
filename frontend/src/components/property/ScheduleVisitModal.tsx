import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { LEAD_INTEREST_OPTIONS, LEAD_OPERATION_LABELS } from '../../lib/format';
import { useToastStore } from '../../store/useToastStore';
import type { LeadOperation, Property } from '../../types';

interface ScheduleVisitModalProps {
  // Opcional: si el botón se abrió desde la barra de arriba (sin una propiedad puntual
  // en pantalla), se manda la consulta como "general", sin propertyId/propertyTitle.
  property?: Pick<Property, 'id' | 'title'>;
  onClose: () => void;
}

const OPERATION_OPTIONS: LeadOperation[] = ['RENT', 'SELL', 'BUY'];

export function ScheduleVisitModal({ property, onClose }: ScheduleVisitModalProps) {
  const pushToast = useToastStore((s) => s.push);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [interest, setInterest] = useState<string>('');
  const [operation, setOperation] = useState<LeadOperation | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !interest || !operation) {
      pushToast('Completá nombre, teléfono, interés y operación para agendar tu cita', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.leads.create({
        name: name.trim(),
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        interest,
        operation,
        ...(property ? { propertyId: property.id, propertyTitle: property.title } : {}),
      });
      setSent(true);
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'No se pudo enviar la solicitud', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // Se renderiza con un "portal" directo al final del <body>, en vez de quedar anidado
  // donde se usa el componente. Sin esto, si el botón que lo abre está dentro de un
  // elemento con efecto "vidrio esmerilado" (backdrop-blur, como la barra de arriba),
  // el navegador centra el panel tomando como referencia esa barra angosta en vez de
  // toda la pantalla, y el panel queda cortado / con la mitad afuera.
  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Agendar cita">
      <div className="w-full max-w-sm rounded-xl2 bg-white p-6 shadow-card-hover">
        {sent ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-latorre-gold/15 text-latorre-gold">
              <CalendarClock size={22} />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-latorre-dark">¡Listo!</h3>
              <p className="mt-1 text-sm text-latorre-ink/60">
                {property ? `Recibimos tu solicitud para "${property.title}". ` : 'Recibimos tu solicitud. '}
                Te vamos a contactar a la brevedad para coordinar la cita.
              </p>
            </div>
            <button className="btn-primary w-full" onClick={onClose}>
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-latorre-gold/15 p-2 text-latorre-gold">
                <CalendarClock size={20} />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-latorre-dark">Agendar cita</h3>
                <p className="text-xs text-latorre-ink/50">{property ? property.title : 'Consulta general'}</p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latorre-ink/50">Nombre</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre y apellido"
                className="w-full rounded-lg border border-latorre-dark/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-latorre-gold"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latorre-ink/50">Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 2223 456789"
                className="w-full rounded-lg border border-latorre-dark/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-latorre-gold"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latorre-ink/50">
                Email <span className="normal-case text-latorre-ink/35">(opcional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-lg border border-latorre-dark/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-latorre-gold"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latorre-ink/50">Interés</label>
              <select
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                className="w-full rounded-lg border border-latorre-dark/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-latorre-gold"
              >
                <option value="" disabled>
                  Elegí un tipo de propiedad
                </option>
                {LEAD_INTEREST_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latorre-ink/50">
                ¿Qué querés hacer?
              </label>
              <select
                value={operation}
                onChange={(e) => setOperation(e.target.value as LeadOperation)}
                className="w-full rounded-lg border border-latorre-dark/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-latorre-gold"
              >
                <option value="" disabled>
                  Elegí una opción
                </option>
                {OPERATION_OPTIONS.map((op) => (
                  <option key={op} value={op}>
                    {LEAD_OPERATION_LABELS[op]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}