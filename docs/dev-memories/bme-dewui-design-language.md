---
name: bme-dewui-design-language
description: BME_frontend 自研液态玻璃组件库 DewUI 的位置与设计语言——做 UI 时要用并遵循它
metadata: 
  node_type: memory
  type: project
  originSessionId: e3f91290-e208-4e1e-890e-f28a19fa710e
---

BME_frontend 有一套自研「液态玻璃」风格组件库 **DewUI**，位于 `src/components/ui/`，从 `@/components/ui` 统一导出（DewButton / DewCard / DewInput / DewSwitch / DewPopover / DewDialog / DewMessage / DewSidebar 等 17 个）。展示页 `/ui-showcase`，含亮/暗切换。

设计语言三支柱（新增或改造 UI 必须贴合其**精神**，而非只抄 token）：

1. **液态玻璃 = 四层叠加**：背景 `backdrop-filter: blur(20px) saturate(1.5)` + 半透白底；折射层 `radial-gradient` 跟随鼠标 + `mix-blend-mode: overlay`；色散层红绿蓝微光 + `mix-blend-mode: screen`；边缘 `1px` 白边 + `inset 0 1px 0 rgba(255,255,255,.35)` 顶部内高光（玻璃上沿反光的灵魂）。

2. **水滴弹性动画**：全局唯一曲线 `--dew-bounce: cubic-bezier(0.34,1.56,0.64,1)`（第二控制点 >1 制造 overshoot 回弹），所有交互态 0.34~0.4s。形态各异：按钮宽度随内容弹性伸缩、卡片 hover 上浮、开关 thumb 用 `left` 百分比滑（非 translateX）、浮岛水滴绽放 `scale(.4)→1`+圆角 morph。

3. **精致克制**：透明度梯度（bg .15~.4 / border .25 / highlight .35）做「冰透」而非「全透」。**关键取舍——不是所有组件都用玻璃**：Popover/Dropdown 走 iOS 纯色（无 glass/无描边/浅阴影，保清晰可读）；PostCard 半透明实心、IslandGroup 卫星岛源码注释明确去 backdrop-filter（列表/多张省性能）；Badge/Tag 纯内联无 surface。

**Why:** 这是项目统一视觉基调，混入 Element Plus 默认样式或自创风格会破坏一致性。设计意图（露珠/活的玻璃）与「哪里故意不用玻璃」的取舍，从单个组件文件看不出来，是跨文件的隐式约定。

**How to apply:** 优先复用现有 DewUI 组件；新增组件先仿四层玻璃配方 + `--dew-bounce` 曲线；新 token 同时加到 `tokens.css` 的 `:root` 和 `.theme-dark` 两处（亮暗同改），并从 `index.js` 导出；暗色靠父元素挂 `.theme-dark` 覆盖 `--dew-*` 变量。**字体已全局统一**（2026-07-08）：`styles/main.css` 里 `body { font-family: var(--dew-font) }` + `:root { --el-font-family: var(--dew-font) }`（**关键技巧**：Element Plus 组件读它自己的 `--el-font-family`，只设 `body` 字体管不到 el-menu/el-button 等，必须桥接 `--el-font-family`）+ `code/pre/kbd/samp` 用 `--dew-font-mono`。等宽 token `--dew-font-mono` 也在 tokens.css。**新页面/组件无需再声明字体**。**国内部署禁用外网字体 CDN**（`fonts.googleapis.com` 等不可达，曾导致 LLM 页字体异常+Safari 下 menubar 字体不一致）——字体一律用 `--dew-font`/`--dew-font-mono` 系统栈，或本地自托管字体文件。本地环境与三仓库分工见 [[bme-local-dev-env]]。
