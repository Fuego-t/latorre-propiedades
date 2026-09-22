import { CheckCircle2, Info, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { useToastStore } from '../../store/useToastStore';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 pb-safe-bottom sm:bottom-6 sm:items-end sm:px-6">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.variant];
        return (
          <button
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            className={clsx(
              'flex w-full max-w-sm items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-card-hover transition animate-[marker-pop_0.25s_ease]',
              'bg-white text-left',
              toast.variant === 'success' && 'border-latorre-light/60 text-latorre-dark',
              toast.variant === 'error' && 'border-red-200 text-red-700',
              toast.variant === 'info' && 'border-latorre-dark/10 text-latorre-ink'
            )}
          >
            <Icon size={18} className="shrink-0" />
            <span>{toast.message}</span>
          </button>
        );
      })}
    </div>
  );
}
