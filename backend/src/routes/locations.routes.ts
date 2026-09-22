import { Router } from 'express';
import { listLocations } from '../controllers/locations.controller';

const router = Router();

router.get('/', listLocations);

export default router;
