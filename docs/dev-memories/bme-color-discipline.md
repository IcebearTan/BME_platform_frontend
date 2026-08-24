---
name: bme-color-discipline
description: BME 前端配色纪律——强调色必须用 DewUI token 禁硬编码 indigo 紫、hover 反馈优先形态而非变色（用户嫌 AI 味）
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 98b45c1e-4dd6-4149-8195-c965ee5030a6
  modified: 2026-07-30T02:54:45.721Z
---

BME_frontend 交互配色两条硬约束（2026-07-30 用户反馈）：

1. **禁硬编码强调色，一律走 DewUI token**。项目主色 `--color-primary: #3b82f6`（蓝，**非紫**）。ArticleCard 曾写死 `#4f46e5`/`#a5b4fc`(indigo)，用户明确说"很 AI 味儿、不好看"。indigo 紫（#4f46e5 / #6366f1，后者恰是 DewTag 的 info 色）就是 AI 产品套路色，别再用。需要强调色 → 用 `--color-primary`/`--color-success` 等语义 token；暗色由 tokens.css 自动覆盖，**别再写 `.theme-dark` 硬编码色覆盖**。

2. **hover 反馈优先形态，别靠变色**。用户原话："也许选中不需要颜色的改变"。hover 染色（标题变强调色）是最一眼的模板套路。优先用：卡片上浮、箭头位移(`translateX`)、元素微缩放(`scale`)、`--dew-ghost-hover-bg` 轻底色。这些都不合适时才考虑明度微变，尽量避免色相切换。

**Why:** 硬编码紫 + hover 变色 = 典型"AI 生成感"，用户审美反感；项目已有完整 token 体系(tokens.css)，跑偏离写死色既不一致也难维护暗色。

**How to apply:** 写交互态 CSS 先自问——这色能用 token 吗？这 hover 能换成形态(位移/缩放/底色)吗？当前定下的标签层级：文章=primary 蓝(核心长内容担当主色)、讨论=neutral 灰(次要内容退灰)。

关联：[[bme-dewui-design-language]] [[bme-no-emoji-sparse-icons]] [[bme-aurora-bg-standard]]
