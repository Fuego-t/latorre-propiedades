import { OPERATION_COLORS, OPERATION_LABELS } from '../../lib/format';
import { OFICINA } from '../../lib/oficina';
import type { OperationType } from '../../types';

const ITEMS: OperationType[] = ['SALE', 'COMMERCIAL_RENT', 'RESIDENTIAL_RENT'];

export function MapLegend() {
  return (
    <div className="pointer-events-auto card-surface flex flex-col gap-1.5 px-3.5 py-3 text-xs">
      {ITEMS.map((op) => (
        <div key={op} className="flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full border border-black/10"
            style={{ backgroundColor: OPERATION_COLORS[op] }}
          />
          <span className="text-latorre-ink/75">{OPERATION_LABELS[op]}</span>
        </div>
      ))}

      <div className="mt-0.5 flex items-center gap-2 border-t border-latorre-dark/10 pt-2">
        <span
          className="h-3 w-3 shrink-0 rounded-full border border-black/10"
          style={{ backgroundColor: OFICINA.color }}
        />
        <span className="font-medium text-latorre-ink/75">{OFICINA.bajada}</span>
      </div>
    </div>
  );
}
