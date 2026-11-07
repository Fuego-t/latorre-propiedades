import { Router } from 'express';
import { requireAdmin, requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getSeoSyncStatus, queueSeoSync } from '../../services/firebaseSeoSync.service';

const router = Router();
router.use(requireAdmin);
router.get('/', asyncHandler(async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, ...await getSeoSyncStatus() });
}));
router.post('/retry', requireRole('OWNER'), asyncHandler(async (_req, res) => {
  const queued = await queueSeoSync();
  res.status(queued ? 202 : 503).json({ ok: queued });
}));
export default router;
