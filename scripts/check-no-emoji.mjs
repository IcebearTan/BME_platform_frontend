import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const roots = ['apps/admin/src', 'apps/user/src', 'packages']
const extensions = new Set(['.css', '.html', '.js', '.mjs', '.scss', '.ts', '.vue'])
const emojiPattern = /\p{Emoji_Presentation}|\uFE0F/u
const violations = []

function scanDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      scanDirectory(path)
      continue
    }
    if (!entry.isFile() || !extensions.has(extname(entry.name))) continue

    const lines = readFileSync(path, 'utf8').split(/\r?\n/)
    lines.forEach((line, index) => {
      if (emojiPattern.test(line)) {
        violations.push(`${relative(process.cwd(), path)}:${index + 1}: ${line.trim()}`)
      }
    })
  }
}

roots.forEach(scanDirectory)

if (violations.length) {
  console.error('生产源码禁止使用 emoji。请改用项目图标库或 SVG：')
  violations.forEach((violation) => console.error(`  ${violation}`))
  process.exit(1)
}

console.log('[check:no-emoji] PASS')
