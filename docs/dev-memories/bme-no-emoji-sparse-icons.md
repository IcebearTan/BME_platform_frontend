---
name: bme-no-emoji-sparse-icons
description: 前端设计硬约束——杜绝一切 emoji，Icon 只在确有必要处使用
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 6465030e-3e6c-49b9-b401-15f51de02125
---

BME_frontend（[[bme-dewui-design-language]]）前端设计的两条硬约束：

1. **绝对禁止 emoji**：UI 文案、标题、按钮、标签、占位符、注释里一律不得出现 emoji（✍️🐍💻🎉 这类全部不行）。装饰性表达用排版/留白/玻璃质感承担，不用 emoji 凑。
2. **Icon 克制使用**：只在「确有必要」处才用 Icon 图标——即该位置去掉图标会损失明确语义或可操作性时（如关闭按钮、点赞/回复操作行、菜单项前的功能标识）。纯装饰、可由文字说清楚的标题/标签不要硬塞图标。

**Why:** 用户明确要求「只在必须要用 Icon 的地方用 Icon，同时禁止和杜绝一切 emoji」。emoji 风格不统一、跨平台渲染不一致（尤其 Windows/国内环境），且会破坏 DewUI 克制精致的整体基调。

**How to apply:** 写任何 Vue 模板/文案时主动排查：看到 emoji 就删，换成纯文字或留白；看到图标就问「去掉它，用户还看得懂/点得到吗」，答是就删。Icon 用 Element Plus 的 `@element-plus/icons-vue`（与 DewUI 体系一致），不要引入第三方图标字体。注意复检既有代码里 `v-if="false"`/禁用块中的 emoji 数据（如社区专题的 icon 字段），用户说「杜绝一切」，有机会就一并清掉。
