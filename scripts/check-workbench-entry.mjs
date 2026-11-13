import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

const dist = resolve(process.argv[2] || 'dist')
const scripts = readdirSync(join(dist, 'assets'))
  .filter(name => name.endsWith('.js') && !name.startsWith('._'))
  .map(name => readFileSync(join(dist, 'assets', name), 'utf8'))
for (const endpoint of ['/workbench-sso/me', '/workbench-sso/config']) {
  if (!scripts.some(source => source.includes(endpoint))) {
    throw new Error(`用户端发布产物缺少工作台入口接口：${endpoint}`)
  }
}
console.log('工作台入口发布检查通过')
