import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { deleteLead, listLeads } from '../../services/leads.service';

export const listLeadsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const leads = await listLeads();
  res.json({ ok: true, leads });
});

export const deleteLeadHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteLead(req.params.id);
  res.status(204).send();
});
