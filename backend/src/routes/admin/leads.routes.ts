import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { deleteLeadHandler, listLeadsHandler } from '../../controllers/admin/leads.controller';

const router = Router();

router.use(requireAdmin);

router.get('/', listLeadsHandler);
router.delete('/:id', deleteLeadHandler);

export default router;
