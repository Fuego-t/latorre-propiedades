import clsx from 'clsx';
import type { OperationType } from '../../types';
import { OPERATION_LABELS, OPERATION_SHORT_LABELS } from '../../lib/format';

export function OperationBadge({ operationType, short = false }: { operationType: OperationType; short?: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm',
        operationType === 'SALE' && 'bg-latorre-gold text-latorre-dark',
        operationType === 'COMMERCIAL_RENT' && 'bg-latorre-dark',
        operationType === 'RESIDENTIAL_RENT' && 'bg-latorre-light text-latorre-dark'
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {short ? OPERATION_SHORT_LABELS[operationType] : OPERATION_LABELS[operationType]}
    </span>
  );
}
