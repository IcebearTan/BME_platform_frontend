# Memory Index

> 统一索引（2026-07-29 合并四子项目；2026-07-31 并入 Windows 开发机迁移包记忆）。本仓 `BME_platform/` 归档了原分散的四个子项目：`BME_platform_flask`（Flask 后端）、`BME_frontend`（用户端）、`BME_backend`（Vue3 admin）、`BME_3DFarm`（3D 打印系统）。

## 维护规范

- 一个文件一条事实；开头 frontmatter（`name`/`description`/`metadata.type`，type 取 `feedback`/`project`/`reference`/`user`），`feedback`/`project` 类附 **Why** + **How to apply**。
- **必须登记本索引**（每次会话加载，未登记不会被读到）；删除记忆 = 删文件 + 删索引行。
- 命名 kebab-case + 子系统前缀（`bme-*` / `feedback-*` / `dev-*`），正文可中文；相关文件用 `[[name]]` 互链。
- 过时就删：代码改了、坑修了，删文件 + 删索引行。

## 平台主仓（本地既有）

- [重构进度](refactoring-progress.md) — 当前重构阶段、关键决策、后端环境配置（注意：部分已过时，与迁移包 `bme-*` 进度类记忆核对）
- [Dew UI 进度](dew-ui-progress.md) — 液态玻璃组件库开发进度、已/待完成组件、暗色模式架构（≈ 迁移包 bme-dewui-design-language / bme-dewui-flat-variant，进度待核对）
- [通知中心系统](notification-system.md) — 通知中心前后端统一方案、独立表架构、邮件推送
- [座位图/打卡后端打通](seat-feature-backend.md) — 三仓架构、打卡已就绪、座位 greenfield（**已过时**：固定座位制已实现，见迁移包 bme-seat-system）
- [每日出勤报告](attendance-report.md) — 00:00 自动汇总昨日出勤发邮件；APScheduler+fcntl锁、按user聚合
- [UI 微调偏好](feedback-ui-tweaking.md) — 大胆调整、不要每次只挪 2px
- [展示页优先](feedback-dew-showcase-first.md) — 新 Dew 组件先加 UiShowcaseView 验证，再接业务页
- [el-form template ref 教训](feedback-form-ref.md) — 搭配自定义组件时 template ref 必须在 script setup 声明
- [禁止 emoji 当图标](feedback-no-emoji-icons.md) — 用 Element Plus 图标/SVG，别在标题按钮塞 emoji（≈ 迁移包 bme-no-emoji-sparse-icons，同规则详版）
- [禁止默认蓝紫渐变](feedback-no-blue-purple-gradient.md) — 别首选蓝紫渐变做装饰，用中性/玻璃/语义色（≈ 迁移包 bme-color-discipline / bme-aurora-bg-standard）
- [Toast 偏极简](feedback-toast-minimal.md) — DewMessage 只要单图标色，别加彩色底/图标色块

## 迁移包·工作准则（2026-07-31 从 Windows 导入，立即生效）

- [最优先硬约束:严禁未授权 commit/push](bme-no-auto-commit.md) — 未经明确授权严禁 git commit，更严禁 push；全家族每轮改动严格执行（Mac 同样适用）
- [提方案别擅自执行](propose-not-execute.md) — 主动给方案作为 Plan，但别立即执行用户没提及的工作
- [复用优先于重写](bme-reuse-over-rewrite.md) — 给"看别的实体"扩功能时参数化复用现有页面/保留子组件，别新写
- [Python uv 工具链](python-uv-toolchain.md) — 用 uv 管包(非 pip)；requirements.txt 注释必须 ASCII

## 迁移包·BME 平台知识/进度（2026-07-31 导入，Windows 侧事实）

> ⚠️ 以下记忆描述 **Windows 开发机**（`D:\My Projects\Education_platform`、用户名 61494）的事实；带 `[进度]` 标记的是 Windows 侧开发进度，**采用前需与新代码核对**（对应代码在 git 分支待拉取，见 [[claude-memory-sync-plan]]）。含 Windows 命令的文件已单独标注适用环境。

