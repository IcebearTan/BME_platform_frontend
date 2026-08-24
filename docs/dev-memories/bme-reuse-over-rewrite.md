---
name: bme-reuse-over-rewrite
description: "给\"看别人/看其他实体\"扩展功能时，优先复用现有页面/组件并保留其全部子组件，不要新写组件"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 29cda66e-94c8-42ae-ae66-511d133b4524
  modified: 2026-07-30T02:05:50.222Z
---

做"排行榜/社区点用户 → 看他/她的个人主页"时，我一度新写了 `UserProfileView.vue`、把原 `/user` 页的勋章(`MedalShowcase`)和出勤日历(`CalendarComponent`)丢掉、换成自造的统计卡。用户明确反对：要的就是**点头像进去那个 `/user` 页本身**给那个用户看，勋章和日历都得留着，重写组件没必要。

最终做法：`/profile/:id` 直接复用 `UserIndex.vue`（按路由 `:id` 分支自己/别人取数，别人不显邮箱）；资料卡/日历/勋章三个子组件各加 `userId` prop 按需取别人数据（后端 `/records/yearly`、`/medal/user_medal_show` 加可选 `?user_id=`）。

**Why:** 用户重视"与现有页面完全一致"的体验和最小新增面，胜过我以为的"架构更整洁"。新写组件还容易顺手丢掉既有功能。

**How to apply:** 给"给别的实体（别的用户/别的课程…）展示"扩功能前，先看有没有现成页面已为"自己"展示该内容；有就**参数化复用那个页面**（加 id/prop + 后端加可选查询参数，默认仍是自己、行为不变），保留其全部子组件；不要为了新功能另起炉灶写新 view。关联 [[bme-dewui-design-language]]。
