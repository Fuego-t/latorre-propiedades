import 'dotenv/config';
import path from 'path';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Falta la variable de entorno ${name}. Revisá tu archivo .env (ver .env.example).`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  // 30 días por defecto: es un panel interno de un equipo chico, no hace falta re-loguearse
  // todos los días. Se puede acortar seteando JWT_EXPIRES_IN en el .env si se prefiere.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  // URL pública del propio backend. Se usa para armar los links de las fotos
  // cuando se guardan en disco (modo sin Cloudinary).
  publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${Number(process.env.PORT ?? 4000)}`).replace(/\/$/, ''),
  // Carpeta donde se guardan las fotos en modo local (queda fuera de src/ y de dist/).
  uploadsDir: process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(__dirname, '../../uploads'),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    folder: process.env.CLOUDINARY_FOLDER ?? 'latorre-propiedades',
  },
  seedDemoData: (process.env.SEED_DEMO_DATA ?? 'true') === 'true',
};

export const isCloudinaryConfigured =
  !!env.cloudinary.cloudName && !!env.cloudinary.apiKey && !!env.cloudinary.apiSecret;
