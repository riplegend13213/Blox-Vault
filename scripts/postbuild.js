const fs = require('fs');
const path = require('path');

function copy(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const ent of entries) {
    const srcPath = path.join(src, ent.name);
    const destPath = path.join(dest, ent.name);
    if (ent.isDirectory()) copy(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

try {
  copy('.next/static', '.next/standalone/.next/static');
  copy('public', '.next/standalone/public');
  console.log('postbuild copy completed');
} catch (e) {
  console.error('postbuild copy failed', e);
  process.exit(1);
}
