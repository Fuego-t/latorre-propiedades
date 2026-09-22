import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.admin.login(email, password);
      login(res.token, res.user as never);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-latorre-dark px-4">
      <div className="w-full max-w-sm rounded-xl2 bg-white p-8 shadow-card-hover">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/logo-latorre.png" alt="Latorre Propiedades" width={113} height={56} className="h-14 w-auto" />
          <p className="text-sm text-latorre-ink/60">Acceso para el equipo de Latorre Propiedades</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latorre-ink/50">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-latorre-ink/30" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-latorre-dark/15 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-latorre-gold"
                placeholder="admin@latorrepropiedades.com"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latorre-ink/50">Contraseña</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-latorre-ink/30" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-latorre-dark/15 py-2.5 pl-9 pr-10 text-sm outline-none focus:border-latorre-gold"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-latorre-ink/40 transition hover:text-latorre-ink/70 focus:text-latorre-gold focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-latorre-ink/40">
          ¿Olvidaste tu contraseña? Contactá al administrador del sistema para restablecerla.
        </p>
      </div>
    </div>
  );
}