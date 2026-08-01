/**
 * 把权威富文本样式 BME_frontend/src/styles/article-content.css
 * 同步（逐字符复制）到三个镜像：
 *   - BME_frontend/public/article-content.css          （用户端 TinyMCE iframe content_css URL）
 *   - BME_backend/src/styles/article-content.css       （admin main bundle，预览面板用）
 *   - BME_backend/public/article-content.css            （admin TinyMCE iframe content_css URL）
 *
 * 用户端与 admin 是两个独立前端项目（非 monorepo），无法直接共享一份物理文件，
 * 因此沿用 tokens.css 的「权威源 + 镜像」模式，用本脚本杜绝「改了权威源忘记同步」。
 *
 * 用法：改完权威源后运行  npm run sync:richtext
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const src = path.join(__dirname, '..', 'src', 'styles', 'article-content.css');
const targets = [
  path.join(__dirname, '..', 'public', 'article-content.css'),
  path.join(__dirname, '..', '..', 'BME_backend', 'src', 'styles', 'article-content.css'),
  path.join(__dirname, '..', '..', 'BME_backend', 'public', 'article-content.css'),
];

if (!fs.existsSync(src)) {
  console.error('[sync-richtext] ✗ 找不到权威源：', src);
  process.exit(1);
}

for (const t of targets) {
  fs.mkdirSync(path.dirname(t), { recursive: true });
  fs.copyFileSync(src, t);
  console.log('[sync-richtext] ✓ synced ->', path.relative(process.cwd(), t));
}
console.log('[sync-richtext] 完成（%d 个镜像）', targets.length);
