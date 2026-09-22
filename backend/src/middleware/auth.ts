import { NextFunction, Request, Response } from 'express';
import { verifyAdminToken, AdminTokenPayload } from '../utils/jwt';
import { ApiError } from './errorHandler';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

/** Protege rutas administrativas: exige un JWT válido en el header Authorization. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'No autenticado'));
  }

  const token = header.slice('Bearer '.length);

  try {
    req.admin = verifyAdminToken(token);
    return next();
  } catch {
    return next(new ApiError(401, 'Sesión inválida o expirada'));
  }
}

/** Restringe una ruta a un rol específico (por ejemplo, sólo OWNER puede eliminar). */
export function requireRole(...roles: Array<'OWNER' | 'AGENT'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return next(new ApiError(403, 'No tenés permisos para esta acción'));
    }
    return next();
  };
}
