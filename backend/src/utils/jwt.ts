import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AdminTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: 'OWNER' | 'AGENT';
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AdminTokenPayload;
}
