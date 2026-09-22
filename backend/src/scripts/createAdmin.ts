/**
 * Script para crear el primer usuario administrador.
 * Uso: npm run create-admin -- --name "Nombre" --email admin@latorrepropiedades.com --password "unaClaveSegura"
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const name = getArg('--name') ?? 'Administrador';
  const email = getArg('--email');
  const password = getArg('--password');
  const role = (getArg('--role') as 'OWNER' | 'AGENT') ?? 'OWNER';

  if (!email || !password) {
    console.error(
      'Uso: npm run create-admin -- --name "Nombre" --email admin@ejemplo.com --password "claveSegura" [--role OWNER|AGENT]'
    );
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('La contraseña debe tener al menos 6 caracteres.');
    process.exit(1);
  }

  const existing = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.error(`Ya existe un usuario administrador con el email ${email}.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.adminUser.create({
    data: { name, email: email.toLowerCase(), passwordHash, role },
  });

  console.log(`Usuario administrador creado: ${user.email} (${user.role})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
