---
name: dew-ui-progress
description: Dew UI 组件库开发进度、设计决策、已完成与待开发组件
metadata:
  node_type: memory
  type: project
  originSessionId: a86d308a-62a3-4c17-8b52-de5e382237f3
---

# Dew UI 组件库开发进度

**创建日期：** 2026-06-11
**命名：** 原名 BME UI，2026-06-11 重命名为 Dew UI（露珠）
**文件位置：** `src/components/ui/`

## 设计语言

- 液态玻璃（Liquid Glass）风格：毛玻璃折射 + 鼠标追踪折射光 + 色散彩虹 + 水滴弹性曲线
- 水滴弹性曲线：`--dew-bounce` token = `cubic-bezier(0.34, 1.56, 0.64, 1)` 全局统一
- 所有组件共享 `tokens.css` 中的 `--dew-` 前缀变量
- 统一字体：`--dew-font` token（-apple-system → PingFang SC → Microsoft YaHei 回退链）

## 已完成组件

### DewButton 按钮 ✅

- **Props：** type(glass/danger/ghost)、size(sm/md/lg)、active、disabled、block
- **特性：** 鼠标追踪折射、弹性宽度过渡、点亮状态（白光/红色光焰）、type="button" 防表单提交

### DewButtonBar 按钮栏 ✅

- **Props：** items(含 icon/badge)、modelValue(v-model)、size(sm/md)
- **特性：** 滑动指示器 + 水滴弹性滑动 + 未读 badge

### DewCard 卡片 ✅

- **Props：** variant(default/elevated/inset)、size(sm/md/lg)、glass、interactive、noHover、tinted、accent、divided
- **特性：** 鼠标追踪折射 + 顶部高光线 + 色彩底色 + 可交互涟漪(位置追踪) + 分割线
- **2026-06-14 修复：** `.dew-card__header` 三档都补了 padding-bottom（sm10/md12/lg14）——之前只有 padding-top，导致 divided 分割线贴死标题文字
- **已知性能点（待优化）：** `@mousemove` 折射追踪无条件绑定，非 interactive 卡片也追踪鼠标+重算渐变；首页 DewCard 多时（统计卡/入口卡/月榜）吃性能。计划加开关只在 interactive 时追踪/渲染折射层

### DewBadge 徽标 ✅

- **Props：** value、type(primary/success/warning/danger/info/neutral)

### DewTag 标签 ✅

- **Props：** type、size(sm/md)、round

### DewInput 输入框 ✅

- **Props：** modelValue、type(text/email/password)、size(sm/md/lg)、clearable、disabled、error、round、expandOnFocus、prefixIcon、suffixIcon
- **特性：** 鼠标追踪折射 + 聚焦发光 + 密码切换 + 清除按钮 + IME 中文输入兼容 + el-form-item 自动感知错误态
- **已修复：** nativeType 映射(password)、isComposing 守卫、mousedown.prevent 防失焦、:invalid 全局重置

### DewSwitch 开关 ✅（2026-06-13）

- **Props：** modelValue(v-model)、disabled、size(sm/md)、activeColor
- **Emits：** update:modelValue、change
- **尺寸：** md 轨道 44×24、thumb 26×20；sm 轨道 36×20、thumb 20×16
- **特性：** 鼠标追踪折射 + 水滴弹性滑动(--dew-bounce) + 胶囊形thumb(border-radius:9999px) + hover放大 + 按下缩小 + 激活态发光
- **设计偏好：** thumb 宽度超过轨道 50%，形成胖胶囊风格，不要正圆鹅蛋形
- **修复：** thumb 位移用 left 而非 translateX（百分比相对自身而非父元素）；垂直居中用 top:50% + margin-top 负半高

### DewPopover 浮层 ✅（2026-06-13）

- **Props：** modelValue(v-model)、trigger(click/hover)、placement(bottom/top)、showArrow、width、offset、disabled
- **Slots：** #trigger（触发器）、#default（浮层内容）
- **视觉风格：** iOS 风格，纯色无 glass — 无描边、浅阴影(`0 2px 12px`)、14px 大圆角、可选小三角箭头
- **定位引擎：** 自研，基于 getBoundingClientRect + fixed 定位，支持视口碰撞自动翻转
- **特性：** Teleport to body + 点击外部关闭 + 滚动/resize 更新位置 + scale 过渡动画 + hover 延迟关闭
- **设计偏好：** 浮层组件不做毛玻璃效果，纯色干脆利落；描边去掉；阴影轻收敛

### DewDropdown 下拉菜单 ✅（2026-06-13）

- **Props：** modelValue(v-model)、trigger、placement、items([{ label, icon?, command, danger?, disabled? }])、disabled
- **Emits：** update:modelValue、select(command)
- **基于 DewPopover 构建**，预设菜单列表样式，danger 项红色高亮，点击自动关闭

### DewIsland 浮岛 ✅（2026-06-13）

