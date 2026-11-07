import { app } from './app';
import { env } from './config/env';
import { buildSeoFiles } from './seo/render.cjs';
import { getSeoExport } from './services/seo.service';
import { configureSeoSync, startSeoSyncWorker } from './services/firebaseSeoSync.service';

configureSeoSync({
  loadContent: async () => {
    // Usar el bundle publicado conserva el diseño vigente y todas sus imágenes.
    const response = await fetch('https://latorre-propiedades.web.app/index.html', {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error('La plantilla publicada no está disponible');
    const template = await response.text();
    return buildSeoFiles({ template, ...await getSeoExport() });
  },
});
startSeoSyncWorker();

app.listen(env.port, () => {
  console.log(`[latorre-propiedades-api] escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
});
