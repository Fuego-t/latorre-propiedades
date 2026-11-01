import { Request, Response } from 'express';
import { getHomepageSettings, saveHomepageSettings } from '../services/homepage.service';
import { asyncHandler } from '../utils/asyncHandler';

export const getHomepage = asyncHandler(async (_req: Request, res: Response) => {
  const { slides } = await getHomepageSettings();
  res.setHeader('Cache-Control', 'no-store');
  res.json({ slides });
});

export const getHomepageForAdmin = asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await getHomepageSettings());
});

export const updateHomepage = asyncHandler(async (req: Request, res: Response) => {
  res.json(await saveHomepageSettings(req.body));
});
