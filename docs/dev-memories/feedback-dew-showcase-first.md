---
name: feedback-dew-showcase-first
description: 新 Dew UI 组件必须先加到 UiShowcaseView 展示页验证，再接入业务页面
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 12208ec5-e453-47f7-85b9-3e10ac80e86c
---

新设计的 Dew UI 组件**必须先加到 `src/views/UiShowcaseView.vue` 展示页**（在 DewButtonBar 导航里加一个 tab + demo section），让用户在隔离环境验证效果，确认没问题后再接入业务页面（如 LivePanel）。不要做好组件直接拿去用。

**Why:** 开发 DewIsland 时我跳过了展示页直接接进 LivePanel，用户明确不满——"新设计的组件应该像之前一样放到展示页中先测试看看效果，而不是拿来就用"。展示页是组件的验收场，也是回归测试基准。

**How to apply:** 每个新 Dew 组件，实现 + index.js 导出 + tokens + README 之后，**先**去 UiShowcaseView 加 demo（照现有 section 的 `v-if="activeTab==='xxx'"` 模式 + navItems 加一项 + demo 用代表性内容，不必接真实业务数据），再接业务页面。参见 [[dew-ui-progress]]。
