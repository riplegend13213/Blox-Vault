const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const standaloneServer = path.join(process.cwd(), '.next', 'standalone', 'server.js')

if (fs.existsSync(standaloneServer)) {
  console.log('Starting standalone server:', standaloneServer)
  const child = spawn(process.execPath, [standaloneServer], { stdio: 'inherit' })
  child.on('exit', (code) => process.exit(code))
} else {
  console.log('Standalone server not found, falling back to `next start`.')
  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start'], { stdio: 'inherit' })
  child.on('exit', (code) => process.exit(code))
}
