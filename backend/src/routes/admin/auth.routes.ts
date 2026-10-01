import { Router } from 'express';
import { login, me } from '../../controllers/admin/auth.controller';
import { validateBody } from '../../middleware/validate';
import { loginSchema } from '../../validators/auth.schema';
import { requireAdmin } from '../../middleware/auth';
import { limitarPedidos } from '../../middleware/rateLimit';

const router = Router();

// Diez intentos cada quince minutos, y después quince minutos de espera. Una
// persona que se equivoca de contraseña no llega ni a la mitad; un programa
// probando claves se frena en seco.
const limiteLogin = limitarPedidos({
  nombre: 'login',
  maximo: 10,
  ventanaMs: 15 * 60 * 1000,
  bloqueoMs: 15 * 60 * 1000,
  mensaje: 'Demasiados intentos de inicio de sesión. Esperá unos minutos.',
});

router.post('/login', limiteLogin, validateBody(loginSchema), login);
router.get('/me', requireAdmin, me);

export default router;
