import type { LucideIcon } from 'lucide-react';
import { SearchX } from 'lucide-react';

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl2 border border-dashed border-latorre-dark/15 bg-white/60 px-6 py-10 text-center">
      <div className="rounded-full bg-latorre-dark/5 p-3 text-latorre-dark/50">
        <Icon size={28} />
      </div>
      <p className="font-medium text-latorre-ink">{title}</p>
      {description && <p className="max-w-xs text-sm text-latorre-ink/60">{description}</p>}
      {action}
    </div>
  );
}
