const { PrismaClient } = require('@prisma/client');
(async () => {
  const db = new PrismaClient();
  try {
    const u = await db.user.findFirst({ where: { role: 'admin' } });
    console.log(JSON.stringify(u, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await db.$disconnect();
  }
})();