- **Props：** modelValue(v-model)、disabled、panelWidth([String,Number] 默认360，支持 'min(360px,calc(100vw-24px))')、margin(默认12)
- **Slots：** #trigger（收起态触发器）、default（展开态面板）
- **行为：** 点击触发器切换展开/收起；点击空白（capture document 监听，contains 判断）收起；展开那一下点击落 triggerRef 内不会自关
- **定位：** Teleport to body + position:fixed；水平居中于触发器、面板顶边对齐触发器顶边（iOS 岛逻辑，向下生长，避免顶部溢出）
- **踩坑：** 面板尺寸必须用 `offsetWidth/offsetHeight`——`getBoundingClientRect` 会带上 enter-from 的 `transform scale(0.4)`，量到 0.4× 尺寸导致居中算错
- **动画：** transform-origin: top center，scale(0.4→1) + border-radius morph(999px 胶囊→面板圆角) + opacity，--dew-bounce 弹簧；展开时触发器淡出+pointer-events:none（被岛吸收，消除双层 popover 套 card 感）
- **材质：** 液态玻璃 `--dew-island-*` token（tokens.css 新增，照 `--dew-card-glass-*`）；暗色靠 body 的 .theme-dark 自动继承（App.vue 挂在 body 上），无需 themeClass prop
- **复用 DewPopover 骨架**（Teleport / click-outside / 定位 / scroll+resize 重定位），简化掉 flip/arrow
- **已在 UiShowcaseView 展示页验证**（先展示页后业务页）— [[feedback-dew-showcase-first]]

### DewIslandGroup 岛组 ✅（2026-06-14）

- **Props：** items(卫星岛 [{ value, unit?, color?(hex), ... }])、mainPanelWidth(默认300)、satPanelWidth(默认240)
- **Slots：** #main-trigger（主岛触发器）、#main-content（主岛展开）、#detail（作用域 {item,index}，每个卫星岛展开）
- **行为：** 内部用 DewIsland 渲染主岛 + N 卫星岛；单一 openKey 管理展开状态，**主岛与卫星岛互斥**（同时只开一个）
- **卫星岛触发器**：极简彩色胶囊（仅 value+unit，如 18d / 47h / #12），pill 圆角(9999px)，height 50px 与主岛 DewButton lg 等高，**无 backdrop-filter**（省性能）；底色 = color 渐变淡彩 + inset 高光
- **设计**：主岛真玻璃(可展开)，卫星岛彩色胶囊；「灵动岛生态」容器，未来番茄钟等岛可加入。IslandGroup 是正当其时（有真实多岛需求）——区别于早先推迟的判断
- **已在 UiShowcaseView 验证** — [[feedback-dew-showcase-first]]

### DewPostCard 帖子卡 ✅（2026-06-14）

- **Props：** post({ id, author, authorAvatar, publishTime, title?, content, images?, likes, views, comments, liked, bookmarked, badge? })、mode(full/compact)
- **Emits：** click、user-click、like、comment、bookmark、more、image-click
- **full 模式**：完整正文 + 1~4 图网格 + 操作行（点赞/评论/收藏）；点赞用**爱心 SVG**（非 emoji，已赞玫红 #f43f5e、已收藏琥珀 #f59e0b）
- **compact 模式**：左 main(发帖人信息+正文) / 右 media(缩略图，stretch 等高) + 底部 点赞·观看·评论 / 更多(⋮)。首页 feed 用 compact，社区页用 full
- **材质**：复用 `--dew-card-*` 默认 token，**半透明实心无 glass**（列表多张不吃 backdrop-filter 性能）
- `#话题` `@提及` 自动着色（v-html span）
- **取代旧的 TweetCard.vue**（components/Community/，GitHub 风格、已无人用，待删）
- 已在 UiShowcaseView 验证（full + compact 带图/纯文本）

### DewDialog 弹窗 ✅（2026-06-14）

- **Props：** modelValue(v-model)、title、width(500)、closeOnClickModal、closeOnPressEscape、showClose、glass(默认开)
- **Slots：** #header(默认 title)、default(正文)、#footer
- **行为：** Teleport to body + 遮罩(blur 8px) + 点遮罩/Esc 关闭 + body 滚动锁 + --dew-bounce 弹性缩放进场
- **视觉：** 液态玻璃 --dew-card-glass-*，大圆角深阴影

### DewMessageBox 命令式弹窗 ✅（2026-06-14）

- **API：** `confirm(msg, title?)` → Promise(resolve确认/reject取消)；`alert(msg, title?)` → Promise(总 resolve)
- **实现：** DewMessageBox.js，createApp + h(DewDialog) 动态挂 body → Promise → 300ms 卸载；注册 ElIcon
- **用法：** `import { DewMessageBox } from '@/components/ui'`

### DewInput textarea 模式 ✅（2026-06-14）

- 新增 `type="textarea"` + `rows`(默认 4)：渲染 `<textarea>` 代替 `<input>`，resize:vertical，各尺寸 padding
- 所有 Dew 特性照常（玻璃表面/聚焦发光/错误态/IME 兼容/el-form-item 感知）

## 展示页优化

