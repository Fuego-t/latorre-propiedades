import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../middleware/errorHandler';
import { prisma } from '../../lib/prisma';
import { signAdminToken } from '../../utils/jwt';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.active) throw new ApiError(401, 'Email o contraseña incorrectos');

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) throw new ApiError(401, 'Email o contraseña incorrectos');

  const token = signAdminToken({ sub: user.id, email: user.email, name: user.name, role: user.role });

  res.json({
    ok: true,
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ ok: true, admin: req.admin });
});
