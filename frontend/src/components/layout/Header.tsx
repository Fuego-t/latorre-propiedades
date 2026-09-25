import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { useFilterStore } from '../../store/useFilterStore';
import { ScheduleVisitModal } from '../property/ScheduleVisitModal';

export function Header() {
  const setPanelOpen = useFilterStore((s) => s.setPanelOpen);
  const activeCount = useFilterStore((s) => s.activeCount());
  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <header className="app-shell relative z-30 grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-latorre-dark/8 bg-white/95 px-4 pt-safe-top backdrop-blur sm:px-6 lg:px-8">
      <Link to="/" className="flex min-w-0 items-center gap-2 py-2.5">
        <img
          src="/logo-latorre.png"
          alt="Latorre Propiedades"
          width={80}
          height={40}
          className="h-10 w-auto shrink-0 sm:h-12"
        />
        <span className="hidden truncate text-xs font-medium text-latorre-ink/60 sm:block sm:text-sm">
          Propiedades en Brandsen y alrededores
        </span>
      </Link>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setShowSchedule(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-latorre-gold/40 bg-latorre-gold/10 px-3.5 py-2 text-sm font-medium text-latorre-dark shadow-sm transition hover:border-latorre-gold hover:bg-latorre-gold/20 active:scale-[0.98] sm:px-4"
        >
          <CalendarClock size={16} />
          <span className="hidden sm:inline">Agendar cita</span>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => setPanelOpen(true)}
          className="relative inline-flex items-center gap-2 rounded-full border border-latorre-dark/15 bg-white px-3.5 py-2 text-sm font-medium text-latorre-ink shadow-sm transition hover:border-latorre-gold hover:text-latorre-dark active:scale-[0.98] sm:px-4"
        >
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Filtros</span>
          {activeCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-latorre-gold text-[11px] font-bold text-latorre-dark">
              {activeCount}
            </span>
          )}
        </button>

        <Link
          to="/admin"
          title="Acceso administrador"
          className="inline-flex items-center justify-center rounded-full p-2 text-latorre-ink/40 transition hover:bg-latorre-dark/5 hover:text-latorre-dark"
        >
          <ShieldCheck size={18} />
        </Link>
      </div>

      {showSchedule && <ScheduleVisitModal onClose={() => setShowSchedule(false)} />}
    </header>
  );
}