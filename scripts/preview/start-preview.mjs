import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const pnpmCli = process.env.npm_execpath

if (!pnpmCli) {
  throw new Error('请通过 pnpm dev:preview 启动预览环境')
}

const children = [
  spawn(process.execPath, [join(rootDir, 'scripts/preview/market-preview-server.mjs')], {
    cwd: rootDir,
    stdio: 'inherit',
  }),
  spawn(process.execPath, [pnpmCli, '--filter', '@bme/user', 'dev:preview'], {
    cwd: rootDir,
    stdio: 'inherit',
  }),
  spawn(process.execPath, [pnpmCli, '--filter', '@bme/admin', 'dev:preview'], {
    cwd: rootDir,
    stdio: 'inherit',
  }),
]

let stopping = false
function stop(exitCode = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill()
  process.exitCode = exitCode
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`[preview] 子进程退出：${signal || code}`)
      stop(code || 1)
    }
  })
}

process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
