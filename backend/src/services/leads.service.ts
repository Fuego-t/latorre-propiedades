import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { leadInputSchema } from '../validators/lead.schema';

type LeadInput = z.infer<typeof leadInputSchema>;

export async function createLead(input: LeadInput) {
  return prisma.lead.create({
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      interest: input.interest,
      operation: input.operation,
      propertyId: input.propertyId || null,
      propertyTitle: input.propertyTitle || null,
      // La fecha la pone el servidor, no el navegador: un dato que viene de
      // afuera se puede falsear, y esto es justamente la prueba.
      acceptedPrivacyAt: new Date(),
    },
  });
}

export async function listLeads() {
  return prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function deleteLead(id: string) {
  return prisma.lead.delete({ where: { id } });
}