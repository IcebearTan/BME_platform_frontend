---
name: feedback-toast-minimal
description: toast/消息气泡偏好极简单图标色，不要彩色底/图标色块等额外强调
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 27b3c410-b280-4334-bac9-bd9c82e1c6c4
---

DewMessage 等短暂提示组件保持克制：白/暗玻璃 + 单图标语义色即可，**不要**彩色浸润底色、图标色块、左侧色条这类额外强调手段。

**Why:** 给 DewMessage 加了"淡彩浸润玻璃 + 图标色块"的类型强调方案（参照 DewCard tinted），用户直接说"太丑了"并手动回退到单图标色版本。toast 小而瞬时，彩色底反而花哨廉价；类型辨识靠图标颜色就够。

**How to apply:** DewMessage 及类似 toast/通知条，类型区分只用图标 + 图标色，主体保持中性玻璃。即便用户要"更丰富"，也别走彩色底/色块路线——优先调整图标、间距、字号这些克制维度。参见 [[dew-ui-progress]] [[feedback-no-blue-purple-gradient]]。
