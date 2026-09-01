# 营期模块 · 设计逻辑 / IA 框架 / 设计语言规范

> 适用仓库：`BME_frontend`（用户端）为主，含与 `BME_backend`（管理端）、`BME_platform_flask`（后端）的对接约定。
> 定稿：2026-08-23（营期 IA 重构「方案 A：工作台为家」+ 考勤状态渲染归类）。
> 修订：2026-08-24（新增「团购导生」全出血子路由例外 + 选导生 tab 瘦身为状态机 + 热度红线）。
> 本文是营期域前端开发的**唯一规范来源**；与本文冲突的旧实现以本文为准。

---

## 一、IA 总览：一个领域一个家

### 1.1 域地图

```
/camp        ← 营期唯一工作台（成员/已分配者的一切营期事务都在这里）
/camp-home   ← 纯招募着陆页（只有非成员学员会停留；成员访问自动 redirect 回 /camp）
```

| 页面 | 身份 | 看到什么 |
|---|---|---|
| `/camp` | 学员/导生/老师/超管（有成员营） | 侧栏选营 + 营期头部 + tabs 工作台 |
| `/camp` | 无成员营的学生 | 空状态分流卡（有招募营→CTA 申请；无→暂未开放） |
| `/camp` | 无成员营的 staff | 「尚未被分配」提示 |
| `/camp-home` | 非成员学员 | 招募页（力连接图 hero + 特色卡 + 选日申请 sheet） |
| `/camp-home` | 成员/已分配 | **自动 redirect** `/camp?sid=` |

### 1.2 入口收敛（全站只有这些入口，新功能不要另开）

| 入口 | 指向 |
|---|---|
| 顶部导航「暑期训练营」logo | `/camp-home`（成员被弹回 /camp） |
| 头像下拉「我的营期」 | `/camp` |
| 学习中心 StudyHub（banner + 快捷格子） | `/camp` |
| 通知点击（camp 类，带 tab/sid） | `/camp?tab=&sid=` |
| 个人中心侧栏「我的营期」 | `/camp` |
| 老书签 `/group` | redirect `/camp` |

**禁止**：为营期功能新增独立路由/首页插卡（历史上出现过 `/mentor-market` 式的割裂入口，已否决——营期相关功能一律住在 `/camp` 的 tab 里）。

**例外（2026-08-24 修订）——「团购导生」子路由**：允许 `/camp/:sid/market` 这类**营期域内的全出血展示型子路由**。当时否决 `/mentor-market` 否定的是"全站割裂入口"，不是"营期域内不许有子页面"。此例外的边界：
- URL 必须住在 `/camp/` 域内且带 `sid`（营期上下文不丢）；
- 入口不新增：唯一入口是工作台 ms tab 的 CTA（通知深链仍指 `/camp?tab=ms&sid=`，状态优先，不直跳市集）；
- 成员校验同工作台：非该营成员访问自动回落 `/camp`；导生端无挑选任务，访问回落自己的 ms tab；
- 全出血布局（脱离工作台 shell，无侧栏无 tabs）**只授予"展示型逛购"页面**，事务型功能（考勤/请假/选课等）仍一律住 tab。

### 1.3 四条设计原则（决策时拿来仲裁）

1. **一个领域一个家**：营期域的一切入口收敛到 `/camp`；子功能 = tab，不是新页面。
2. **URL 即状态**：`/camp?sid=&tab=` 可分享、可收藏、可从通知直达；页面状态从 URL 初始化。
3. **导航深度与使用频率成正比**：高频操作（选课/考勤/请假/选导生）2 clicks 内可达；只读展示（看板）当默认落地页。
4. **招募页是门口，不是客厅**：`/camp-home` 只服务"还没进营的人"，成员绝不在此停留。

---

## 二、/camp 工作台架构

### 2.1 布局解剖（CampView.vue）

```
┌────────────┬──────────────────────────────────────────┐
│ 我的营期    │  2026暑期训练营            ← hero（无卡片）│
│            │  ● 进行中 · 08-26~09-30 · 规则简行  [ms胶囊]│
│ ▌当前营(高亮)│  ▓▓▓▓▓░░░░ 进度条通栏                    │
│  卡片列表   │  [看板][选导生][选课][我的考勤][请假] ←tabs │
│            │  ── tab 内容区 ──                          │
└────────────┴──────────────────────────────────────────┘
  aside 224px     camp-main（flex:1，容器 max-width 1280）
```

