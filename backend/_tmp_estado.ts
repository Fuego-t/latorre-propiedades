import { prisma } from './src/lib/prisma';
(async () => {
  const props = await prisma.property.findMany({
    select: { code: true, title: true, status: true, isDemo: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });
  console.log(`Total en la base: ${props.length}`);
  props.forEach((p) =>
    console.log(
      `  ${p.code} ${p.isDemo ? '[DEMO]' : '      '} ${p.status.padEnd(9)} "${p.title.trim().slice(0, 30)}"  (modificada: ${p.updatedAt.toISOString().slice(0, 16).replace('T', ' ')})`
    )
  );
  console.log('\nLeads:', await prisma.lead.count(), '· Admins:', await prisma.adminUser.count());
  await prisma.$disconnect();
})();
