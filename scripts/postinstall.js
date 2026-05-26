const { execSync } = require('child_process');

if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
  console.log('DATABASE_URL detected; running prisma generate in postinstall.');
  execSync('npx prisma generate', { stdio: 'inherit' });
} else {
  console.log('Skipping prisma generate in postinstall because DATABASE_URL is not set.');
}