- **左侧营期卡片列表**：每营一卡（名称/状态圆点/日期），当前营 primary 高亮；**无折叠**（两三营规模折叠属过度设计，已砍）；窄屏（<760px）自动变横排。
- **hero 无卡片化**：营名大标题 + 一行元信息（状态·日期·期望到岗·每日时长·出勤日）+ 选导生阶段胶囊（右对齐）+ **通栏进度条**。所有 tab 共用，不属于任何 tab。
- **选导生胶囊**：营启用 ms 即常驻（即将开始/已结束也显示、可点），进行中才主色高亮+脉动点+「去处理」；点击切 ms tab。
- **tabs（DewButtonBar）**：`看板` 恒为第一个（默认落地）；`选导生` 仅在 `session.mentor_selection_enabled` 时插入第二位（2026-08-24 起 tab 为**状态机 + 市集入口**，浏览与提交住 `/camp/:sid/market`，见 §2.4）；其余按角色：
  - 学员：选课 / 我的考勤 / 请假
  - 导生：团队考勤 / 请假审批 / 发奖励 / 团队成员

### 2.2 关键交互逻辑（改代码前必读）

- **tab 初始化**：`route.query.tab` 优先，否则第一个 tab；sessions 异步加载后 `watch(tabItems)` 校正（ms tab 依赖 session 数据，首帧不在 items 里）。
- **切营回落**：切到新营后若当前 tab 不存在（如 ms 未启用），自动回落到第一个 tab——**任何 tab 渲染分支禁止用 `v-else` 兜底**，必须显式 `v-else-if="tab === 'xxx'"`（踩过：LeaveApply 的 v-else 在 overview 下误渲染）。
- **多营上下文**：一切数据按 `sid` 拉取（组件接 props.sid + watch immediate）；**禁止**用 `/camp/featured` 的单营数据喂工作台（那是招募指针，成员侧不消费）。
- **TDZ 警告**：CampView 的 `current` computed 必须声明在依赖它的 computed 之前（`tab` 初始化在 setup 期立即求值，会级联读取）。

### 2.3 空状态分流（CampView onMounted）

无成员营时调一次 `fetchFeatured`：
- 学生 + 有 active 营 → 「查看『营名』· 申请入营」CTA → `/camp-home`
- staff + 有 active 营 → 「尚未被分配」提示（导生/老师由管理端分配）
- 无 → 「暂未开放营期」

### 2.4 团购导生（/camp/:sid/market，2026-08-24 新增）

浏览与提交志愿从 ms tab 迁出到全出血市集页；tab 退化为"我的状态"：

| 阶段 | ms tab（状态机） | 市集页 |
|---|---|---|
| upcoming | 开始时间提示 | 打烊提示 + 返回 |
| collecting 未交 | **大 CTA 卡**（主入口）+ 倒计时 + 从众信号 | 营业：卡片墙 + 托盘 |
| collecting 已交 | 我的 3 志愿回显（只读）+「再逛逛」次级入口 | 营业（截止前可整组改） |
| round1 | 等待卡「导生正在挑选」 | 打烊提示 + 返回 |
| round2 未匹配 | 状态卡 + 市集入口 | 营业：仅剩有名额导生 |
| done | 结果海报卡 / 未匹配提示 | 打烊提示 + 返回 |

- 市集营业态采用已确认的「导生集市」海报：海报内只保留返回入口，以及每 2 秒切换的截止倒计时/全营从众信号；不重复展示营名、活动标题、说明文字或阶段条。倒计时按总小时、分钟、秒实时刷新，到期显示「已截止」；从众信号使用 `phase.stats`，后台每 30 秒刷新。
- 海报下方统一使用「集市规则」三列说明：选 3 个有序志愿、双方互选、截止前整组修改；不再分散重复规则文案。
- 分类筛选继续使用 `DewButtonBar`，激活项平滑展开该分类当前可见导生数；二轮数量按剔除满员后的候选集计算。
- 志愿状态唯一真相源是 phase 接口（`me.round1/round2`）；tab 的回显从它渲染，不另存本地状态。
- 卡片复用 MsMentorCard，采用 4:5 展示图片 + 志愿顺位 + 姓名右侧 `matched/capacity` + 单段两行 bio + tags + 团购价格。卡片不再显示「余 X」、名额进度条或重复简介；已选卡片不提供移除按钮，移除统一在托盘完成。
- 展示图片可点击打开大图；上传当前保持可选，未上传时回退姓名首字。是否需要强化、弱化或取消上传入口，待导生使用意愿调研后决定。
- 托盘标题为「我的心仪导生（N/3）」，桌面三项横排、移动端单列；每项右上角移除，左右箭头排序，留言字段保留。一轮必须提交 3 个，二轮允许 1–3 个。

