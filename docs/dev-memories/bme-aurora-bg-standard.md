---
name: bme-aurora-bg-standard
description: BME 内容页极光背景的标准——以 HomeView 为准，dark mode 必须克制，别用 showcase 的高饱和壁纸
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 6465030e-3e6c-49b9-b401-15f51de02125
---

BME_frontend 玻璃卡片（[[bme-dewui-design-language]]）需要彩色极光底才能折射出彩，但**内容页的极光背景以 HomeView 为唯一参照标准**，不要抄 UiShowcaseView 的 `.dew-wallpaper`。

HomeView 的做法（`HomeView.vue` 里 `.theme-light/.theme-dark .homeMainContainer`）：
- **dark mode 极度克制**：色块透明度 0.12~0.18（蓝/粉/绿/琥珀各一块），基底 `linear-gradient(160deg, #16161a, #0f0f12)`（近黑）。让玻璃微微折射光，但不抢内容。
- light mode 稍亮：透明度 0.20~0.26，基底 `linear-gradient(135deg, #f0f4ff, #fdf2f8, #f0fdf4)`。

**Why:** 我在社区广场（CommunityView）重构时直接搬了 showcase 的 dark 壁纸（透明度 0.4~0.55、7 块高饱和色块、靛紫基底 `#1e1b4b`），用户反馈「dark mode 背景太喧宾夺主」。showcase 那种饱和度适合纯展示页，不适合长内容的信息流——会把帖子文字压得很难读。

**How to apply:** 内容页（信息流/列表/表单页）做 DewUI 玻璃底时，dark aurora 透明度压到 0.12~0.18、近黑基底、色块别超过 4~5 块；直接对齐 HomeView 的具体取值保证全站一致。只有 `/ui-showcase` 这种纯组件陈列页才用高饱和壁纸。背景要挂在带 `.theme-*` 类的根容器上，且用**组合选择器** `.theme-dark.xxx-container`（根元素同时带两类，后代选择器 `.theme-dark .xxx` 不生效——社区广场原代码就有这个死 CSS 坑）。