- **2026-06-13：** UiShowcaseView 改为 tab 导航模式（DewButtonBar 做导航），一次只渲染一个组件区块（v-if），解决 backdrop-filter blur 导致亮暗切换卡顿的问题
- **2026-06-14：** 12 个 Dew 组件全部有展示页 tab + README 文档。封装规范审计通过：无 emoji、无蓝紫渐变默认、无 GitHub 风格硬编码色
- **2026-06-14 晚：** 展示页 tab 合并精简（12→10）：Button+ButtonBar 合一、Island+IslandGroup 合一（改 v-if + 去 nav 项）

## 暗色模式架构（已完成）

- `tokens.css` 中 `:root` 定义 `--dew-` 变量（亮色默认值）
- `.theme-dark` 覆盖全部变量为暗色值
- 使用方只需在父元素挂载 `theme-dark` / `theme-light` class 即可切换

## 首页方向（2026-06-14 更新）

- **LivePanel**：顶部一行 grid(1fr/auto/1fr)——问候+日期**左对齐**、**DewIslandGroup 居中**。4 个统计卡已移除换成岛组：主岛=打卡胶囊（学习中/今日已完成/未打卡）展开今日累计+进度条（目标4h）；3 卫星岛=月天数(蓝)/月时长(绿)/月排行(琥珀)，均可展开 detail，主岛与卫星岛互斥。DewIsland 不直接用，由 DewIslandGroup 内部包裹。窄屏堆叠
- **StudyHub 重构**：轮播下方用 DewButtonBar(size=md) 做 [学习入口 | 社区广场 | 座位图] 三 tab 切换
  - 学习入口：每个入口是 DewCard(sm)，**4 列**网格，共 **7 个**（课程/题库/学习小组/考核/资源/**3D打印**/**大模型**）；emoji 全换 Element Plus 图标（Reading/EditPen/UserFilled/Select/Files/Box/MagicStick），语义色 chip。3D打印(青#06b6d4)/大模型(品红#ec4899) 路由 `/3d-print`、`/llm` 占位待确认是否 disabled
  - 社区广场：用 **DewPostCard compact 模式**（左 信息+正文 / 右 缩略图 + 底部 点赞·观看·评论 / 更多），**单列**（2 列试过不符合推文流逻辑已改回）；真实 API `/discussions/threads` + mock 兜底（字段映射 authorAvatar/content/likes/comments/views/liked），点击跳 /community
  - 在线看板（原座位图改名）：**SeatBoard 架构**（components/SeatMap/：SeatBoard+RoomRegistry+rooms/Room106Map+OctagonShape）；**已接真后端**（Flask seat.py → /seat/rooms/<name>/seats）；5 八角形×8 三角=40 座，颜色按 occupied（check_out IS NULL 的 CheckRecord join），悬停跟随光标提示学生名；详见 [[seat-feature-backend]]
- **出勤月榜** AttenceRankComponent：DewCard(glass+divided, size=lg) + 奖牌圆形徽标(金/银/铜) + mock 兜底；标题 22px/500 + 月份徽标
- **主页亮色背景**：淡渐变（HomeView `.theme-light .homeMainContainer`，复用展示页 linear-gradient `#f0f4ff→#fdf2f8→#f0fdf4`）

## 下一步开发计划

### 近期完成（2026-06-14）
- DewDialog + DewMessageBox（进展示页验证）
- DewInput 新增 type=textarea 模式
- FeedbackBubble 全 Dew 重构（DewButton 绿色 lit 胶囊 + DewDialog + DewMessageBox + DewInput textarea；仅 el-upload 保留）
- 展示页 tab 合并精简（Button+ButtonBar、Island+IslandGroup）
- 座位图/打卡后端 4 步全完成（详见 [[seat-feature-backend]]）

### 待做（按性价比）
- **DewSelect 下拉选择器** — 交互最复杂（搜索/键盘导航/多选）
- **DewMessage**（toast 气泡，替代 ElMessage.success）— 全站大量使用
- **DewUpload** — 图片上传（FeedbackBubble 保留 el-upload）
- **DewAvatar / DewTooltip** — 低优先级

## 已踩过的坑

- el-form template ref 必须在 script setup 中声明 — [[feedback-form-ref]]
- el-form + DewInput 需要 `novalidate` 禁用浏览器原生验证
- 浏览器 :invalid 红色虚线需全局 CSS 重置（main.css）
- DewButton 需显式 `type="button"` 防止表单提交
- DewInput 密码切换/清除按钮需 `@mousedown.prevent` 防止 input 失焦
- DewInput 需 `e.isComposing` 守卫兼容中文输入法
- DewSwitch thumb 位移：`translateX(%)` 百分比相对元素自身，必须用 `left` 定位（相对父元素）
- DewSwitch 垂直居中：`top:50%` + `margin-top: calc(h / -2)` 不受 border 影响
- backdrop-filter blur 性能：大量玻璃组件同时渲染会卡顿，展示页需 tab 按需渲染

## 关键文件

- `src/components/ui/tokens.css` — 设计 Token + 暗色变量
- `src/components/ui/index.js` — 统一导出
- `src/components/ui/README.md` — 组件文档
- `src/views/UiShowcaseView.vue` — 组件展示页（tab 导航模式）
- `src/styles/main.css` — 全局样式（:invalid 重置）
