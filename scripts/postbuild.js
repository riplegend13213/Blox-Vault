const fs = require('fs')
const path = require('path')

const src = path.join(process.cwd(), '.next', 'standalone')
const dest = path.join(process.cwd(), 'standalone')

if (fs.existsSync(src)) {
  try {
    // remove existing dest if present
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true })
    }
    // copy recursively
    const cp = (s, d) => {
      const stat = fs.statSync(s)
      if (stat.isDirectory()) {
        fs.mkdirSync(d, { recursive: true })
        for (const f of fs.readdirSync(s)) cp(path.join(s, f), path.join(d, f))
      } else {
        fs.copyFileSync(s, d)
      }
    }
    cp(src, dest)
    console.log('Copied .next/standalone to ./standalone for runtime.')
  } catch (err) {
    console.error('Failed to copy standalone output:', err)
    process.exit(1)
  }
} else {
  console.log('.next/standalone not found; nothing to copy.')
}

