import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-xl2 bg-white p-6 shadow-card-hover">
        <div className="mb-3 flex items-center gap-3">
          <div className={danger ? 'rounded-full bg-red-50 p-2 text-red-600' : 'rounded-full bg-latorre-gold/15 p-2 text-latorre-gold'}>
            <AlertTriangle size={20} />
          </div>
          <h3 className="font-display text-lg font-semibold text-latorre-dark">{title}</h3>
        </div>
        <p className="mb-6 text-sm text-latorre-ink/70">{description}</p>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className={danger ? 'inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 active:scale-[0.98]' : 'btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
