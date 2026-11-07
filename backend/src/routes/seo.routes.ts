import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getLegacyPropertyRedirects, getPublicSitemap } from '../services/seo.service';

const router = Router();
const REVALIDATE = 'public, max-age=0, must-revalidate';

export const servePublicSitemap = asyncHandler(async (_req, res) => {
  const sitemap = await getPublicSitemap();
  res.set('Cache-Control', REVALIDATE).type('application/xml').send(sitemap);
});

router.get('/sitemap.xml', servePublicSitemap);

router.get('/seo/redirects', asyncHandler(async (_req, res) => {
  const redirects = await getLegacyPropertyRedirects();
  res.set('Cache-Control', REVALIDATE).json({ redirects });
}));

export default router;
