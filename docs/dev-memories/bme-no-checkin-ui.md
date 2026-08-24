---
name: bme-no-checkin-ui
description: BME_frontend 没有可点击的打卡UI入口(岛栏LivePanel只读展示打卡态、无签到动作)；旧孤儿组件CheckinStatus/UserGreeting/DailyAttendence已于2026-07-28删除，双月展示由MiniCalendar.vue替代
metadata: 
  node_type: memory
  type: project
  originSessionId: 3ca3ae20-7d79-4820-8aaf-ccb920d8982d
  modified: 2026-07-28T07:20:25.275Z
---

> **2026-07-28 更新**：`CheckinStatus.vue` / `UserGreeting.vue` / `DailyAttendence.vue` 三个孤儿组件已删除；首页右侧出勤展示改由新组件 `src/components/Attendence/MiniCalendar.vue` 承担（双月热力缩略 + 点击跳 `/user`，纯展示不含签到）。下方"无打卡入口"结论仍成立——岛栏(LivePanel)主岛只读展示打卡态，签到动作入口缺失。

BME_frontend（用户端 Vue）当前**没有任何能点击的打卡 UI 入口**：

- `src/components/Home/CheckinStatus.vue`（唯一含签到/签退弹窗 + `POST /check` 逻辑的组件）和它的包装 `src/components/Home/UserGreeting.vue` **都是孤儿组件**——全 src 无任何 import 挂载它们。
- 首页 `HomeView.vue`（`/home`）只挂了 `LivePanel`（只读展示打卡态胶囊，无 `@click` 打卡）、`StudyHub`、`AttenceRankComponent`，没引入 UserGreeting/CheckinStatus。
- `src/components/Attendence/DailyAttendence.vue`（另一套签到/签退 + 30s 轮询）也是孤儿，未被 import。
- Vuex `store.js` 里的 `setCheckinInfo/setCheckinStatus/clearCheckinInfo` 三个打卡相关 mutation **全是死代码**（零调用方）；无 mitt/eventBus。

后端侧：写 `check_record` 的接口只有 `POST /check`（`check_in_out`）、`POST /face_check`（`face_check`），都在 `BME_platform_flask/blueprints/codecheck.py`；全平台无补卡/管理员改记录接口。人脸签到前端零命中（`/face_check` 是给第三方服务接入的）。

**Why**：这意味着"用户从前端点击签到/签退"这条路目前是断的；现存打卡数据来自别端/历史/测试。任何"打卡成功后刷新 XX"的前端同页联动设计，前提是先把 CheckinStatus 接回某个真实渲染的视图（最自然放进 LivePanel 或 HomeView）。

**How to apply**：碰到"打卡后联动""签到状态同步"类需求，先确认打卡入口是否已接回；目前贡献日历的实时性靠后端去缓存 + 进页面 onMounted 刷新即可（见 [[bme-attendance-calendar-cache]]）。后端重启方式见 [[bme-flask-restart-trap]]、[[python-uv-toolchain]]。
