import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { wakeSeoSync } from './firebaseSeoSync.service';

/** Guardar la propiedad y el trabajo de publicación es una sola operación. */
export async function withSeoPublication<T>(mutation: (transaction: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const result = await prisma.$transaction(async (transaction) => {
    const value = await mutation(transaction);
    await transaction.seoPublishState.upsert({
      where: { id: 'seo' },
      create: { id: 'seo', requestedRevision: 1 },
      update: { requestedRevision: { increment: 1 }, lastError: null },
    });
    return value;
  });
  wakeSeoSync();
  return result;
}
