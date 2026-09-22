import { MessageCircle } from 'lucide-react';
import clsx from 'clsx';
import type { Property } from '../../types';
import { buildWhatsAppLink, WHATSAPP_NUMBERS } from '../../lib/whatsapp';

export function WhatsAppButtons({
  property,
  className,
  compact = false,
}: {
  property: Pick<Property, 'title' | 'code' | 'operationType' | 'location'>;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      {WHATSAPP_NUMBERS.map((number) => (
        <a
          key={number.id}
          href={buildWhatsAppLink(number.id, property)}
          target="_blank"
          rel="noopener noreferrer"
          className={clsx('btn-whatsapp', compact ? 'flex-1 px-3 py-2 text-xs' : 'flex-1')}
        >
          <MessageCircle size={compact ? 14 : 16} />
          Consultar por {number.label}
        </a>
      ))}
    </div>
  );
}
