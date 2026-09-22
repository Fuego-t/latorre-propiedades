import { Router } from 'express';
import { login, me } from '../../controllers/admin/auth.controller';
import { validateBody } from '../../middleware/validate';
import { loginSchema } from '../../validators/auth.schema';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.get('/me', requireAdmin, me);

export default router;
