import { Router } from 'express';
import { validateBody } from '../middleware/validate';
import { leadInputSchema } from '../validators/lead.schema';
import { createLeadHandler } from '../controllers/leads.controller';
import { limitarPedidos } from '../middleware/rateLimit';

const router = Router();

// Cinco consultas por hora desde la misma conexión. Un interesado de verdad
// manda una, quizás dos si se equivocó en el teléfono. Cinco ya es mucho.
const limiteConsultas = limitarPedidos({
  nombre: 'leads',
  maximo: 5,
  ventanaMs: 60 * 60 * 1000,
  mensaje: 'Ya enviaste varias consultas. Si necesitás algo más, escribinos por WhatsApp.',
});

// Pública y sin autenticación: la completa cualquier visitante del sitio.
router.post('/', limiteConsultas, validateBody(leadInputSchema), createLeadHandler);

export default router;
