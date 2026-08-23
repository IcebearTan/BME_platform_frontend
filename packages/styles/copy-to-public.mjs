// 把共享样式资产复制到调用方 app 的 public/。
// TinyMCE iframe（content_css）与 md-editor-v3 本地高亮（md-ext）在运行时
// 通过 URL 加载这些文件，因此每个 app 的 public/ 必须有一份副本；
// 由各 app 的 predev/prebuild 自动执行，替代原 sync-richtext.js 跨仓手工同步。
//
// 用法（在 app 目录下）：node ../../packages/styles/copy-to-public.mjs
import { copyFileSync, cpSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgDir = dirname(fileURLToPath(import.meta.url))
const appPublic = join(process.cwd(), 'public')

mkdirSync(appPublic, { recursive: true })
copyFileSync(join(pkgDir, 'article-content.css'), join(appPublic, 'article-content.css'))
cpSync(join(pkgDir, 'public'), appPublic, { recursive: true })
console.log('[copy-shared-assets] article-content.css + public/ ->', appPublic)
