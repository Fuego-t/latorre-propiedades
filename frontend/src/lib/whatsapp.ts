import type { Property } from '../types';
import { OPERATION_LABELS } from './format';

// Números oficiales de Latorre Propiedades, ya en formato internacional argentino.
export const WHATSAPP_NUMBERS = [
  { id: 1, label: 'WhatsApp 1', display: '(2223) 46-0184', international: '5492223460184' },
  { id: 2, label: 'WhatsApp 2', display: '(2223) 46-4691', international: '5492223464691' },
] as const;

export function buildWhatsAppMessage(property: Pick<Property, 'title' | 'code' | 'operationType' | 'location'>) {
  const propertyUrl = `${window.location.origin}/propiedad/${encodeURIComponent(property.code)}`;
  return (
    `Hola, vi la propiedad "${property.title}" en Latorre Propiedades y me interesa. ` +
    `Código: ${property.code}. Operación: ${OPERATION_LABELS[property.operationType]}. ` +
    `Localidad: ${property.location}. ` +
    `Quisiera recibir más información y coordinar una visita. ${propertyUrl}`
  );
}

export function buildWhatsAppLink(
  numberId: 1 | 2,
  property: Pick<Property, 'title' | 'code' | 'operationType' | 'location'>
) {
  const number = WHATSAPP_NUMBERS.find((n) => n.id === numberId)!;
  const message = encodeURIComponent(buildWhatsAppMessage(property));
  return `https://wa.me/${number.international}?text=${message}`;
}

export function buildGeneralWhatsAppLink(numberId: 1 | 2) {
  const number = WHATSAPP_NUMBERS.find((n) => n.id === numberId)!;
  const message = encodeURIComponent('Hola, quisiera recibir información sobre las propiedades de Latorre Propiedades.');
  return `https://wa.me/${number.international}?text=${message}`;
}
