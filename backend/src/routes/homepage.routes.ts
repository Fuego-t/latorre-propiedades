import { Router } from 'express';
import { getHomepage } from '../controllers/homepage.controller';

const router = Router();
router.get('/', getHomepage);
export default router;
