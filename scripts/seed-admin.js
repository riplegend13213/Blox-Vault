const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'Showrovadmin99@gmail.com';
  const username = process.env.ADMIN_USERNAME || 'showrovadmin';
  const password = process.env.ADMIN_PASSWORD || 'ShowrovKyro99';

  const passwordHash = bcrypt.hashSync(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { username, role: 'admin', passwordHash, emailVerified: true },
    create: { username, email, passwordHash, role: 'admin', emailVerified: true }
  });

  console.log('Admin user ensured:', user.email);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
