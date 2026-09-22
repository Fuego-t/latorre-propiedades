
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListChecks, LogOut, Menu, Plus, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

const LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/propiedades', label: 'Propiedades', icon: ListChecks },
  { to: '/admin/clientes', label: 'Clientes potenciales', icon: Users },
  { to: '/admin/propiedades/nueva', label: 'Nueva propiedad', icon: Plus },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen bg-latorre-cream">
      <header className="flex items-center justify-between border-b border-latorre-dark/8 bg-white px-4 py-3 pt-safe-top sm:px-6">
        <div className="flex items-center gap-3">
          <button className="sm:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Abrir menú">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <img src="/logo-latorre.png" alt="Latorre Propiedades" width={64} height={32} className="h-8 w-auto" />
          <span className="hidden text-sm font-medium text-latorre-ink/50 sm:block">Panel de administración</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-latorre-ink/70 sm:block">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-full border border-latorre-dark/15 px-3 py-1.5 text-sm font-medium text-latorre-ink/70 transition hover:border-red-300 hover:text-red-600"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div className="app-shell flex">
        <nav
          className={`${
            mobileOpen ? 'block' : 'hidden'
          } w-full shrink-0 border-b border-latorre-dark/8 bg-white p-3 sm:block sm:w-56 sm:border-b-0 sm:border-r sm:p-4 lg:w-64`}
        >
          <ul className="space-y-1">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive ? 'bg-latorre-dark text-white' : 'text-latorre-ink/70 hover:bg-latorre-dark/5'
                    }`
                  }
                >
                  <link.icon size={17} />
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}