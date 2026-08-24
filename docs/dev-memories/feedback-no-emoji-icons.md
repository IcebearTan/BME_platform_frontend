---
name: feedback-no-emoji-icons
description: 禁止用 emoji 当图标/装饰前缀，改用 Element Plus 图标或 SVG/Dew 视觉层
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 12208ec5-e453-47f7-85b9-3e10ac80e86c
---

不要用 emoji（🏆📚🎨 等）当图标或标题装饰前缀。需要图标时用项目已有方案：**Element Plus 图标**（`@element-plus/icons-vue`，如 `<Bell />` `<Document />` `<Trophy />`）、SVG、或 Dew 组件自带的视觉层（status-dot、DewBadge 等）。装饰符号（如 ✦）也尽量别用，倾向正式图标。

**Why:** 重构出勤月榜时我在标题加了 🏆，用户明确纠正"禁止使用emoji当icon，你又加emoji进来了"。emoji 跨平台渲染不一致、风格杂、与液态玻璃设计语言不搭。

**How to apply:** 任何组件标题/按钮/列表项需要图标时，优先 `@element-plus/icons-vue` 里现成的图标组件（项目已大量使用）。写完自查一遍有没有顺手塞 emoji。注意：StudyHub 等旧组件里残留的 emoji（🎓📚📝）是历史代码，替换需单独和用户确认，不要擅自大改。参见 [[dew-ui-progress]]。
