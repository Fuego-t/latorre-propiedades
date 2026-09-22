import { Router } from 'express';
import { validateBody } from '../middleware/validate';
import { leadInputSchema } from '../validators/lead.schema';
import { createLeadHandler } from '../controllers/leads.controller';

const router = Router();

// Pública y sin autenticación: la completa cualquier visitante del sitio.
router.post('/', validateBody(leadInputSchema), createLeadHandler);

export default router;