---

## 三、设计语言（DewUI 体系下的营期风格）

### 3.1 组件选用

| 场景 | 用什么 | 说明 |
|---|---|---|
| 内容卡 | `DewCard` | 数据展示默认 `variant="default"` + `:no-hover="true"`；强调用 `tinted accent="..."` |
| 页头/大区块 | **无卡片** | hero 类区域直接裸排版（title + 元信息行），不包 DewCard |
| tab/筛选 | `DewButtonBar` | v-model + items `{value,label}` |
| 徽章/计数 | `DewBadge` / `DewTag` | type ∈ success/warning/danger/primary/neutral |
| 输入 | `DewInput`（含 textarea） | 不用裸 el-input 做主表单 |
| 点选标签 | chips（自写 span + token） | 见 MsMentorProfile 的 tag-chips 模式 |
| 数值步进 | −/＋ 按钮 + 大数字 | 见 MsMentorProfile stepper 模式 |
| 骨架 | `DewSkeleton` | 加载态一律骨架，不用空白 |

### 3.2 配色纪律（硬约束）

- **一切颜色走 token**：`--color-primary/success/warning/danger/info`、`--dew-text-{heading,text,muted,faint}`、`--dew-card-*`、`--radius-*`。**禁止硬编码 hex**（尤其 `#4f46e5` 一类 AI 套路紫/蓝）。
- **hover 用形态反馈不用变色**：位移 `translateY(-1px)` / 缩放 / 描边变化优先，颜色变化其次。
- **蓝色（--color-info / indigo 系）在考勤语境只留给「请假」一种语义**——新状态别再引入蓝色系。

### 3.3 考勤状态渲染体系（单一真相源）

后端 9 态细分（`present/late/short_hours/late_and_short/absent/on_leave/pledged/in_progress/unpledged`）**保留**，前端渲染归类收敛为：

| 视觉键 | 归并的后端状态 | 呈现 |
|---|---|---|
| present 出勤 | present, late | 绿（迟到加右上角琥珀角标） |
| insufficient 未达标 | short_hours, late_and_short | 黄（可带角标） |
| absent 缺勤 | absent（仅过去的日期） | 红 |
| on_leave 请假 | on_leave | 蓝（唯一蓝） |
| pending 待考勤 | pledged, in_progress | 灰实线描边；今天进行中圆点脉动 |
| unpledged 未承诺 | unpledged | 灰虚线 |

- **归类函数**：`campService.js` 导出的 `campVisualKey(status, isToday)` + `CAMP_STATUS_TEXT` + `todayLocal()`。**四个渲染面**（CampOverview 日历 / CampAttendance 明细 / MentorDashboard 矩阵 / 管理端 CampAttendanceBoard）全部走它；管理端是**同步拷贝**，改 campService 必须同步改 BME_backend。
- 特殊规则：今天还没打卡（后端判 absent）前端归 pending 不下结论；取「今天」必须 `todayLocal()`（`toISOString` 是 UTC，凌晨差一天）。
- 「迟到」是**角标不是颜色**（达标率口径 present+late 都算出勤）；文案可保留细分（“出勤·迟到”）。

### 3.4 文案与图形

- **杜绝一切 emoji**；装饰字符（✦ 之类）也不要。图标只用 `@element-plus/icons-vue`，且只在确有语义处用（去掉不损失语义就删）。
- 中文文案克制、短句；不用英文 kicker / 花哨标签（“EXPLORE MENTORS” 式已否决）。

### 3.5 动效

- 弹性曲线统一 `var(--dew-bounce)`；时长 0.2-0.45s。
- 列表入场 stagger：`--reveal-index` 变量 + `animation-delay: calc(min(var(--reveal-index), 8) * 45ms)`（封顶 8 档），并包 `prefers-reduced-motion` 降级。
- 进行中/活态用小圆点脉动（opacity 1→0.35 循环），不整卡闪。

