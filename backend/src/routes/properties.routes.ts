import { Router } from 'express';
import { getProperty, listProperties, registerView } from '../controllers/properties.controller';

const router = Router();

router.get('/', listProperties);
router.get('/:id', getProperty);
router.post('/:id/view', registerView);

export default router;
