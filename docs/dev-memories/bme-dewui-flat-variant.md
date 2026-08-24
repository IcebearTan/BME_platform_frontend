---
name: bme-dewui-flat-variant
description: DewUI 新增 flat 扁平变体（纯色、无 backdrop-filter、hover 静态），用于阅读/文档/详情等阅读型页面；token 与用法
metadata: 
  node_type: memory
  type: reference
  originSessionId: 57812809-959a-4059-a89d-31a8ea3a7cf8
  modified: 2026-07-28T13:11:27.692Z
---

DewUI 原本「液态玻璃优先」，缺纯色扁平表达。2026-07-28 为文章阅读页新增 `flat` 变体（延续 `DewPopover`「纯色无 glass」的先例，把它提升为通用表面变体）。

**token**（`src/components/ui/tokens.css`，亮 `:root` + 暗 `.theme-dark` 各一套）：`--dew-card-flat-bg / -bg-hover / -border / -shadow / -shadow-hover / -divider`。亮色 `#ffffff`、暗色 `#1c1c1e`（参考 `--dew-popover-bg`）。

**用法**：`<DewCard variant="flat">`。DewCard **不改 props**（class 绑定已有 `` dew-card--${variant} ``，自动生成 `dew-card--flat`）；该变体关掉 `backdrop-filter`、隐藏玻璃特效层（折射/色散/高光/底色）、hover 完全静态（背景/阴影/位移都不变）。接入走 barrel `import { DewCard } from '../ui'`，无需全局注册。

**何时用 flat vs glass**：阅读/文档/详情/表单等**长内容、需高对比、低噪音**的场景用 flat；导航/卡片入口/装饰性表面用玻璃（DewCard 默认 / `:glass="true"`）。文章页正文区用 flat，底部交互栏轻装饰。

关联：[[bme-dewui-design-language]] [[bme-article-system]]
