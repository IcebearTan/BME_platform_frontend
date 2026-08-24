---
name: bme-article-rich-text-styles
description: 文章正文共享样式机制——.rich-text 作用域单一真相源(article-content.css 三镜像 + sync:richtext 脚本)、blockquote 克制灰、TinyMCE iframe 靠 JS 挂 class
metadata: 
  node_type: memory
  type: reference
  originSessionId: c9663aa2-82ba-4f46-8638-a89b9dc5b2b6
  modified: 2026-07-28T13:58:11.067Z
---

BME 文章正文样式（2026-07-28）已抽成**单一真相源**，让 TinyMCE 画布 = admin 预览面板 = 用户端展示三处共用一套规则，解决"编辑器里蓝、展示端灰"的漂移。

**权威源 + 镜像**：`BME_frontend/src/styles/article-content.css` 是权威源；镜像到 `BME_backend/src/styles/article-content.css`（admin bundle，预览面板）和 `BME_backend/public/article-content.css`（TinyMCE iframe 的 content_css，serve 在 `/admin/article-content.css`）。三前端独立（非 monorepo），无法共享一份物理文件，沿用 tokens.css 的「权威源 + 镜像」模式。改权威源后跑 `npm run sync:richtext`（BME_frontend/scripts/sync-richtext.js，ESM）同步两个 admin 镜像。

**.rich-text 作用域 + --rt-\* 变量别名**：选择器统一 `.rich-text xxx`。变量 `--rt-*` 仅在 `.rich-text` 声明、取值写作 `var(--dew-x, 字面量fallback)`——主文档走 tokens.css（DRY、跟随主题），TinyMCE iframe（隔离、无 --dew-*）走 fallback（自包含）。暗色两种挂载：`.theme-dark .rich-text`（主文档祖先）+ `.rich-text.theme-dark`（iframe 同元素复合）。零 :root 声明，不污染 DewUI 其它组件。

**三处宿主各自挂 rich-text class**：用户端 `.content-body`（ArticleDetailComponent.vue）、admin 预览 `.preview-body`（两个 Editor 组件）、TinyMCE iframe `<body>`（init 时由 setup 的 `editor.on('init')` 用 `editor.getBody().classList.add('rich-text' + theme)` 挂上；主题切换由 `syncEditorTheme` watch `store.getters.isDarkMode` 遍历 `tinymce.editors` 刷新 iframe body 的 theme class）。

**blockquote = 克制灰**（用户拍板）：`border-left: 3px solid var(--rt-text-faint)`（亮 #9ca3af / 暗 rgba(255,255,255,0.35)），无背景无圆角。

**关键取舍**：
- content_css 原本是 404 死链（`/admin/skins/content/default/content.css` 不存在），已修指向 `/admin/article-content.css`。
- content_style **只保留** `.mce-content-body{caret-color}` + `body{margin;background}` + `body.theme-dark{background}`（画布底色跟随主题，否则暗色白底叠白字）。content_style 里**残留**的 blockquote/pre/table/a 等元素规则没删（长段精确匹配风险），但被 `.rich-text xxx` 更高 specificity 覆盖，视觉正确、无害。
- admin 预览面板的 `.preview-body :deep(...)` 旧规则**已删**（specificity 比 .rich-text 高，不删会盖住共享样式 → 预览仍蓝）。
- **FileUploadComponent.vue 的"文件导入预览"也有同款蓝色 `.preview-body :deep`（21 处），本次未动**（范围外）；若要它也一致，照同样手法：preview-body 挂 rich-text + 删 :deep。

两端都 import 了 article-content.css（在 tokens.css 之后，见各自 main.js）。

关联：[[bme-article-system]] [[bme-dewui-design-language]] [[bme-dewui-flat-variant]] [[bme-local-dev-env]]
