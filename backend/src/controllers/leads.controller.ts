import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { createLead } from '../services/leads.service';

/** Endpoint público: se llama desde el panel "Agendar cita" del sitio, sin login. */
export const createLeadHandler = asyncHandler(async (req: Request, res: Response) => {
  const lead = await createLead(req.body);
  res.status(201).json({ ok: true, lead });
});
