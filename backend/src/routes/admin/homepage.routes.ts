import { Router } from 'express';
import { getHomepageForAdmin, updateHomepage } from '../../controllers/homepage.controller';
import { requireAdmin } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { homepageInputSchema } from '../../validators/homepage.schema';

const router = Router();
router.use(requireAdmin);
router.get('/', getHomepageForAdmin);
router.put('/', validateBody(homepageInputSchema), updateHomepage);
export default router;
