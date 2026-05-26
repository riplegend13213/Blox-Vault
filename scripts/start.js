const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const candidates = [
  path.join(process.cwd(), 'standalone', 'server.js'),
  path.join(process.cwd(), '.next', 'standalone', 'server.js'),
]

let started = false
for (const c of candidates) {
  if (fs.existsSync(c)) {
    console.log('Starting standalone server:', c)
    const child = spawn(process.execPath, [c], { stdio: 'inherit' })
    child.on('exit', (code) => process.exit(code))
    started = true
    break
  }
}

if (!started) {
  console.log('Standalone server not found, falling back to `next start`.')
  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start'], { stdio: 'inherit' })
  child.on('exit', (code) => process.exit(code))
}
