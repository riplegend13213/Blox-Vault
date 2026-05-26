const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const root = process.cwd();
const envPath = path.join(root, '.env');
const localEnvPath = path.join(root, '.env.local');

function loadLocalEnv() {
  if (!fs.existsSync(localEnvPath)) return null;
  return dotenv.parse(fs.readFileSync(localEnvPath, { encoding: 'utf8' }));
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
  console.log('DATABASE_URL already set in environment.');
  process.exit(0);
}

const localEnv = loadLocalEnv();
if (localEnv && localEnv.DATABASE_URL) {
  const envContent = `DATABASE_URL=${localEnv.DATABASE_URL}\n`;
  fs.writeFileSync(envPath, envContent, { encoding: 'utf8' });
  console.log('Loaded DATABASE_URL from .env.local into .env for build.');
} else {
  console.log('No DATABASE_URL set and .env.local is missing or empty. Prisma generate may fail.');
}