### 3.6 海报卡范式（MsMentorCard）

选导生域的"人物展示"统一海报式：**4:5 展示图片区** + 志愿角标 + 姓名右侧 `matched/capacity` + tags + 单段两行 bio 截断 + 团购价格。无图片回退姓名首字 + token 色板。浏览卡只提供「抢」加入操作，移除统一在「我的心仪导生」托盘完成。编辑器（MsMentorProfile）右侧**实时预览直接复用该卡**——改展示形态只动 MsMentorCard 一处。

### 3.7 响应式

- 工作台容器 `max-width: 1280px` 居中；aside 224 / main flex:1。
- 断点：`760px` 工作台纵排 + 侧栏横排；`680-900px` 视组件内部两栏变纵排。

---

## 四、组件清单（src/components/Camp/）

| 组件 | 职责 | props |
|---|---|---|
| CampOverview | 看板 tab：角色仪表盘 + 出勤日历 | sid |
| CampSelection / CampAttendance / LeaveApply | 学员：选课 / 考勤明细 / 请假 | sid |
| MentorDashboard / MentorLeave / MentorReward / MentorMembers | 导生四事务 | sid |
| MsPhaseBar | 选导生五步阶段条（未配二轮则该步不渲染） | phase, round2Enabled |
| MsMentorCard | 海报式导生卡（市集加入 + 编辑器预览复用；移除不在卡片执行） | mentor, pickedRank, selectable, selectionDisabled, index, size |
| MsMentorProfile | 导生名片编辑（左编辑右预览） | sid, msTags, locked |
| MsStudentPick | 选导生**状态机**：阶段提示 / 我的志愿回显 / 结果卡 / 市集入口 CTA | sid |
| MsMentorDesk / MsMentorCard 相关 | 导生端意向单/收人 | sid |

页面：`views/CampView.vue`（工作台）、`views/CampHome.vue`（招募页）、`views/CampMarket.vue`（团购导生市集，路由 `/camp/:sid/market`）。

---

## 五、数据流与后端对接

- **API 面统一走 `services/campService.js`**（不直连 axios；资源 URL 用其导出的 `assetUrl()` 拼 API_URL，dev 8081→5001 跨域）。
- 阶段文案/状态归类/本地今天等**渲染助手也住在 campService**，随 import 复用。
- 后端微调原则：前端要什么字段，**在自有范式内加**（如 phase 加 `stats`、mentors 加 `taken`），不引入平行蓝图；管理端若有同构渲染需**手工同步**（无共享包）。
- 选导生业务模型（勿被"团购式单选"提案带偏）：**三有序志愿 → 导生收人（先到先得）→ 落选二轮互选 → 写 `team_mentor_id`**；名额实时进度语义只在 round1/round2 成立。
- **热度不进收集期（2026-08-24 红线）**："团购"只做表现层，模型不动。收集志愿期间学生端只可见**真实余量**（余 X / 已满）与全营汇总从众信号（X/N 人已交），**不得暴露任何单导师维度的志愿数**（"23 人想跟 TA"式）——防羊群效应挤死冷门合适导生、防抢购焦虑替代三志愿深思。单导师志愿数仅在截止后于导生端自己的意向单（MsMentorDesk）揭示。

---

## 六、开发者对接清单（新增一个营期功能时）

1. **入口**：加一个 tab（CampView 的 studentTabs/mentorTabs computed），**不要**新路由、不要首页插卡（唯一例外：全出血展示型子路由，见 §1.2 例外——需同时满足"营期域内 + 入口不新增 + 展示型"三条件）。
2. **组件**：`components/Camp/Xxx.vue`，接 `sid` prop，内部 `watch(sid, load, {immediate:true})`。
3. **服务**：接口加到 campService；跨营数据一律带 sid。
4. **渲染**：涉考勤状态 → campVisualKey；涉颜色 → token；涉加载 → DewSkeleton。
5. **验收路径**：`/camp?tab=xxx&sid=N` 直达可刷新；切营数据跟随；空状态不炸。
6. **常见坑**：v-else 兜底误渲染 / TDZ 声明顺序 / toISOString 时区 / 改后端要重启（app.py 无 reloader）/ 管理端同步拷贝。
