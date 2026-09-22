import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import propertiesRoutes from './routes/properties.routes';
import locationsRoutes from './routes/locations.routes';
import leadsRoutes from './routes/leads.routes';
import adminAuthRoutes from './routes/admin/auth.routes';
import adminPropertiesRoutes from './routes/admin/properties.routes';
import adminLeadsRoutes from './routes/admin/leads.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

// Fotos guardadas en disco (modo sin Cloudinary). Helmet por defecto manda
// Cross-Origin-Resource-Policy: same-origin, que haría que el frontend (otro puerto/dominio)
// no pueda mostrar estas imágenes: por eso acá se permite el uso cross-origin.
app.use(
  '/uploads',
  express.static(env.uploadsDir, {
    maxAge: '30d',
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  })
);

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'latorre-propiedades-api' }));

// Rutas públicas
app.use('/api/properties', propertiesRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/leads', leadsRoutes);

// Rutas administrativas (protegidas dentro de cada router)
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/properties', adminPropertiesRoutes);
app.use('/api/admin/leads', adminLeadsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