- [BME 本地开发环境(Windows)](bme-local-dev-env.md) — 三仓库端口分工(后端5001/用户前端8081/admin前端5173)、MySQL 3300、Redis 无密码、Windows 兼容坑、启动方式（Mac 侧对应 [[dev-mac-env]]）
- [BME 营期考勤系统](bme-camp-system.md) — `[进度]` 大功能：RBAC 地基→数据模型→/camp 蓝图→看板算法→前端闭环全完成；规划文档入口、Phase 后续批量导入
- [BME RBAC 角色体系](bme-rbac-roles.md) — 四级角色(super_admin/teacher/mentor/student)、双写user_mode、check_permission/camp_role 装饰器、登录返回 role/permissions
- [BME 登录态真相源](bme-auth-token-source.md) — 判登录用 localStorage 'token' 别用 store.getters.isLogin；鉴权页靠路由 meta.authPage 隐藏
- [BME 文章系统](bme-article-system.md) — `[进度]` 存储约定(html=json.dumps)、评论/收藏复用 discussion、社区混合信息流 /community/feed、入口 URL、测试工具
- [BME 文章共享正文样式](bme-article-rich-text-styles.md) — `.rich-text` 单一真相源(article-content.css 三镜像+sync:richtext 脚本)、blockquote 克制灰、TinyMCE iframe 挂 class
- [BME 社区热度排序](bme-community-hot-ranking.md) — `[进度]` /community/feed 的 type×sort 正交、半衰期公式(I+1)*0.5^(age/14)、view_count 故意不入热度
- [BME 座位系统](bme-seat-system.md) — 固定座位制(看板=绑定用户打卡状态)、占用判定链路、CheckRecord 无 seat_id、生产初始化 init_seats.py 不跑 seed.py
- [BME 出勤日历缓存策略](bme-attendance-calendar-cache.md) — 个人 yearly 去缓存实时、全员接口 key 补时间维度+打卡主动失效、(user_id,date) 复合索引
- [BME 前端无打卡入口](bme-no-checkin-ui.md) — 前端点不到签到签退(岛栏只读)；孤儿组件已删(2026-07-28)、双月展示由 MiniCalendar.vue
- [BME DewUI 设计语言](bme-dewui-design-language.md) — 自研液态玻璃组件库(components/ui, 17个)、四层玻璃配方、--dew-bounce 弹性曲线、字体全局统一、禁外网字体 CDN、故意不用玻璃的取舍
- [DewUI flat 扁平变体](bme-dewui-flat-variant.md) — DewCard variant=flat(纯色无 glass/hover 静态)、--dew-card-flat-* token、阅读/文档场景用 flat
- [BME 极光背景规范](bme-aurora-bg-standard.md) — 内容页极光背景以 HomeView 为准、dark mode 克制(透明度0.12~0.18近黑)、组合选择器坑
- [BME 无emoji/Icon克制](bme-no-emoji-sparse-icons.md) — 硬约束：杜绝一切 emoji、Icon 只在确有必要处用、用 @element-plus/icons-vue
- [BME 配色纪律](bme-color-discipline.md) — 强调色必须用 token 禁硬编码 indigo 紫、hover 优先形态反馈(位移/缩放/底色)别变色

## 迁移包·3DFarm（2026-07-31 导入，Windows 侧事实）

- [BME_3DFarm 打印农场项目](bme-3dfarm-project.md) — `[进度]` 独立3D打印农场、BME同栈+Celery+Bambuddy底座、credit制、端口5002、Phase 0-1 状态
- [BME_3DFarm Bambuddy 测试工具链](bme-3dfarm-bambuddy-test-infra.md) — `[进度]` 录制/回放代理+生命周期驱动+prod 只读 canary；dev 直连生产 172.25.56.19:18000 采集完成；待办 canary 定时部署等
- [BME_3DFarm 本地全栈启动(Windows)](bme-3dfarm-local-stack.md) — Bambuddy/MinIO/orca 是 Docker 容器、Celery on Windows 必用 --pool=solo、本地无 API key、VP 停止 404 非 bug
- [BME_3DFarm 通知系统](bme-3dfarm-notifications.md) — 照搬 BME 通知蓝本(扇出+is_read)、订单事件触发(fail/complete/cancel/refund/delivery-note)、DB 坑
- [BME_3DFarm AMS 字段与关联](bme-3dfarm-ams-fields.md) — tray_color hex 无颜色名(14参考色最近邻)、订单→打印机经 BambuddyJob、progress 在订单本身
- [BME_3DFarm schema drift 坑](bme-3dfarm-schema-drift.md) — 模型加列后必手动 ALTER；create_all 不给已存在表补列；报错 1054 Unknown column
- [BME Flask 重启坑](bme-flask-restart-trap.md) — TaskStop 杀父不杀子，Flask 子进程残留占端口跑旧代码；清理命令 PowerShell（Mac 用 lsof/kill）

## 3D 打印系统（本地既有，Mac 侧）

- [开发机环境约束](dev-mac-env.md) — 这台 Mac 跑 3DFarm 的环境：TUN 代理、3306 被占走 3307、uv 3.12 venv（路径已更新到 BME_platform/BME_3DFarm）（Windows 侧对应 [[bme-local-dev-env]] / [[bme-3dfarm-local-stack]]）
- [真打印机信息](bambuddy-real-printer.md) — P1S 测试打印机，bambuddy id=1，有 AMS（生产真机另见迁移包 [[bme-3dfarm-bambuddy-test-infra]]：BME-112-B/C/D/E）
- [晨迭代 bug 记录](morning-iteration-bugs.md) — 2026-07-12 晨迭代 9 个 bug（已 commit 066bd23）
- [订单/下发流重构](order-dispatch-refactor-plan.md) — 已由另一台机器实现并 push（本机 11c5ebc）

## 局域网设备

- [局域网 Windows 主机 110](lan-windows-host-110.md) — 192.168.1.110 是 Win10 家庭中文版,SSH 须用 Administrator 免密;默认 shell 已改 PowerShell,中文输出 UTF-8 正常

## Claude Code 跨机记忆同步

- [记忆同步方案](claude-memory-sync-plan.md) — Mac↔Windows 开发机（非110，用户名 61494、路径 D:\My Projects\Education_platform）auto-memory 同步方案：手动导出/导入仪式，Windows 路径已确认；代码进度在 git 分支待拉取
